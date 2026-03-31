const MAL_API = "https://api.myanimelist.net/v2"
const MAL_AUTH = "https://myanimelist.net/v1/oauth2"
import { getARMIndex } from "./arm"

// ── PKCE helpers ──────────────────────────────────────

export function generateCodeVerifier(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "")
}

export function generateCodeChallenge(verifier: string): string {
  // MAL supports plain PKCE
  return verifier
}

export function getMALAuthUrl(
  clientId: string,
  codeVerifier: string,
  redirectUri: string
): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    code_challenge: codeVerifier,
    code_challenge_method: "plain",
    state: "moegami_mal_auth",
  })
  return `${MAL_AUTH}/authorize?${params.toString()}`
}

// ── Token exchange ────────────────────────────────────

export async function exchangeMALCode(
  code: string,
  codeVerifier: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string
) {
  const response = await fetch(`${MAL_AUTH}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      code_verifier: codeVerifier,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }).toString(),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`MAL token exchange failed: ${err}`)
  }

  return response.json()
  // Returns: { access_token, refresh_token, expires_in, token_type }
}

// ── Fetch MAL user anime list ─────────────────────────

export async function fetchMALUserList(
  accessToken: string,
  username: string = "@me"
): Promise<Record<string, any>[]> {
  const fields = [
    "id",
    "title",
    "main_picture",
    "alternative_titles",
    "start_date",
    "media_type",
    "status",
    "num_episodes",
    "my_list_status{status,score,num_episodes_watched,updated_at}",
    "related_anime{id,title,alternative_titles,media_type,my_list_status,relation_type}",
  ].join(",")

  const allEntries: Record<string, any>[] = []
  let offset = 0
  const limit = 100

  while (true) {
    const url = `${MAL_API}/users/${username}/animelist?fields=${fields}&limit=${limit}&offset=${offset}&nsfw=true&sort=list_updated_at`

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "X-MAL-CLIENT-ID": process.env.MAL_CLIENT_ID!,
      },
    })

    if (!response.ok) {
      if (response.status === 401) throw new Error("MAL token expired")
      const errText = await response.text()
      throw new Error(`MAL API error ${response.status}: ${errText}`)
    }

    const json = await response.json()
    const entries = json.data ?? []
    allEntries.push(...entries)

    console.log(
      `MAL fetch: got ${entries.length} entries, total: ${allEntries.length}`
    )

    if (!json.paging?.next || entries.length < limit) break
    offset += limit

    await new Promise((resolve) => setTimeout(resolve, 200))
  }

  console.log(`MAL total fetched: ${allEntries.length} entries`)
  return allEntries
}

// ── Fetch relations via AniList batch lookup ──────────────────────────────────
// MAL's animelist endpoint doesn't reliably return related_anime.
// Instead of individual MAL API calls, we batch-query AniList by MAL ID.
// AniList supports idMal_in → 50 IDs per request → ~16 calls for 766 entries.

const ANILIST_GQL = "https://graphql.anilist.co"

const BATCH_RELATIONS_QUERY = `
  query BatchRelations($malIds: [Int], $anilistIds: [Int], $page: Int) {
    byMal: Page(page: $page, perPage: 50) {
      pageInfo { hasNextPage }
      media(idMal_in: $malIds, type: ANIME) {
        id
        idMal
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
            }
          }
        }
      }
    }
    byAni: Page(page: $page, perPage: 50) {
      media(id_in: $anilistIds, type: ANIME) {
        id
        idMal
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
            }
          }
        }
      }
    }
  }
