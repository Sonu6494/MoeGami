import type { FranchiseGroup, NormalisedEntry, SequelAlert } from "./types"

const ANILIST_API = "/api/anilist"

const BATCH_SEQUEL_QUERY = `
  query BatchSequelCheck($ids: [Int]) {
    Page(perPage: 50) {
      media(id_in: $ids, type: ANIME) {
        id
        title { romaji english }
        format
        status
        startDate { year month }
        season
        seasonYear
        coverImage { large }
        relations {
          edges {
            relationType
            node {
              id
              title { romaji english }
              format
              type
              status
              startDate { year month }
              season
              seasonYear
              coverImage { large }
            }
          }
        }
      }
    }
  }
`

async function batchFetchSequelInfo(ids: number[]): Promise<any[]> {
  try {
    const response = await fetch(ANILIST_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: BATCH_SEQUEL_QUERY,
        variables: { ids },
      }),
    })
    const json = await response.json()
    return json.data?.Page?.media ?? []
  } catch {
    return []
  }
}

function isAlreadyWatched(
  sequelTitle: string,
  allUserEntries: Map<number, NormalisedEntry>
): NormalisedEntry | null {
  const normalise = (t: string) =>
    t
      .toLowerCase()
      .replace(/[:\-\(\)!?\.]/g, " ")
      .replace(/\s+/g, " ")
      .trim()

  const needle = normalise(sequelTitle)

  for (const entry of allUserEntries.values()) {
    const haystack1 = normalise(entry.title)
    const haystack2 = normalise(entry.title_romaji ?? "")
    const haystack3 = normalise(entry.title_english ?? "")

    if (
      haystack1 === needle ||
      haystack2 === needle ||
      haystack3 === needle
    ) {
      return entry
    }
  }
  return null
}

// FIX: typed sequel as `any` — was `Record<string, unknown>` which blocked
// property access on sequel.id, sequel.title.english, sequel.status etc.
function getAlertStatus(
  sequel: any,
  allUserEntryIds: Set<number>,
  allUserEntries: Map<number, NormalisedEntry>
): SequelAlert["alert_status"] | null {
  const sequelId = sequel.id as number
  const sequelTitle: string = sequel.title?.english ?? sequel.title?.romaji ?? ""

  // Check by ID (AniList users)
  if (allUserEntryIds.has(sequelId)) {
    const userEntry = allUserEntries.get(sequelId)
    if (!userEntry) return null
    if (userEntry.user_completed) return null
    if (userEntry.status === "PLANNING") return "planned"
    if (userEntry.status === "CURRENT") return null
    return "in_progress"
  }

  // Check by title (MAL users — IDs won't match AniList IDs)
  const titleMatch = isAlreadyWatched(sequelTitle, allUserEntries)
  if (titleMatch) {
    if (titleMatch.user_completed) return null
    if (titleMatch.status === "PLANNING") return "planned"
    if (titleMatch.status === "CURRENT") return null
    return "in_progress"
  }

  // Not in user list — determine availability from airing status
  if (sequel.status === "NOT_YET_RELEASED") return "upcoming"
  if (sequel.status === "RELEASING") return "available"
  if (sequel.status === "FINISHED") return "available"

  // MAL relations don't include airing status — default to available
  return "available"
}

// FIX: removed `r.status` — EntryRelation has no status field, default to "FINISHED"
function buildMALMediaMap(
  entriesToCheck: Array<{ entryId: number; franchise: FranchiseGroup; entry: NormalisedEntry }>
): Map<number, any> {
  const mediaMap = new Map<number, any>()

  entriesToCheck.forEach(({ entry }) => {
    mediaMap.set(entry.platform_id, {
      id: entry.platform_id,
      title: {
        romaji: entry.title_romaji,
        english: entry.title_english,
      },
      relations: {
        edges: entry.relations.map((r) => ({
          relationType: r.relationType.toUpperCase(),
          node: {
            id: r.id,
            title: { romaji: r.title, english: r.title },
            format: r.type,
            type: r.type,
            status: "FINISHED", // FIX: EntryRelation has no status field
            startDate: { year: null, month: null },
            season: null,
            seasonYear: null,
            coverImage: { large: "" },
          },
        })),
      },
    })
  })

  return mediaMap
}

