import { NextRequest, NextResponse } from 'next/server'
import { fetchMALUserList, normaliseMALEntries } from '@/lib/mal'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
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
    const username = request.nextUrl.searchParams.get('username') ?? '@me'
    const rawEntries = await fetchMALUserList(accessToken, username)
    const normalised = normaliseMALEntries(rawEntries)

    return NextResponse.json({ entries: normalised })
  } catch (err: any) {
    if (err.message === 'MAL token expired') {
      return NextResponse.json({ error: 'token_expired' }, { status: 401 })
    }
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