`

// Map AniList relation types to MAL-compatible snake_case
const ANILIST_TO_MAL_RELATION: Record<string, string> = {
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

// Map AniList format to MAL media_type
const ANILIST_FORMAT_TO_MAL: Record<string, string> = {
  TV: "tv",
  TV_SHORT: "tv",
  MOVIE: "movie",
  OVA: "ova",
  ONA: "ona",
  SPECIAL: "special",
  MUSIC: "music",
}

const MANUAL_MAL_TO_ANILIST_OVERRIDES: Record<number, number> = {
  38414: 100049, // Re:ZERO Frozen Bond
  59989: 153406, // Tower of God Workshop Battle
  53273: 146722, // Stone Ocean Part 3 → AniList Part 2 split
}

export async function fetchMALRelations(
  rawEntries: Record<string, any>[]
): Promise<Record<string, any>[]> {
  const entriesMissingRelations = rawEntries.filter((item) => {
    const relatedAnime = item.node?.related_anime
    return !Array.isArray(relatedAnime) || relatedAnime.length === 0
  })

  const malIds = entriesMissingRelations
    .map((item) => item.node?.id)
    .filter((id): id is number => typeof id === "number")

  const reusedCount = rawEntries.length - entriesMissingRelations.length
  console.log(
    `MAL relations: ${reusedCount} reused from cache, ${malIds.length} need AniList enrichment...`
  )

  if (malIds.length === 0) {
    console.log("MAL relations: all entries already have cached relation data.")
    return rawEntries
  }

  // Build a Map of MAL id → raw entry for quick mutation
  const entryById = new Map<number, Record<string, any>>()
  entriesMissingRelations.forEach((item) => {
    if (item.node?.id) entryById.set(item.node.id, item)
  })

  const BATCH_SIZE = 50
  const DELAY_MS = 1100
  let totalFound = 0
  let armFallbackHits = 0
  let armRelationNodeHits = 0
  let manualOverrideHits = 0
  const entriesWithRecoveredRelations = new Set<number>()
  let armLookup: Awaited<ReturnType<typeof getARMIndex>> | null = null

  try {
    armLookup = await getARMIndex()
    console.log(
      `ARM mapping ready: ${armLookup.malToAni.size} MAL→AniList pairs loaded`
    )
  } catch (err) {
    console.warn("ARM mapping unavailable, continuing without it:", err)
  }

  const applyRelationsToEntry = (media: any, explicitMalId?: number): boolean => {
    const armResolvedMalId =
      typeof media?.id === "number" && armLookup
        ? armLookup.aniToMal.get(media.id)
        : undefined

    const malId = media?.idMal ?? explicitMalId ?? armResolvedMalId
    if (!malId) return false

    const entry = entryById.get(malId)
    if (!entry) return false

    const relations = (media.relations?.edges ?? [])
      .map((edge: any) => {
        const nodeMalId =
          edge.node?.idMal ??
          (typeof edge.node?.id === "number" && armLookup
            ? armLookup.aniToMal.get(edge.node.id)
            : undefined)

        if (!nodeMalId) return null
        if (!edge.node?.idMal && typeof edge.node?.id === "number") {
          armRelationNodeHits++
        }

        return {
          node: {
            id: nodeMalId,
            title: edge.node.title?.english || edge.node.title?.romaji || "",
            alternative_titles: { en: edge.node.title?.english || "" },
            media_type: ANILIST_FORMAT_TO_MAL[edge.node.format] ?? "unknown",
            status: edge.node.status,
          },
          relation_type: ANILIST_TO_MAL_RELATION[edge.relationType] ?? "other",
        }
      })
      .filter(Boolean)

    entry.node.related_anime = relations
    if (relations.length > 0 && !entriesWithRecoveredRelations.has(malId)) {
      entriesWithRecoveredRelations.add(malId)
      totalFound++
    }

    return relations.length > 0
  }

  for (let i = 0; i < malIds.length; i += BATCH_SIZE) {
    const batch = malIds.slice(i, i + BATCH_SIZE)

    const armPairs = batch
      .map((malId) => {
        const manualAniListId = MANUAL_MAL_TO_ANILIST_OVERRIDES[malId]
        const anilistId = manualAniListId ?? armLookup?.malToAni.get(malId)
        if (!anilistId) return null
        if (manualAniListId) manualOverrideHits++
        return { malId, anilistId }
      })
      .filter((pair): pair is { malId: number; anilistId: number } => pair !== null)

    const batchAniIds = Array.from(new Set(armPairs.map((p) => p.anilistId)))
    const batchAniToMal = new Map<number, number>()
    armPairs.forEach((p) => batchAniToMal.set(p.anilistId, p.malId))

    let success = false
    for (let attempt = 0; attempt < 3 && !success; attempt++) {
      try {
        if (attempt > 0) {
          const backoff = attempt * 3000
          console.log(`MAL relations: retry #${attempt} after ${backoff / 1000}s backoff...`)
          await new Promise((r) => setTimeout(r, backoff))
        }

        const res = await fetch(ANILIST_GQL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            query: BATCH_RELATIONS_QUERY,
            variables: {
              malIds: batch,
              anilistIds: batchAniIds.length > 0 ? batchAniIds : [-1],
              page: 1,
            },
          }),
        })

        if (res.status === 429) {
          console.warn("MAL relations: AniList rate limited (429), will retry...")
          continue
        }

        if (!res.ok) {
          console.warn(`MAL relations: AniList batch failed, status=${res.status}`)
          break
        }

        const json = await res.json()
        const mediaByMal: any[] = json.data?.byMal?.media ?? []
        const mediaByAni: any[] = json.data?.byAni?.media ?? []

        for (const media of mediaByMal) {
          applyRelationsToEntry(media)
        }

        for (const media of mediaByAni) {
          if (typeof media?.id !== "number") continue
          const explicitMalId = batchAniToMal.get(media.id)
          if (explicitMalId) armFallbackHits++
          applyRelationsToEntry(media, explicitMalId)
        }

        success = true
      } catch (err) {
        console.warn(`MAL relations: AniList batch error at offset ${i}:`, err)
        break
      }
    }

    const processed = Math.min(i + BATCH_SIZE, malIds.length)
    console.log(
      `MAL relations: ${processed}/${malIds.length} processed (${totalFound} with relations)`
    )

    if (i + BATCH_SIZE < malIds.length) {
      await new Promise((r) => setTimeout(r, DELAY_MS))
    }
  }

  const withRelations = rawEntries.filter(
    (item) => (item.node?.related_anime ?? []).length > 0
  ).length
  console.log(
    `MAL relations: done. ${withRelations}/${rawEntries.length} entries have relations.`
  )
  if (manualOverrideHits > 0) {
    console.log(`Manual MAL→AniList overrides used: ${manualOverrideHits}`)
  }
  if (armLookup) {
    console.log(
      `ARM mapping assists: ${armFallbackHits} entry lookups, ${armRelationNodeHits} relation-node ID recoveries`
    )
  }

  return rawEntries
}

