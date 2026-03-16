import type { FranchiseGroup, NormalisedEntry } from "./types"

// ── Constants ─────────────────────────────────────────

// Relation types that define main timeline membership
const MAIN_RELATION_TYPES = new Set([
  "SEQUEL",
  "PREQUEL",
  "ALTERNATIVE_VERSION",
  "ALTERNATIVE_SETTING",
])

// Relation types used for grouping entries into franchises
// CHARACTER and OTHER intentionally excluded — too loose, cause
// unrelated franchises to merge (e.g. AoT + Fire Force + Slime)
const GROUPING_RELATION_TYPES = new Set([
  "SEQUEL",
  "PREQUEL",
  "ALTERNATIVE_VERSION",
  "ALTERNATIVE_SETTING",
  "SIDE_STORY",
  "PARENT",
  "SPIN_OFF",
  "SUMMARY",
])

// Keywords too generic to use for title-similarity merging
const BLOCKED_KEYWORDS = new Set([
  "dragon", "one", "my", "is", "in", "no", "to",
  "new", "big", "monsters", "re", "x", "k", "a",
  "an", "the", "of", "de", "la", "el", "war", "log",
  "mix", "dx", "ex", "gt", "z", "r", "ii", "iii",
  "carnival", "special", "extra", "movie", "film",
])

// ── Entry Classification ──────────────────────────────

function classifyEntry(
  entry: NormalisedEntry,
  groupEntries: NormalisedEntry[],
): "main" | "supplementary" {
  // TV and TV_SHORT → always main
  if (entry.type === "TV" || entry.type === "TV_SHORT") return "main"

  // MOVIE → always main
  if (entry.type === "MOVIE") return "main"

  const relationToGroup = entry.relations.find((r) =>
    groupEntries.some((ge) => ge.platform_id === r.id),
  )

  // Root entry with no relations → main
  if (!relationToGroup) return "main"

  // ALTERNATIVE_VERSION / SETTING → main
  if (
    relationToGroup.relationType === "ALTERNATIVE_VERSION" ||
    relationToGroup.relationType === "ALTERNATIVE_SETTING"
  )
    return "main"

  // OVA / ONA / SPECIAL / MUSIC:
  if (["OVA", "ONA", "SPECIAL", "MUSIC"].includes(entry.type)) {
    if (relationToGroup.relationType === "PREQUEL") return "main"

    if (relationToGroup.relationType === "SEQUEL") {
      const somethingPrecedesThis = groupEntries.some(
        (ge) =>
          ge.platform_id !== entry.platform_id &&
          ge.relations.some(
            (r) => r.id === entry.platform_id && r.relationType === "SEQUEL",
          ),
      )

      // Root ONA in a donghua-style chain (all ONAs, no TV) → main
      // Root OVA in a TV franchise → side story (it's supplementary backstory)
      const groupHasTV = groupEntries.some(
        (ge) => ge.type === "TV" || ge.type === "TV_SHORT",
      )

      if (!somethingPrecedesThis && !groupHasTV) return "main"
      if (!somethingPrecedesThis && groupHasTV) return "supplementary"
    }

    return "supplementary"
  }

  return "supplementary"
}

// ── Franchise Root Detection ──────────────────────────

