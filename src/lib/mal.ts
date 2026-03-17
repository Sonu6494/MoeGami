const MAL_API = "https://api.myanimelist.net/v2"
const MAL_AUTH = "https://myanimelist.net/v1/oauth2"

// ── PKCE helpers ──────────────────────────────────────

export function generateCodeVerifier(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
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
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    code_challenge: codeVerifier,
    code_challenge_method: 'plain',
    state: 'moegami_mal_auth',
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
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      code_verifier: codeVerifier,
      grant_type: 'authorization_code',
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
): Promise<any[]> {
  // MAL requires related_anime fields in a specific nested format
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
  ].join(",");

  const allEntries: any[] = []
  let offset = 0
  const limit = 100 // ← reduce from 1000 to 100, MAL works better

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

    // Small delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 200))
  }

  console.log(`MAL total fetched: ${allEntries.length} entries`)
  return allEntries
}

// ── Normalise MAL entry to our NormalisedEntry format ─

import type { NormalisedEntry, EntryType, EntryStatus } from './types'
import { fromMAL } from './relations'

function normaliseMALType(mediaType: string): EntryType {
  const map: Record<string, EntryType> = {
    'tv': 'TV',
    'movie': 'MOVIE',
    'ova': 'OVA',
    'ona': 'ONA',
    'special': 'SPECIAL',
    'music': 'MUSIC',
    'tv_special': 'SPECIAL',
    'unknown': 'UNKNOWN',
  }
  return map[mediaType?.toLowerCase()] ?? 'UNKNOWN'
}

function normaliseMALStatus(status: string): EntryStatus {
  const map: Record<string, EntryStatus> = {
    'completed': 'COMPLETED',
    'watching': 'CURRENT',
    'on_hold': 'PAUSED',
    'dropped': 'DROPPED',
    'plan_to_watch': 'PLANNING',
  }
  return map[status?.toLowerCase()] ?? 'PLANNING'
}



export function normaliseMALEntries(rawEntries: any[]): NormalisedEntry[] {
  return rawEntries.map((item) => {
    const node = item.node;
    const listStatus = item.list_status ?? node.my_list_status ?? {};

    // MAL related_anime structure:
    // { node: { id, title, media_type }, relation_type: "sequel" }
    const relations = (node.related_anime ?? [])
      .map((rel: any) => {
        const relNode = rel.node;
        if (!relNode?.id) return null;

        return {
          id: relNode.id,
          title: relNode.alternative_titles?.en || relNode.title || "",
          type: normaliseMALType(relNode.media_type ?? "unknown"),
          relationType: fromMAL(rel.relation_type ?? "other"),
        };
      })
      .filter(Boolean);

    const startYear = node.start_date
      ? parseInt(node.start_date.split("-")[0])
      : null;

    const englishTitle = node.alternative_titles?.en || null;
    const title = englishTitle || node.title;

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
    } as NormalisedEntry;
  });
}
