import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabaseServer"
import type { FranchiseOverride, Platform } from "@/lib/types"

type OverrideRow = {
  platform: Platform
  account_key: string
  entry_id: number
  target_franchise_id: string
  updated_at: string
}

function normaliseAccountKey(accountKey: string) {
  return accountKey.trim().toLowerCase()
}

function toOverride(row: OverrideRow): FranchiseOverride {
  return {
    platform: row.platform,
    accountKey: row.account_key,
    entryId: row.entry_id,
    targetFranchiseId: row.target_franchise_id,
    updatedAt: new Date(row.updated_at).getTime(),
  }
}

function getParams(request: NextRequest) {
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
  const params = getParams(request)
  if (!params) {
    return NextResponse.json({ error: "Invalid override params" }, { status: 400 })
  }

  const supabase = getSupabaseServerClient()
  if (!supabase) {
    return NextResponse.json({ overrides: [] })
  }

  const { data, error } = await supabase
    .from("franchise_overrides")
    .select("platform, account_key, entry_id, target_franchise_id, updated_at")
    .eq("platform", params.platform)
    .eq("account_key", params.accountKey)
    .order("updated_at", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 502 })
  }

  const overrides = (data ?? []).map((row) => toOverride(row as OverrideRow))
  return NextResponse.json({ overrides })
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    platform?: Platform
    accountKey?: string
    entryId?: number
    targetFranchiseId?: string | null
  }

  if (
    (body.platform !== "ANILIST" && body.platform !== "MAL") ||
    !body.accountKey?.trim() ||
    typeof body.entryId !== "number"
  ) {
    return NextResponse.json({ error: "Invalid override payload" }, { status: 400 })
  }

  const supabase = getSupabaseServerClient()
  if (!supabase) {
    return NextResponse.json({ saved: false, error: "Supabase not configured" }, { status: 503 })
  }

  const accountKey = normaliseAccountKey(body.accountKey)

  if (!body.targetFranchiseId?.trim()) {
    const { error } = await supabase
      .from("franchise_overrides")
      .delete()
      .eq("platform", body.platform)
      .eq("account_key", accountKey)
      .eq("entry_id", body.entryId)

    if (error) {
      return NextResponse.json({ saved: false, error: error.message }, { status: 502 })
    }

    return NextResponse.json({ saved: true, removed: true })
  }

  const now = new Date().toISOString()
  const { error } = await supabase.from("franchise_overrides").upsert(
    {
      platform: body.platform,
      account_key: accountKey,
      entry_id: body.entryId,
      target_franchise_id: body.targetFranchiseId,
      updated_at: now,
    },
    {
      onConflict: "platform,account_key,entry_id",
    }
  )

  if (error) {
    return NextResponse.json({ saved: false, error: error.message }, { status: 502 })
  }

  return NextResponse.json({ saved: true, removed: false })
}
