import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET() {
  const cookieStore = await cookies()
  cookieStore.delete('mal_access_token')
  cookieStore.delete('mal_refresh_token')
  
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  return NextResponse.redirect(new URL('/', baseUrl))
}