export async function scanForSequels(
  franchiseGroups: FranchiseGroup[],
  allUserEntryIds: Set<number>,
  allUserEntries: Map<number, NormalisedEntry>,
  onProgress?: (current: number, total: number) => void,
  platform: "ANILIST" | "MAL" = "ANILIST",
  blacklistedFranchiseIds: Set<string> = new Set(),
  blacklistedEntryIds: Set<number> = new Set()
): Promise<SequelAlert[]> {
  const alerts: SequelAlert[] = []

  const entriesToCheck: Array<{
    entryId: number
    franchise: FranchiseGroup
    entry: NormalisedEntry
  }> = []

  franchiseGroups.forEach((franchise) => {
    // Skip entirely if franchise is blacklisted
    if (blacklistedFranchiseIds.has(franchise.franchise_id)) return

    franchise.main_timeline.forEach((entry) => {
      if (entry.user_completed) {
        entriesToCheck.push({ entryId: entry.platform_id, franchise, entry })
      }
    })
  })

  console.log(`Sequel scanner: checking ${entriesToCheck.length} entries (platform: ${platform})`)
  onProgress?.(0, entriesToCheck.length)

  const alertedSequelIds = new Set<number>()

  if (platform === "MAL") {
    // ── MAL path ─────────────────────────────────────────────────────────────
    // Relations are already embedded in NormalisedEntry — no API calls needed.
    const mediaMap = buildMALMediaMap(entriesToCheck)

    const entriesWithRelations = [...mediaMap.values()].filter(
      (m) => m.relations.edges.length > 0
    ).length
    const totalEdges = [...mediaMap.values()].reduce(
      (sum, m) => sum + m.relations.edges.length,
      0
    )
    console.log(
      `MAL sequel scanner: ${mediaMap.size} entries checked, ${entriesWithRelations} have relations, ${totalEdges} total edges`
    )

    // FIX: was two nested sequelEdges.forEach loops — collapsed to one
    entriesToCheck.forEach(({ entryId, franchise, entry }, i) => {
      const media = mediaMap.get(entryId)
      if (!media) return

      const sequelEdges = media.relations.edges.filter(
        (edge: any) => edge.relationType === "SEQUEL"
      )

      sequelEdges.forEach((edge: any) => {
        const sequel = edge.node

        if (
          !["TV", "TV_SHORT", "MOVIE", "OVA", "ONA", "SPECIAL", "UNKNOWN"].includes(
            sequel.format
          )
        ) {
          return
        }

        if (alertedSequelIds.has(sequel.id) || blacklistedEntryIds.has(sequel.id)) return

        const status = getAlertStatus(sequel, allUserEntryIds, allUserEntries)
        if (!status) return

        alertedSequelIds.add(sequel.id)

        alerts.push({
          franchise_title: franchise.canonical_title,
          franchise_cover: franchise.cover_image,
          franchise_id: franchise.franchise_id,
          last_watched: {
            id: entry.platform_id,
            title: entry.title,
            type: entry.type,
          },
          next_entry: {
            id: sequel.id,
            title: sequel.title?.english ?? sequel.title?.romaji,
            type: sequel.format,
            status: sequel.status,
            season: undefined,
            year: undefined,
            cover_image: sequel.coverImage?.large || undefined,
          },
          alert_status: status,
          platform: "MAL" as const,
        })
      })

      onProgress?.(i + 1, entriesToCheck.length)
    })
  } else {
    // ── AniList path ──────────────────────────────────────────────────────────
    const BATCH_SIZE = 50
    const DELAY_MS = 800

    for (let i = 0; i < entriesToCheck.length; i += BATCH_SIZE) {
      const batch = entriesToCheck.slice(i, i + BATCH_SIZE)
      const batchIds = batch.map((b) => b.entryId)

      // FIX: was declared twice on consecutive lines
      const mediaResults = await batchFetchSequelInfo(batchIds)

      const mediaMap = new Map<number, any>()
      mediaResults.forEach((m: any) => mediaMap.set(m.id, m))

      batch.forEach(({ entryId, franchise, entry }) => {
        const media = mediaMap.get(entryId)
        if (!media) return

        const sequelEdges = media.relations.edges.filter(
          (edge: any) => edge.relationType === "SEQUEL"
        )

        sequelEdges.forEach((edge: any) => {
          const sequel = edge.node

          if (
            !["TV", "TV_SHORT", "MOVIE", "OVA", "ONA", "SPECIAL"].includes(
              sequel.format
            )
          ) {
            return
          }

          if (alertedSequelIds.has(sequel.id) || blacklistedEntryIds.has(sequel.id)) return

          const status = getAlertStatus(sequel, allUserEntryIds, allUserEntries)
          if (!status) return

          alertedSequelIds.add(sequel.id)

          const seasonLabel =
            sequel.season && sequel.seasonYear
              ? `${sequel.season} ${sequel.seasonYear}`
              : sequel.startDate?.year
                ? `${sequel.startDate.year}`
                : undefined

          alerts.push({
            franchise_title: franchise.canonical_title,
            franchise_cover: franchise.cover_image,
            franchise_id: franchise.franchise_id,
            last_watched: {
              id: entry.platform_id,
              title: entry.title,
              type: entry.type,
            },
            next_entry: {
              id: sequel.id,
              title: sequel.title?.english ?? sequel.title?.romaji,
              type: sequel.format,
              status: sequel.status,
              season: seasonLabel,
              year: sequel.startDate?.year,
              cover_image: sequel.coverImage?.large,
            },
            alert_status: status,
            platform: "ANILIST" as const,
          })
        })
      })

      const processed = Math.min(i + BATCH_SIZE, entriesToCheck.length)
      onProgress?.(processed, entriesToCheck.length)
      console.log(`Sequel scanner: ${processed}/${entriesToCheck.length}`)

      if (i + BATCH_SIZE < entriesToCheck.length) {
        await new Promise((resolve) => setTimeout(resolve, DELAY_MS))
      }
    }
  }

  const ORDER: Record<string, number> = {
    watching: 0,
    available: 1,
    upcoming: 2,
    planned: 3,
    in_progress: 4,
  }

  return alerts.sort(
    (a, b) => (ORDER[a.alert_status] ?? 99) - (ORDER[b.alert_status] ?? 99)
  )
}