function findFranchiseRoot(groupEntries: NormalisedEntry[]): NormalisedEntry {
  const tvEntries = groupEntries.filter(
    (e) => e.type === "TV" || e.type === "TV_SHORT",
  )

  if (tvEntries.length > 0) {
    // Find TV entries with no prequel pointing to another group member
    const rootCandidates = tvEntries.filter(
      (entry) =>
        !entry.relations.some(
          (r) =>
            r.relationType === "PREQUEL" &&
            groupEntries.some((ge) => ge.platform_id === r.id),
        ),
    )

    if (rootCandidates.length === 1) return rootCandidates[0]

    if (rootCandidates.length > 1) {
      // Prefer shortest title among candidates (most likely the true root)
      const byYear = [...rootCandidates].sort(
        (a, b) => (a.start_year ?? 9999) - (b.start_year ?? 9999),
      )
      const earliestYear = byYear[0].start_year ?? 9999
      const sameYear = byYear.filter(
        (e) => (e.start_year ?? 9999) === earliestYear,
      )
      return sameYear.sort((a, b) => a.title.length - b.title.length)[0]
    }

    // All TV entries have prequels → return earliest TV
    return tvEntries.sort(
      (a, b) => (a.start_year ?? 9999) - (b.start_year ?? 9999),
    )[0]
  }

  // No TV entries → try Movie
  const movieEntries = groupEntries.filter((e) => e.type === "MOVIE")
  if (movieEntries.length > 0) {
    return movieEntries.sort(
      (a, b) => (a.start_year ?? 9999) - (b.start_year ?? 9999),
    )[0]
  }

  // Absolute fallback → shortest non-all-caps title
  const nonCapsEntries = groupEntries.filter(
    (e) => e.title !== e.title.toUpperCase(),
  )
  const pool = nonCapsEntries.length > 0 ? nonCapsEntries : groupEntries
  return [...pool].sort((a, b) => a.title.length - b.title.length)[0]
}

// ── Title Similarity Merge ────────────────────────────

