import type { FranchiseGroup, NormalisedEntry, SequelAlert } from "./types"

const ANILIST_API = "/api/anilist"

const BATCH_SEQUEL_QUERY = `
  query BatchSequelCheck($ids: [Int]) {
    Page(perPage: 50) {
      media(id_in: $ids, type: ANIME) {
        id
        idMal
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
              idMal
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

const BATCH_SEQUEL_MAL_QUERY = `
  query BatchSequelCheckMAL($ids: [Int]) {
    Page(perPage: 50) {
      media(idMal_in: $ids, type: ANIME) {
        id
        idMal
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
              idMal
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

async function batchFetchSequelInfo(ids: number[], useMalIds = false): Promise<Record<string, unknown>[]> {
  try {
    const response = await fetch(ANILIST_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: useMalIds ? BATCH_SEQUEL_MAL_QUERY : BATCH_SEQUEL_QUERY,
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
  sequel: Record<string, unknown>,
  allUserEntryIds: Set<number>,
  allUserEntries: Map<number, NormalisedEntry>,
  platform: "ANILIST" | "MAL"
): SequelAlert["alert_status"] | null {
  const sequelId = (platform === "MAL" ? (sequel.idMal ?? sequel.id) : sequel.id) as number
  const sequelTitle: string = (sequel.title as any)?.english ?? (sequel.title as any)?.romaji ?? ""

  // Check by exact platform ID
  if (allUserEntryIds.has(sequelId)) {
    const userEntry = allUserEntries.get(sequelId)
    if (!userEntry) return null
    if (userEntry.user_completed) return null
    if (userEntry.status === "PLANNING") return "planned"
    if (userEntry.status === "CURRENT") return null
    return "in_progress"
  }

  // Check by title (fallback for cross-platform differences)
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
): Map<number, Record<string, unknown>> {
  const mediaMap = new Map<number, Record<string, unknown>>()

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
      // Allow scanning completed, watching, and planned entries to find future sequels
      // Even if user hasn't watched Season 2 yet, if it's on their planned list, we should
      // scan it so we can discover Season 3 and adjust the total franchise scale.
      if (entry.user_completed || entry.status === "CURRENT" || entry.status === "PLANNING") {
        entriesToCheck.push({ entryId: entry.platform_id, franchise, entry })
      }
    })
  })

  console.log(`Sequel scanner: checking ${entriesToCheck.length} entries (platform: ${platform})`)
  onProgress?.(0, entriesToCheck.length)

  const alertedSequelIds = new Set<number>()

  const BATCH_SIZE = 50
  const DELAY_MS = 800

  let currentIdsToFetch = entriesToCheck.map((b) => b.entryId)
  let isFirstBatch = true

  const contextMap = new Map<number, any>()

  entriesToCheck.forEach((b) => {
    contextMap.set(b.entryId, {
      franchise: b.franchise,
      last_watched: { id: b.entry.platform_id, title: b.entry.title, type: b.entry.type },
    })
  })

  // Keep a map so we can look up context by either AniList ID or MAL ID
  const linkContextToIds = (aniId: number, malId?: number | null, context?: any) => {
    if (!context) return
    contextMap.set(aniId, context)
    if (malId) contextMap.set(malId, context)
  }

  const processedIds = new Set<number>()
  let totalProcessed = 0

  while (currentIdsToFetch.length > 0) {
    const uniqueIds = Array.from(new Set(currentIdsToFetch)).filter((id) => !processedIds.has(id))
    if (uniqueIds.length === 0) break

    const nextBatchToFetch: number[] = []

    for (let i = 0; i < uniqueIds.length; i += BATCH_SIZE) {
      if (totalProcessed > 0) await new Promise((r) => setTimeout(r, DELAY_MS))

      const batchIds = uniqueIds.slice(i, i + BATCH_SIZE)
      batchIds.forEach((id) => processedIds.add(id))

      // Only use idMal_in for the very first batch if the platform is MAL.
      // Subsequently, we discover AniList nodes and track them by AniList IDs.
      const useMalIds = platform === "MAL" && isFirstBatch
      const mediaResults = await batchFetchSequelInfo(batchIds, useMalIds)

      mediaResults.forEach((media: any) => {
        // Find the context from either MAL ID or AniList ID
        const context = contextMap.get(media.idMal) || contextMap.get(media.id)
        if (!context) return

        // Forward the context link so subsequent iterations by AniList ID will find it
        linkContextToIds(media.id, media.idMal, context)

        const sequelEdges = media.relations?.edges?.filter(
          (edge: any) => edge.relationType === "SEQUEL"
        ) || []

        sequelEdges.forEach((edge: any) => {
          const sequel = edge.node
          const format = sequel.format ?? "UNKNOWN"

          if (
            !["TV", "TV_SHORT", "MOVIE", "OVA", "ONA", "SPECIAL", "UNKNOWN"].includes(
              format
            )
          ) {
            return
          }

          // Use the correct ID domain for blacklisting checks.
          // Fallback to sequel.id (AniList ID) if MAL ID isn't returned by Graphql.
          const targetId = platform === "MAL" ? (sequel.idMal ?? sequel.id) : sequel.id

          if (alertedSequelIds.has(targetId) || blacklistedEntryIds.has(targetId)) return

          const status = getAlertStatus(sequel, allUserEntryIds, allUserEntries, platform)
          if (!status) return

          alertedSequelIds.add(targetId)

          const newContext = {
            franchise: context.franchise,
            last_watched: {
              id: targetId,
              title: sequel.title?.english ?? sequel.title?.romaji,
              type: sequel.format,
            },
          }


          linkContextToIds(sequel.id, sequel.idMal, newContext)

          // Fetch the next sequel in chain if the current one isn't unreleased
          if (sequel.status !== "NOT_YET_RELEASED") {
            nextBatchToFetch.push(sequel.id) // Always use AniList ID for recursive queries
          }

          const seasonLabel =
            sequel.season && sequel.seasonYear
              ? `${sequel.season} ${sequel.seasonYear}`
              : sequel.startDate?.year
                ? `${sequel.startDate.year}`
                : undefined

          alerts.push({
            franchise_title: context.franchise.canonical_title,
            franchise_cover: context.franchise.cover_image,
            franchise_id: context.franchise.franchise_id,
            last_watched: context.last_watched,
            next_entry: {
              id: targetId,
              title: sequel.title?.english ?? sequel.title?.romaji,
              type: sequel.format,
              status: sequel.status,
              season: seasonLabel,
              year: sequel.startDate?.year,
              cover_image: sequel.coverImage?.large,
            },
            alert_status: status,
            platform,
          })
        })
      })

      totalProcessed += batchIds.length
      onProgress?.(Math.min(totalProcessed, entriesToCheck.length - 1), entriesToCheck.length)
      console.log(`Sequel scanner chunk: fetched ${batchIds.length} relations`)
    }

    currentIdsToFetch = nextBatchToFetch
    isFirstBatch = false
  }

  // Complete the progress at the end
  onProgress?.(entriesToCheck.length, entriesToCheck.length)

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