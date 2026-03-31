import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabaseServer"
import type { DashboardSnapshot, Platform } from "@/lib/types"

type SnapshotRow = {
  platform: Platform
  account_key: string
  payload: DashboardSnapshot
  synced_at: string
}

function normaliseAccountKey(accountKey: string) {
  return accountKey.trim().toLowerCase()
}

function getRequestParams(request: NextRequest) {
  const platform = request.nextUrl.searchParams.get("platform")
  const accountKey = request.nextUrl.searchParams.get("accountKey")

  if ((platform !== "ANILIST" && platform !== "MAL") || !accountKey?.trim()) {
    return null
  }

  return {
    platform,
    accountKey: normaliseAccountKey(accountKey),
  }
}

export async function GET(request: NextRequest) {
  const params = getRequestParams(request)
  if (!params) {
    return NextResponse.json({ error: "Invalid snapshot params" }, { status: 400 })
  }

  const supabase = getSupabaseServerClient()
  if (!supabase) {
    return NextResponse.json({ snapshot: null })
  }

  try {
    const { data, error } = await supabase
      .from("dashboard_snapshots")
      .select("platform, account_key, payload, synced_at")
      .eq("platform", params.platform)
      .eq("account_key", params.accountKey)
      .maybeSingle<SnapshotRow>()

    if (error) {
      console.warn("dashboard snapshot GET failed:", error.message)
      return NextResponse.json({ snapshot: null, error: error.message })
    }

    return NextResponse.json({ snapshot: data?.payload ?? null })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown snapshot read error"
    console.warn("dashboard snapshot GET failed:", message)
    return NextResponse.json({ snapshot: null, error: message }, { status: 503 })
  }
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { snapshot?: DashboardSnapshot }
  const snapshot = body.snapshot

  if (
    !snapshot ||
    (snapshot.platform !== "ANILIST" && snapshot.platform !== "MAL") ||
    !snapshot.accountKey?.trim()
  ) {
    return NextResponse.json({ error: "Invalid snapshot payload" }, { status: 400 })
  }

  const supabase = getSupabaseServerClient()
  if (!supabase) {
    return NextResponse.json({ saved: false })
  }

  const accountKey = normaliseAccountKey(snapshot.accountKey)
  const normalizedSnapshot: DashboardSnapshot = {
    ...snapshot,
    accountKey,
  }

  try {
    const { error } = await supabase.from("dashboard_snapshots").upsert(
      {
        platform: normalizedSnapshot.platform,
        account_key: accountKey,
        payload: normalizedSnapshot,
        synced_at: new Date(normalizedSnapshot.syncedAt).toISOString(),
      },
      {
        onConflict: "platform,account_key",
      }
    )

    if (error) {
      console.warn("dashboard snapshot POST failed:", error.message)
      return NextResponse.json({ saved: false, error: error.message }, { status: 502 })
    }

    return NextResponse.json({ saved: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown snapshot write error"
    console.warn("dashboard snapshot POST failed:", message)
    return NextResponse.json({ saved: false, error: message }, { status: 503 })
  }
}