// ── Normalise MAL entry to our NormalisedEntry format ─

import type { NormalisedEntry, EntryType, EntryStatus } from "./types"
import { fromMAL } from "./relations"

function normaliseMALType(mediaType: string): EntryType {
  const map: Record<string, EntryType> = {
    tv: "TV",
    movie: "MOVIE",
    ova: "OVA",
    ona: "ONA",
    special: "SPECIAL",
    music: "MUSIC",
    tv_special: "SPECIAL",
    unknown: "UNKNOWN",
  }
  return map[mediaType?.toLowerCase()] ?? "UNKNOWN"
}

function normaliseMALStatus(status: string): EntryStatus {
  const map: Record<string, EntryStatus> = {
    completed: "COMPLETED",
    watching: "CURRENT",
    on_hold: "PAUSED",
    dropped: "DROPPED",
    plan_to_watch: "PLANNING",
  }
  return map[status?.toLowerCase()] ?? "PLANNING"
}

function denormaliseMALType(entryType: EntryType): string {
  const map: Record<EntryType, string> = {
    TV: "tv",
    TV_SHORT: "tv",
    MOVIE: "movie",
    SPECIAL: "special",
    OVA: "ova",
    ONA: "ona",
    MUSIC: "music",
    UNKNOWN: "unknown",
  }
  return map[entryType] ?? "unknown"
}

// FIX: EntryRelation has no `status` field — omitted here
function toMALRelatedAnimeShape(entry: NormalisedEntry) {
  return entry.relations.map((relation) => ({
    node: {
      id: relation.id,
      title: relation.title,
      alternative_titles: { en: relation.title },
      media_type: denormaliseMALType(relation.type),
    },
    relation_type: relation.relationType,
  }))
}

export function hydrateMALRelationsFromCache(
  rawEntries: Record<string, any>[],
  cachedEntries: NormalisedEntry[]
): { hydrated: number; missing: number } {
  const cachedById = new Map<number, NormalisedEntry>()
  cachedEntries.forEach((entry) => cachedById.set(entry.platform_id, entry))

  let hydrated = 0
  let missing = 0

  rawEntries.forEach((item) => {
    const nodeId = item.node?.id
    if (typeof nodeId !== "number") return

    const existingRelations = item.node?.related_anime
    if (Array.isArray(existingRelations) && existingRelations.length > 0) {
      hydrated++
      return
    }

    const cachedEntry = cachedById.get(nodeId)
    if (!cachedEntry || cachedEntry.relations.length === 0) {
      missing++
      return
    }

    item.node.related_anime = toMALRelatedAnimeShape(cachedEntry)
    hydrated++
  })

  return { hydrated, missing }
}

