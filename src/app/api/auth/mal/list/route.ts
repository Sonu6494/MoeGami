import { NextResponse } from 'next/server'
import {
  fetchMALUserList,
  fetchMALRelations,
  getUnresolvedMALRelationEntries,
  hydrateMALRelationsFromCache,
  normaliseMALEntries,
} from '@/lib/mal'
import { cookies } from 'next/headers'
import { getSupabaseServerClient } from '@/lib/supabaseServer'
import type { DashboardSnapshot } from '@/lib/types'

export async function GET() {
  if (!process.env.MAL_CLIENT_ID) {
    return NextResponse.json(
      { error: "MAL_CLIENT_ID not configured" },
      { status: 500 }
    );
  }

  const cookieStore = await cookies();
  const accessToken = cookieStore.get('mal_access_token')?.value

  if (!accessToken) {
    return NextResponse.json(
      { error: 'Not authenticated with MAL' },
      { status: 401 }
    )
  }

  try {
    // Fetch MAL username and profile picture alongside the list
    const [userRes, rawEntries] = await Promise.all([
      fetch('https://api.myanimelist.net/v2/users/@me?fields=name,picture', {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
      fetchMALUserList(accessToken),
    ])

    let malUsername = ""
    let malAvatarUrl = null
    
    if (userRes.ok) {
      const userData = await userRes.json();
      malUsername = userData.name ?? "";
      if (userData.picture) malAvatarUrl = userData.picture;
    }

    if (malUsername) {
      const supabase = getSupabaseServerClient()
      if (supabase) {
        const { data, error } = await supabase
          .from("dashboard_snapshots")
          .select("payload")
          .eq("platform", "MAL")
          .eq("account_key", malUsername.toLowerCase())
          .maybeSingle<{ payload: DashboardSnapshot }>()

        if (error) {
          console.warn("MAL route cache lookup failed:", error.message)
        } else if (data?.payload?.rawEntries?.length) {
          const hydration = hydrateMALRelationsFromCache(rawEntries, data.payload.rawEntries)
          console.log(
            `MAL cache hydration: ${hydration.hydrated} entries ready, ${hydration.missing} still missing relations`
          )
        }
      }
    }

    // MAL's animelist endpoint doesn't return related_anime data
    // Reuse cached relation data when possible, then fetch only missing relations
    await fetchMALRelations(rawEntries)

    const unresolvedEntries = getUnresolvedMALRelationEntries(rawEntries)
    if (unresolvedEntries.length > 0) {
      console.log(
        "MAL unresolved relation entries:",
        unresolvedEntries.slice(0, 20)
      )
      if (unresolvedEntries.length > 20) {
        console.log(
          `MAL unresolved relation entries: ${unresolvedEntries.length - 20} more not shown`
        )
      }
    }

    const normalised = normaliseMALEntries(rawEntries)
    return NextResponse.json({ entries: normalised, malUsername, malAvatarUrl })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown MAL error'
    if (message === 'MAL token expired') {
      return NextResponse.json({ error: 'token_expired' }, { status: 401 })
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
