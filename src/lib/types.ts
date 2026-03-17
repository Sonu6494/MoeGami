export type Platform = "ANILIST" | "MAL"

export type EntryStatus =
  | "COMPLETED"
  | "CURRENT"
  | "PAUSED"
  | "DROPPED"
  | "PLANNING"
  | "REPEATING"

export type EntryType =
  | "TV"
  | "TV_SHORT"
  | "MOVIE"
  | "SPECIAL"
  | "OVA"
  | "ONA"
  | "MUSIC"
  | "UNKNOWN"

export type RelationType =
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

export interface EntryRelation {
  id: number
  title: string
  type: EntryType
  relationType: RelationType
}

export interface NormalisedEntry {
  id: number
  platform_id: number
  title: string
  title_romaji: string
  title_english: string | null
  type: EntryType
  episodes_total: number
  episodes_watched: number
  user_completed: boolean
  status: EntryStatus
  score: number
  cover_image: string
  start_year: number | null
  country_of_origin: string
  relations: EntryRelation[]
  platform: Platform
}

export interface ProgressData {
  main_timeline_total: number
  main_timeline_completed: number
  percentage: number
  fully_completed: boolean
}

export interface FranchiseGroup {
  franchise_id: string
  canonical_title: string
  cover_image: string
  is_donghua: boolean
  main_timeline: NormalisedEntry[]
  side_stories: NormalisedEntry[]
  progress: ProgressData
}

export type SequelStatus = 
  | "available"      // exists, not in user list
  | "upcoming"       // announced, not aired yet
  | "in_progress"    // user has it but not completed
  | "watching"       // user is currently watching it

export interface SequelAlert {
  franchise_title: string
  franchise_cover: string
  franchise_id: string
  last_watched: {
    id: number
    title: string
    type: EntryType
  }
  next_entry: {
    id: number
    title: string
    type: EntryType
    status: string        // "FINISHED" | "RELEASING" | "NOT_YET_RELEASED"
    season?: string       // "WINTER 2025"
    year?: number
    cover_image?: string
  }
  alert_status: SequelStatus
}

// Raw AniList API types
export interface AniListMediaTitle {
  romaji: string
  english: string | null
}

export interface AniListCoverImage {
  large: string
}

export interface AniListStartDate {
  year: number | null
}

export interface AniListRelationNode {
  id: number
  title: AniListMediaTitle
  type: string
  format: string | null
}

export interface AniListRelationEdge {
  relationType: string
  node: AniListRelationNode
}

export interface AniListRelations {
  edges: AniListRelationEdge[]
}

export interface AniListMediaListEntry {
  score: number
  progress: number
  status: string
}

export interface AniListEntry {
  id: number
  title: AniListMediaTitle
  type: string
  format: string | null
  episodes: number | null
  status: string
  countryOfOrigin: string
  coverImage: AniListCoverImage
  startDate: AniListStartDate
  relations: AniListRelations
}

export interface AniListListEntry {
  score: number
  progress: number
  status: string
  media: AniListEntry
}

export interface AniListMediaList {
  entries: AniListListEntry[]
}

export interface AniListCollection {
  lists: AniListMediaList[]
}