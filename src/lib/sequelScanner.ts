import type { FranchiseGroup, NormalisedEntry, SequelAlert } from "./types"

const ANILIST_API = "/api/anilist"

// Batch query — check multiple anime at once to avoid rate limits
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

async function batchFetchSequelInfo(ids: number[]) {
  try {
    const response = await fetch(ANILIST_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: BATCH_SEQUEL_QUERY,
        variables: { ids },
      }),
    });
    const json = await response.json();
    return json.data?.Page?.media ?? [];
  } catch {
    return [];
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
      .trim();

  const needle = normalise(sequelTitle);

  for (const entry of allUserEntries.values()) {
    const haystack1 = normalise(entry.title);
    const haystack2 = normalise(entry.title_romaji ?? "");
    const haystack3 = normalise(entry.title_english ?? "");

    if (
      haystack1 === needle ||
      haystack2 === needle ||
      haystack3 === needle ||
      haystack1.includes(needle) ||
      needle.includes(haystack1)
    ) {
      return entry;
    }
  }
  return null;
}

function getAlertStatus(
  sequel: any,
  allUserEntryIds: Set<number>,
  allUserEntries: Map<number, NormalisedEntry>
): SequelAlert["alert_status"] | null {
  const sequelId = sequel.id;
  const sequelTitle = sequel.title.english ?? sequel.title.romaji ?? "";

  // First check by ID (works for AniList users)
  if (allUserEntryIds.has(sequelId)) {
    const userEntry = allUserEntries.get(sequelId);
    if (!userEntry) return null;
    if (userEntry.user_completed) return null;
    if (userEntry.status === "CURRENT") return "watching";
    return "in_progress";
  }

  // For MAL users: check by title (IDs won't match AniList IDs)
  const titleMatch = isAlreadyWatched(sequelTitle, allUserEntries);
  if (titleMatch) {
    if (titleMatch.user_completed) return null; // already done ✅
    if (titleMatch.status === "CURRENT") return "watching";
    return "in_progress";
  }

  // Not in user list at all
  if (sequel.status === "NOT_YET_RELEASED") return "upcoming";
  if (sequel.status === "RELEASING") return "available";
  if (sequel.status === "FINISHED") return "available";

  return null;
}

export async function scanForSequels(
  franchiseGroups: FranchiseGroup[],
  allUserEntryIds: Set<number>,
  allUserEntries: Map<number, NormalisedEntry>,
  onProgress?: (current: number, total: number) => void // ← add this
): Promise<SequelAlert[]> {
  const alerts: SequelAlert[] = []

  // Collect ALL completed entries across ALL franchises to check
  // Not just the last one — check every completed entry for sequels
  const entriesToCheck: Array<{
    entryId: number
    franchise: FranchiseGroup
    entry: NormalisedEntry
  }> = []

  franchiseGroups.forEach((franchise) => {
    // Check all main timeline entries that are completed
    franchise.main_timeline.forEach((entry) => {
      if (entry.user_completed || entry.status === "CURRENT") {
        entriesToCheck.push({
          entryId: entry.platform_id,
          franchise,
          entry,
        })
      }
    })
  })

  console.log(`Sequel scanner: checking ${entriesToCheck.length} entries`)
  onProgress?.(0, entriesToCheck.length)

  // Track which sequel IDs we've already alerted about (avoid duplicates)
  const alertedSequelIds = new Set<number>()

  // Batch in groups of 50 (AniList page limit)
  const BATCH_SIZE = 50
  const DELAY_MS = 800

  for (let i = 0; i < entriesToCheck.length; i += BATCH_SIZE) {
    const batch = entriesToCheck.slice(i, i + BATCH_SIZE)
    const batchIds = batch.map((b) => b.entryId)

    const mediaResults = await batchFetchSequelInfo(batchIds)

    // Build a map of id → media result for quick lookup
    const mediaMap = new Map<number, any>()
    mediaResults.forEach((m: any) => mediaMap.set(m.id, m))

    batch.forEach(({ entryId, franchise, entry }) => {
      const media = mediaMap.get(entryId)
      if (!media) return

      // Find all SEQUEL relations
      const sequelEdges = media.relations.edges.filter(
        (edge: any) => edge.relationType === "SEQUEL"
      )

      sequelEdges.forEach((edge: any) => {
        const sequel = edge.node

        // Only anime types
        if (
          !["TV", "TV_SHORT", "MOVIE", "OVA", "ONA", "SPECIAL"].includes(
            sequel.format
          )
        ) {
          return
        }

        // Skip if already alerted for this sequel
        if (alertedSequelIds.has(sequel.id)) return;

        const status = getAlertStatus(sequel, allUserEntryIds, allUserEntries);
        if (!status) return;

        alertedSequelIds.add(sequel.id);

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
            title: sequel.title.english ?? sequel.title.romaji,
            type: sequel.format,
            status: sequel.status,
            season: seasonLabel,
            year: sequel.startDate?.year,
            cover_image: sequel.coverImage?.large,
          },
          alert_status: status,
        })
      })
    })

    const processed = Math.min(i + BATCH_SIZE, entriesToCheck.length)
    onProgress?.(processed, entriesToCheck.length)
    console.log(`Sequel scanner: ${processed}/${entriesToCheck.length}`)

    // Rate limit delay between batches
    if (i + BATCH_SIZE < entriesToCheck.length) {
      await new Promise((resolve) => setTimeout(resolve, DELAY_MS))
    }
  }

  // Sort: watching > available > upcoming > in_progress
  const ORDER: Record<string, number> = {
    watching: 0,
    available: 1,
    upcoming: 2,
    in_progress: 3,
  }
  return alerts.sort(
    (a, b) => (ORDER[a.alert_status] ?? 99) - (ORDER[b.alert_status] ?? 99)
  )
}
