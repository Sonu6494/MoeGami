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
  | "other";

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
  "source",
  "compilation",
  "contains",
  "other",
  // "character" intentionally excluded — never shown
];

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
};

// AniList normalizer
// NOTE: AniList's ALTERNATIVE maps to alternative_version by convention.
// It cannot be distinguished from alternative_setting — known limitation.
export function fromAniList(type: string): UnifiedRelationType {
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
  };
  return map[type?.toUpperCase()] ?? "other";
}

// MAL normalizer
export function fromMAL(type: string): UnifiedRelationType {
  const map: Record<string, UnifiedRelationType> = {
    Sequel: "sequel",
    Prequel: "prequel",
    "Parent story": "parent_story",
    "Full story": "full_story",
    "Side story": "side_story",
    Summary: "summary",
    "Spin-off": "spin_off",
    "Alternative version": "alternative_version",
    "Alternative setting": "alternative_setting",
    Character: "character",
    Other: "other",
  };
  return map[type] ?? "other";
}

export type RelatedItem<T> = { node: T; relation_type: string };
export type GroupedRelations<T> = {
  type: UnifiedRelationType;
  items: RelatedItem<T>[];
}[];

export function groupRelatedAnime<T>(
  related: RelatedItem<T>[],
  source: "anilist" | "mal"
): GroupedRelations<T> {
  const normalizer = source === "anilist" ? fromAniList : fromMAL;
  const groups = new Map<UnifiedRelationType, RelatedItem<T>[]>();

  for (const item of related) {
    const unified = normalizer(item.relation_type);
    if (unified === "character") continue; // always filtered
    if (!groups.has(unified)) groups.set(unified, []);
    groups.get(unified)!.push(item);
  }

  return RELATION_PRIORITY.filter((type) => groups.has(type)).map((type) => ({
    type,
    items: groups.get(type)!,
  }));
}
