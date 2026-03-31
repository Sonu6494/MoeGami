import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET() {
  const cookieStore = await cookies()
  const token = cookieStore.get('mal_access_token')?.value

  if (!token) {
    return NextResponse.json({ authenticated: false })
  }

  try {
    // Verify the token is still valid by hitting MAL's user endpoint
    const res = await fetch('https://api.myanimelist.net/v2/users/@me?fields=name', {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!res.ok) {
      return NextResponse.json({ authenticated: false })
    }

    const user = await res.json()
    return NextResponse.json({ authenticated: true, username: user.name ?? "" })
  } catch {
    return NextResponse.json({ authenticated: false })
  }
}
