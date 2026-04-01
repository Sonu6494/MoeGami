import { NextResponse } from 'next/server'
import { generateCodeVerifier, getMALAuthUrl } from '@/lib/mal'
import { cookies } from 'next/headers'

export async function GET() {
  if (!process.env.MAL_CLIENT_ID || !process.env.MAL_REDIRECT_URI) {
    return NextResponse.json(
      { error: 'MAL Authentication is not configured. Missing environment variables.' },
      { status: 500 }
    )
  }

  const codeVerifier = generateCodeVerifier()

  // Store verifier in httpOnly cookie for callback
  const cookieStore = await cookies()
  cookieStore.set('mal_code_verifier', codeVerifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 600, // 10 minutes
    path: '/',
  })

  const authUrl = getMALAuthUrl(
    process.env.MAL_CLIENT_ID,
    codeVerifier,
    process.env.MAL_REDIRECT_URI
  )

  return NextResponse.redirect(authUrl)
}
