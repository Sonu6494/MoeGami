export type UnifiedRelationType =
  | "sequel"
  | "prequel"
  | "parent_story"
  | "full_story"
  | "side_story"
  | "summary"
  | "spin_off"
  | "alternative_version"
  | "alternative_setting"
  | "source"
  | "compilation"
  | "contains"
  | "character"
  | "other"

export const RELATION_PRIORITY: UnifiedRelationType[] = [
  "sequel",
  "prequel",
  "parent_story",
  "full_story",
  "side_story",
  "summary",
  "spin_off",
  "alternative_version",
  "alternative_setting",
  "compilation",
  // "contains", "source", "other" and "character" are excluded from priority list
  // — filtered out in groupRelatedAnime and never surfaced in the UI as groups
]

export const RELATION_DISPLAY_LABELS: Record<UnifiedRelationType, string> = {
  sequel: "Sequel",
  prequel: "Prequel",
  parent_story: "Parent Story",
  full_story: "Full Story",
  side_story: "Side Story",
  summary: "Summary",
  spin_off: "Spin-Off",
  alternative_version: "Alternative Version",
  alternative_setting: "Alternative Setting",
  source: "Source",
  compilation: "Compilation",
  contains: "Contains",
  character: "Character",
  other: "Other",
}

// NOTE: AniList's ALTERNATIVE maps to alternative_version by convention.
// It cannot be distinguished from alternative_setting — known limitation.
export function fromAniList(type: string): UnifiedRelationType {
  // FIX: removed ?. — type is string, not string | undefined.
  // map miss falls through to ?? "other" naturally.
  const map: Record<string, UnifiedRelationType> = {
    SEQUEL: "sequel",
    PREQUEL: "prequel",
    PARENT: "parent_story",
    SIDE_STORY: "side_story",
    SUMMARY: "summary",
    SPIN_OFF: "spin_off",
    ALTERNATIVE: "alternative_version",
    SOURCE: "source",
    COMPILATION: "compilation",
    CONTAINS: "contains",
    CHARACTER: "character",
    OTHER: "other",
  }
  return map[type.toUpperCase()] ?? "other"
}

export function fromMAL(rawType: string): UnifiedRelationType {
  if (!rawType) return "other"

  const normalizedType = rawType
    .toLowerCase()
    .trim()
    .replace(/[-\s]+/g, "_")

  const map: Record<string, UnifiedRelationType> = {
    sequel: "sequel",
    prequel: "prequel",
    parent_story: "parent_story",
    full_story: "full_story",
    side_story: "side_story",
    summary: "summary",
    spin_off: "spin_off",
    alternative_version: "alternative_version",
    alternative_setting: "alternative_setting",
    character: "character",
    other: "other",
  }

  return map[normalizedType] ?? "other"
}

export type RelatedItem<T> = { node: T; relation_type: string }
export type GroupedRelations<T> = {
  type: UnifiedRelationType
  items: RelatedItem<T>[]
}[]

export function groupRelatedAnime<T>(
  related: RelatedItem<T>[],
  source: "anilist" | "mal"
): GroupedRelations<T> {
  const normalizer = source === "anilist" ? fromAniList : fromMAL
  const groups = new Map<UnifiedRelationType, RelatedItem<T>[]>()

  for (const item of related) {
    const unified = normalizer(item.relation_type)
    if (
      unified === "character" ||
      unified === "other" ||
      unified === "source" ||
      unified === "contains"
    ) continue
    if (!groups.has(unified)) groups.set(unified, [])
    groups.get(unified)!.push(item)
  }

  return RELATION_PRIORITY.filter((type) => groups.has(type)).map((type) => ({
    type,
    items: groups.get(type)!,
  }))
}