// FIX: removed duplicate declaration and moved to top level
export function getUnresolvedMALRelationEntries(
  rawEntries: Record<string, any>[]
): Array<{
  id: number | null
  title: string
  media_type: string
  status: string
  start_date: string | null
}> {
  return rawEntries
    .filter((item) => {
      const relatedAnime = item.node?.related_anime
      return !Array.isArray(relatedAnime) || relatedAnime.length === 0
    })
    .map((item) => ({
      id: item.node?.id ?? null,
      title:
        item.node?.alternative_titles?.en ||
        item.node?.title ||
        "Unknown title",
      media_type: item.node?.media_type ?? "unknown",
      status:
        item.list_status?.status ??
        item.node?.my_list_status?.status ??
        "unknown",
      start_date: item.node?.start_date ?? null,
    }))
}

export function normaliseMALEntries(
  rawEntries: Record<string, any>[]
): NormalisedEntry[] {
  // Diagnostic: track relation type mapping
  const relationTypeCounts = new Map<string, number>()
  const unmappedTypes = new Map<string, number>()
  const withRelations = rawEntries.filter(
    (item) => (item.node?.related_anime ?? []).length > 0
  )
  console.log(
    `MAL normalise: ${rawEntries.length} entries, ${withRelations.length} have related_anime data`
  )

  const result = rawEntries.map((item) => {
    const node = item.node
    const listStatus = item.list_status ?? node.my_list_status ?? {}

    const relations = (node.related_anime ?? [])
      .map((rel: Record<string, any>) => {
        const relNode = rel.node
        if (!relNode?.id) return null

        const rawRelType = rel.relation_type ?? "other"
        const mapped = fromMAL(rawRelType)

        relationTypeCounts.set(rawRelType, (relationTypeCounts.get(rawRelType) ?? 0) + 1)
        if (mapped === "other" && rawRelType !== "other") {
          unmappedTypes.set(rawRelType, (unmappedTypes.get(rawRelType) ?? 0) + 1)
        }

        return {
          id: relNode.id,
          title: relNode.alternative_titles?.en || relNode.title || "",
          type: normaliseMALType(relNode.media_type ?? "unknown"),
          relationType: mapped,
        }
      })
      .filter(Boolean)

    const startYear = node.start_date
      ? parseInt(node.start_date.split("-")[0])
      : null

    const englishTitle = node.alternative_titles?.en || null
    const title = englishTitle || node.title

    return {
      id: node.id,
      platform_id: node.id,
      title,
      title_romaji: node.title,
      title_english: englishTitle,
      type: normaliseMALType(node.media_type),
      episodes_total: node.num_episodes ?? 0,
      episodes_watched: listStatus.num_episodes_watched ?? 0,
      user_completed: listStatus.status === "completed",
      status: normaliseMALStatus(listStatus.status ?? "plan_to_watch"),
      score: listStatus.score ?? 0,
      cover_image: node.main_picture?.large ?? node.main_picture?.medium ?? "",
      start_year: startYear,
      country_of_origin: "",
      relations,
      platform: "MAL",
    } as NormalisedEntry
  })

  console.log("MAL relation type counts:", Object.fromEntries(relationTypeCounts))
  if (unmappedTypes.size > 0) {
    console.warn(
      "MAL UNMAPPED relation types (fell to 'other'):",
      Object.fromEntries(unmappedTypes)
    )
  }

  const groupingTypes = new Set([
    "sequel", "prequel", "alternative_version", "alternative_setting",
    "side_story", "parent_story", "spin_off", "summary",
  ])
  const entriesWithGroupingRelations = result.filter((e) =>
    e.relations.some((r) => groupingTypes.has(r.relationType))
  ).length
  console.log(
    `MAL entries with grouping-eligible relations: ${entriesWithGroupingRelations}/${result.length}`
  )

  return result
}