function mergeByTitleSimilarity(
  groups: Map<number, NormalisedEntry[]>,
  parent: Map<number, number>,
  find: (id: number) => number,
): Map<number, NormalisedEntry[]> {
  function extractKeyword(title: string): string {
    return title
      .toLowerCase()
      .split(/[:\-\(\/]/)[0]
      .trim()
      .replace(/\b(season|part|the|a|an|movie|film|ova|ona|special)\b/g, "")
      .trim()
  }

  const keywordToRoot = new Map<string, number>()

  groups.forEach((entries, rootId) => {
    // Use shortest title as representative — most likely the root
    const representativeTitle = [...entries].sort(
      (a, b) => a.title.length - b.title.length,
    )[0].title

    const keyword = extractKeyword(representativeTitle)

    if (keyword.length < 4) return
    if (BLOCKED_KEYWORDS.has(keyword)) return

    if (!keywordToRoot.has(keyword)) {
      keywordToRoot.set(keyword, rootId)
    } else {
      const existingRoot = find(keywordToRoot.get(keyword)!)
      const thisRoot = find(rootId)
      if (existingRoot !== thisRoot) {
        parent.set(thisRoot, existingRoot)
      }
    }
  })

  // Rebuild groups after merging
  const newGroups = new Map<number, NormalisedEntry[]>()
  const allEntries: NormalisedEntry[] = []
  groups.forEach((entries) => allEntries.push(...entries))

  allEntries.forEach((entry) => {
    const root = find(entry.platform_id)
    if (!newGroups.has(root)) newGroups.set(root, [])
    newGroups.get(root)!.push(entry)
  })

  return newGroups
}

// ── Helpers ───────────────────────────────────────────

function toTitleCase(str: string): string {
  // If string is all caps (like "ONE PIECE"), convert to title case
  if (str === str.toUpperCase() && str.length > 1) {
    return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
  }
  // If first char is lowercase, capitalise it
  if (str.charAt(0) === str.charAt(0).toLowerCase()) {
    return str.charAt(0).toUpperCase() + str.slice(1)
  }
  return str
}

// ── Main Export ───────────────────────────────────────

export function buildFranchiseGroups(
  entries: NormalisedEntry[],
): FranchiseGroup[] {
  console.log("Total entries received:", entries.length)

  // Build lookup map
  const entryMap = new Map<number, NormalisedEntry>()
  entries.forEach((e) => entryMap.set(e.platform_id, e))

  // Union-Find with bridge nodes
  const parent = new Map<number, number>()
  entries.forEach((e) => parent.set(e.platform_id, e.platform_id))

  function find(id: number): number {
    if (!parent.has(id)) parent.set(id, id)
    if (parent.get(id) !== id) {
      parent.set(id, find(parent.get(id)!))
    }
    return parent.get(id)!
  }

  function union(a: number, b: number) {
    const rootA = find(a)
    const rootB = find(b)
    if (rootA !== rootB) {
      parent.set(rootA, rootB)
    }
  }

  // Union entries via relations — including bridge nodes
  entries.forEach((entry) => {
    entry.relations.forEach((relation) => {
      if (!GROUPING_RELATION_TYPES.has(relation.relationType)) return
      if (!parent.has(relation.id)) {
        parent.set(relation.id, relation.id)
      }
      union(entry.platform_id, relation.id)
    })
  })

  // Build initial clusters
  let clusters = new Map<number, NormalisedEntry[]>()
  entries.forEach((entry) => {
    const root = find(entry.platform_id)
    if (!clusters.has(root)) clusters.set(root, [])
    clusters.get(root)!.push(entry)
  })

  // Merge by title similarity as fallback
  clusters = mergeByTitleSimilarity(clusters, parent, find)

  console.log("Clusters formed:", clusters.size)

  // Build FranchiseGroup for each cluster
  const groups: FranchiseGroup[] = []

  clusters.forEach((cluster) => {
    const mainTimeline = cluster.filter(
      (e) => classifyEntry(e, cluster) === "main",
    )
    const side_stories = cluster.filter(
      (e) => classifyEntry(e, cluster) === "supplementary",
    )

    // If nothing qualified as main, promote everything
    if (mainTimeline.length === 0) {
      mainTimeline.push(...side_stories.splice(0))
    }

    // Sort by year then id
    const sortFn = (a: NormalisedEntry, b: NormalisedEntry) =>
      (a.start_year ?? 9999) - (b.start_year ?? 9999) || a.id - b.id
    mainTimeline.sort(sortFn)
    side_stories.sort(sortFn)

    const rootEntry = findFranchiseRoot(cluster)

    // Cover priority:
    // 1. First entry of main timeline that is TV (sorted by year)
    // 2. First entry of main timeline that is MOVIE
    // 3. Root entry fallback
    const mainTimelineSorted = [...mainTimeline].sort(
      (a, b) => (a.start_year ?? 9999) - (b.start_year ?? 9999),
    )

    const coverEntry =
      mainTimelineSorted.find(
        (e) => (e.type === "TV" || e.type === "TV_SHORT") && e.cover_image,
      ) ??
      mainTimelineSorted.find((e) => e.type === "MOVIE" && e.cover_image) ??
      mainTimelineSorted.find((e) => e.cover_image) ??
      rootEntry
    const isDonghua = cluster.some((e) => e.country_of_origin === "CN")

    // Progress calculation
    let completedCount: number
    let totalCount: number
    let percentage: number

    if (isDonghua) {
      const validEntries = mainTimeline.filter((e) => e.episodes_total > 0)

      if (validEntries.length === 0) {
        completedCount = mainTimeline.filter((e) => e.user_completed).length
        totalCount = mainTimeline.length
        percentage =
          totalCount > 0
            ? Math.floor((completedCount / totalCount) * 100)
            : 0
      } else {
        totalCount = validEntries.reduce((s, e) => s + e.episodes_total, 0)
        completedCount = validEntries.reduce((s, e) => {
          const watched = Math.min(
            e.episodes_watched ?? 0,
            e.episodes_total,
          )
          return s + watched
        }, 0)
        percentage = Math.min(
          Math.floor((completedCount / totalCount) * 100),
          100,
        )
      }
    } else {
      totalCount = mainTimeline.length
      completedCount = mainTimeline.filter((e) => e.user_completed).length
      percentage =
        totalCount > 0
          ? Math.floor((completedCount / totalCount) * 100)
          : 0
    }

    const fullyCompleted =
      percentage === 100 && side_stories.every((e) => e.user_completed)

    const canonical_title = toTitleCase(rootEntry.title)

    groups.push({
      franchise_id: rootEntry.platform_id.toString(),
      canonical_title,
      cover_image: coverEntry.cover_image,
      is_donghua: isDonghua,
      main_timeline: mainTimeline,
      side_stories,
      progress: {
        main_timeline_total: totalCount,
        main_timeline_completed: completedCount,
        percentage,
        fully_completed: fullyCompleted,
      },
    })
  })

  // Sort alphabetically
  groups.sort((a, b) => a.canonical_title.localeCompare(b.canonical_title))

  console.log("Total franchise groups formed:", groups.length)

  return groups
}