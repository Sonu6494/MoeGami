import type { FranchiseGroup, FranchiseOverride, NormalisedEntry } from "./types"

// ── Constants ─────────────────────────────────────────

const GROUPING_RELATION_TYPES = new Set([
  "sequel",
  "prequel",
  "alternative_version",
  "alternative_setting",
  "side_story",
  "parent_story",
  "spin_off",
  "summary",
  "full_story",
])

const BLOCKED_KEYWORDS = new Set([
  "dragon", "one", "my", "is", "in", "no", "to",
  "new", "big", "monsters", "x", "k", "a",
  "an", "the", "of", "de", "la", "el", "war", "log",
  "mix", "dx", "ex", "gt", "z", "r", "ii", "iii",
  "carnival", "special", "extra", "movie", "film",
])

// ── Entry Classification ──────────────────────────────

function classifyEntry(
  entry: NormalisedEntry,
  groupEntries: NormalisedEntry[],
): "main" | "supplementary" {

  if (entry.type === "TV" || entry.type === "TV_SHORT") return "main"

  const hasParentRelation = entry.relations.some(r =>
    r.relationType === "parent_story" &&
    groupEntries.some(ge => ge.platform_id === r.id)
  )
  if (hasParentRelation) return "supplementary"

  const relationToGroup = entry.relations.find((r) =>
    groupEntries.some((ge) => ge.platform_id === r.id),
  )

  if (!relationToGroup) {
    const groupHasTV = groupEntries.some(
      e => e.type === "TV" || e.type === "TV_SHORT"
    )
    return groupHasTV ? "supplementary" : "main"
  }

  if (
    relationToGroup.relationType === "alternative_version" ||
    relationToGroup.relationType === "alternative_setting"
  ) return "main"

  if (["MOVIE", "OVA", "ONA", "SPECIAL", "MUSIC"].includes(entry.type)) {
    if (
      relationToGroup.relationType === "sequel" ||
      relationToGroup.relationType === "prequel"
    ) return "main"

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
    const rootCandidates = tvEntries.filter(
      (entry) =>
        !entry.relations.some(
          (r) =>
            r.relationType === "prequel" &&
            groupEntries.some((ge) => ge.platform_id === r.id),
        ),
    )

    if (rootCandidates.length === 1) return rootCandidates[0]

    if (rootCandidates.length > 1) {
      const byYear = [...rootCandidates].sort(
        (a, b) => (a.start_year ?? 9999) - (b.start_year ?? 9999),
      )
      const earliestYear = byYear[0].start_year ?? 9999
      const sameYear = byYear.filter(
        (e) => (e.start_year ?? 9999) === earliestYear,
      )
      return sameYear.sort((a, b) => a.title.length - b.title.length)[0]
    }

    return tvEntries.sort(
      (a, b) => (a.start_year ?? 9999) - (b.start_year ?? 9999),
    )[0]
  }

  const movieEntries = groupEntries.filter((e) => e.type === "MOVIE")
  if (movieEntries.length > 0) {
    return movieEntries.sort(
      (a, b) => (a.start_year ?? 9999) - (b.start_year ?? 9999),
    )[0]
  }

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
  function extractBaseTitle(title: string): string {
    return title
      .toLowerCase()
      .replace(/[:\-–—]/g, " ")
      .replace(/\([^)]*\)/g, "")
      .replace(/\b(season|part|cour|the|a|an|movie|film|ova|ona|special|recap|\d+(st|nd|rd|th))\b/gi, "")
      .replace(/\b\d+\b/g, "")
      .replace(/\s+/g, " ")
      .trim()
  }

  function extractKeyword(title: string): string {
    return title
      .toLowerCase()
      .split(/[:\-\(\/]/)[0]
      .trim()
      .replace(/\b(season|part|the|a|an|movie|film|ova|ona|special)\b/g, "")
      .trim()
  }

  // Pass 1: Exact keyword match
  const keywordToRoot = new Map<string, number>()

  groups.forEach((entries, rootId) => {
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

  // Pass 2: Base title containment
  const baseTitleToRoot = new Map<string, number>()
  const baseTitles: Array<{ base: string; rootId: number }> = []

  groups.forEach((entries, rootId) => {
    const representativeTitle = [...entries].sort(
      (a, b) => a.title.length - b.title.length,
    )[0].title

    const base = extractBaseTitle(representativeTitle)
    if (base.length < 6) return
    if (BLOCKED_KEYWORDS.has(base)) return

    baseTitles.push({ base, rootId })

    if (!baseTitleToRoot.has(base)) {
      baseTitleToRoot.set(base, rootId)
    } else {
      const existingRoot = find(baseTitleToRoot.get(base)!)
      const thisRoot = find(rootId)
      if (existingRoot !== thisRoot) {
        parent.set(thisRoot, existingRoot)
      }
    }
  })

  baseTitles.sort((a, b) => a.base.length - b.base.length)
  for (let i = 0; i < baseTitles.length; i++) {
    for (let j = i + 1; j < baseTitles.length; j++) {
      const shorter = baseTitles[i].base
      const longer = baseTitles[j].base
      if (shorter.length < 6) continue
      if (BLOCKED_KEYWORDS.has(shorter)) continue

      if (longer.startsWith(shorter + " ") || longer === shorter) {
        const existingRoot = find(baseTitles[i].rootId)
        const thisRoot = find(baseTitles[j].rootId)
        if (existingRoot !== thisRoot) {
          parent.set(thisRoot, existingRoot)
        }
      }
    }
  }

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
  if (str === str.toUpperCase() && str.length > 1) {
    return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
  }
  if (str.charAt(0) === str.charAt(0).toLowerCase()) {
    return str.charAt(0).toUpperCase() + str.slice(1)
  }
  return str
}

function buildFranchiseGroup(
  cluster: NormalisedEntry[],
  forcedFranchiseId?: string,
): FranchiseGroup | null {
  if (cluster.length === 0) return null

  const mainTimeline = cluster.filter(
    (entry) => classifyEntry(entry, cluster) === "main",
  )
  const side_stories = cluster.filter(
    (entry) => classifyEntry(entry, cluster) === "supplementary",
  )

  if (mainTimeline.length === 0) {
    mainTimeline.push(...side_stories.splice(0))
  }

  const sortFn = (a: NormalisedEntry, b: NormalisedEntry) =>
    (a.start_year ?? 9999) - (b.start_year ?? 9999) || a.id - b.id
  mainTimeline.sort(sortFn)
  side_stories.sort(sortFn)

  const rootEntry = findFranchiseRoot(cluster)
  const mainTimelineSorted = [...mainTimeline].sort(
    (a, b) => (a.start_year ?? 9999) - (b.start_year ?? 9999),
  )

  const coverEntry =
    mainTimelineSorted.find(
      (entry) => (entry.type === "TV" || entry.type === "TV_SHORT") && entry.cover_image,
    ) ??
    mainTimelineSorted.find((entry) => entry.type === "MOVIE" && entry.cover_image) ??
    mainTimelineSorted.find((entry) => entry.cover_image) ??
    rootEntry

  const isDonghua = cluster.some((entry) => entry.country_of_origin === "CN")

  let completedCount: number
  let totalCount: number
  let percentage: number

  if (isDonghua) {
    const validEntries = mainTimeline.filter((entry) => entry.episodes_total > 0)

    if (validEntries.length === 0) {
      completedCount = mainTimeline.filter((entry) => entry.user_completed).length
      totalCount = mainTimeline.length
      percentage = totalCount > 0 ? Math.floor((completedCount / totalCount) * 100) : 0
    } else {
      totalCount = validEntries.reduce((sum, entry) => sum + entry.episodes_total, 0)
      // FIX: episodes_watched is typed as number, ?? 0 was redundant
      completedCount = validEntries.reduce((sum, entry) => {
        return sum + Math.min(entry.episodes_watched, entry.episodes_total)
      }, 0)
      percentage = Math.min(Math.floor((completedCount / totalCount) * 100), 100)
    }
  } else {
    totalCount = mainTimeline.length
    completedCount = mainTimeline.filter((entry) => entry.user_completed).length
    percentage = totalCount > 0 ? Math.floor((completedCount / totalCount) * 100) : 0
  }

  const fullyCompleted =
    percentage === 100 && side_stories.every((entry) => entry.user_completed)

  return {
    franchise_id: forcedFranchiseId ?? rootEntry.platform_id.toString(),
    canonical_title: toTitleCase(rootEntry.title),
    cover_image: coverEntry.cover_image,
    is_donghua: isDonghua,
    main_timeline: mainTimeline,
    side_stories,
    has_pending_sequel: false,
    pending_sequel_count: 0,
    progress: {
      main_timeline_total: totalCount,
      main_timeline_completed: completedCount,
      percentage,
      fully_completed: fullyCompleted,
    },
  }
}

export function applyFranchiseOverrides(
  groups: FranchiseGroup[],
  overrides: FranchiseOverride[],
): FranchiseGroup[] {
  if (overrides.length === 0) return groups

  const groupEntries = new Map<string, NormalisedEntry[]>()
  const entriesById = new Map<number, NormalisedEntry>()

  groups.forEach((group) => {
    const entries = [...group.main_timeline, ...group.side_stories]
    groupEntries.set(group.franchise_id, entries)
    entries.forEach((entry) => {
      entriesById.set(entry.platform_id, entry)
    })
  })

  overrides.forEach((override) => {
    const entry = entriesById.get(override.entryId)
    if (!entry) return

    groupEntries.forEach((entries, franchiseId) => {
      const nextEntries = entries.filter((item) => item.platform_id !== override.entryId)
      if (nextEntries.length === 0) {
        groupEntries.delete(franchiseId)
      } else {
        groupEntries.set(franchiseId, nextEntries)
      }
    })

    const targetEntries = groupEntries.get(override.targetFranchiseId) ?? []
    if (!targetEntries.some((item) => item.platform_id === override.entryId)) {
      targetEntries.push(entry)
    }
    groupEntries.set(override.targetFranchiseId, targetEntries)
  })

  const result: FranchiseGroup[] = []
  groupEntries.forEach((entries, franchiseId) => {
    const uniqueEntries = Array.from(
      new Map(entries.map((entry) => [entry.platform_id, entry])).values()
    )
    const group = buildFranchiseGroup(uniqueEntries, franchiseId)
    if (group) result.push(group)
  })

  result.sort((a, b) => a.canonical_title.localeCompare(b.canonical_title))
  return result
}

// ── Main Export ───────────────────────────────────────

export function buildFranchiseGroups(
  entries: NormalisedEntry[],
): FranchiseGroup[] {
  console.log("Total entries received:", entries.length)

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

  entries.forEach((entry) => {
    entry.relations.forEach((relation) => {
      if (!GROUPING_RELATION_TYPES.has(relation.relationType)) return
      if (!parent.has(relation.id)) {
        parent.set(relation.id, relation.id)
      }
      union(entry.platform_id, relation.id)
    })
  })

  let clusters = new Map<number, NormalisedEntry[]>()
  entries.forEach((entry) => {
    const root = find(entry.platform_id)
    if (!clusters.has(root)) clusters.set(root, [])
    clusters.get(root)!.push(entry)
  })

  const singletonsBefore = [...clusters.values()].filter(c => c.length === 1).length
  console.log(`Clusters after relation-based grouping: ${clusters.size} (${singletonsBefore} singletons)`)

  clusters = mergeByTitleSimilarity(clusters, parent, find)

  const singletonsAfter = [...clusters.values()].filter(c => c.length === 1).length
  console.log(`Clusters after title merge: ${clusters.size} (${singletonsAfter} singletons)`)

  const groups: FranchiseGroup[] = []
  clusters.forEach((cluster) => {
    const group = buildFranchiseGroup(cluster)
    if (group) groups.push(group)
  })

  groups.sort((a, b) => a.canonical_title.localeCompare(b.canonical_title))

  console.log("Total franchise groups formed:", groups.length)

  return groups
}