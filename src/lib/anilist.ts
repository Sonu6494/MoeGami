import type {
  NormalisedEntry,
  AniListEntry,
  AniListCollection,
} from "./types"

const ANILIST_API = "https://graphql.anilist.co"

const USER_LIST_QUERY = `
  query GetUserList($username: String!) {
    MediaListCollection(
      userName: $username
      type: ANIME
    ) {
      lists {
        entries {
          score
          progress
          status
          media {
            id
            title {
              romaji
              english
            }
            type
            format
            episodes
            status
            countryOfOrigin
            coverImage {
              large
            }
            startDate {
              year
            }
            relations {
              edges {
                relationType
                node {
                  id
                  title {
                    romaji
                  }
                  type
                  format
                }
              }
            }
          }
        }
      }
    }
  }
`

function normalise(
  media: AniListEntry,
  listEntry: { score: number; progress: number; status: string },
): NormalisedEntry {
  return {
    id: media.id,
    platform_id: media.id,
    title: media.title.english ?? media.title.romaji,
    title_romaji: media.title.romaji,
    title_english: media.title.english ?? null,
    type: (media.format ?? media.type) as NormalisedEntry["type"],
    episodes_total: media.episodes ?? 0,
    episodes_watched: listEntry.progress ?? 0,
    user_completed: listEntry.status === "COMPLETED",
    status: listEntry.status as NormalisedEntry["status"],
    score: listEntry.score ?? 0,
    cover_image: media.coverImage?.large ?? "",
    start_year: media.startDate?.year ?? null,
    country_of_origin: media.countryOfOrigin ?? "",
    relations: media.relations.edges.map((edge) => ({
      id: edge.node.id,
      title: edge.node.title.romaji,
      type: (edge.node.format ?? edge.node.type) as NormalisedEntry["type"],
      relationType: edge.relationType as NormalisedEntry["relations"][0]["relationType"],
    })),
    platform: "ANILIST",
  }
}

export async function fetchAndNormalise(
  username: string,
): Promise<NormalisedEntry[]> {
  const response = await fetch(ANILIST_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      query: USER_LIST_QUERY,
      variables: { username },
    }),
  })

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Username "${username}" not found on AniList`)
    }
    if (response.status === 429) {
      throw new Error("Too many requests. Please wait a moment and try again.")
    }
    throw new Error(`AniList API error: ${response.status}`)
  }

  const json = await response.json()

  if (json.errors) {
    const msg = json.errors[0]?.message ?? "Unknown AniList error"
    if (msg.toLowerCase().includes("not found")) {
      throw new Error(`Username "${username}" not found on AniList`)
    }
    throw new Error(`AniList error: ${msg}`)
  }

  const collection: AniListCollection = json.data.MediaListCollection

  if (!collection || !collection.lists) {
    return []
  }

  const entries: NormalisedEntry[] = []

  collection.lists.forEach((list) => {
    list.entries.forEach((listEntry) => {
      if (!listEntry.media) return
      entries.push(normalise(listEntry.media, listEntry))
    })
  })

  return entries
}