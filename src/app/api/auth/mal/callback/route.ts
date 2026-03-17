import { NextRequest, NextResponse } from 'next/server'
import { exchangeMALCode } from '@/lib/mal'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(
      new URL(`/?error=mal_auth_failed`, request.url)
    )
  }

  const cookieStore = await cookies()
  const codeVerifier = cookieStore.get('mal_code_verifier')?.value

  if (!codeVerifier) {
    return NextResponse.redirect(
      new URL(`/?error=mal_verifier_missing`, request.url)
    )
  }

  try {
    const tokens = await exchangeMALCode(
      code,
      codeVerifier,
      process.env.MAL_CLIENT_ID!,
      process.env.MAL_CLIENT_SECRET!,
      process.env.MAL_REDIRECT_URI!
    )

    // Store access token in cookie (httpOnly for security)
    cookieStore.set('mal_access_token', tokens.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: tokens.expires_in,
      path: '/',
    })

    // Store refresh token
    cookieStore.set('mal_refresh_token', tokens.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    })

    // Delete the verifier cookie
    cookieStore.delete('mal_code_verifier')

    // Redirect to dashboard with MAL platform flag
    return NextResponse.redirect(
      new URL('/dashboard?platform=mal', request.url)
    )
  } catch (err) {
    console.error('MAL callback error:', err)
    return NextResponse.redirect(
      new URL('/?error=mal_token_failed', request.url)
    )
  }
}
