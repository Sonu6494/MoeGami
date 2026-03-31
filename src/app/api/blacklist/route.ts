import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import type { BlacklistEntry } from "@/lib/types"

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET /api/blacklist?platform=MAL&accountKey=Luffyking_07
export async function GET(request: NextRequest) {
  const platform = request.nextUrl.searchParams.get("platform")
  const accountKey = request.nextUrl.searchParams.get("accountKey")

  if (!platform || !accountKey?.trim()) {
    return NextResponse.json({ error: "Missing platform or accountKey" }, { status: 400 })
  }

  try {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from("blacklist_entries")
      .select("*")
      .eq("platform", platform)
      .eq("account_key", accountKey.trim().toLowerCase())
      .order("created_at", { ascending: false })

    if (error) throw error

    const entries: BlacklistEntry[] = (data ?? []).map((row) => ({
      platform: row.platform,
      accountKey: row.account_key,
      type: row.type,
      targetId: row.target_id,
      title: row.title,
      createdAt: new Date(row.created_at).getTime(),
    }))

    return NextResponse.json({ entries })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch blacklist"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// POST /api/blacklist  { entry: BlacklistEntry }
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { entry?: BlacklistEntry }
    const entry = body.entry

    if (!entry?.accountKey?.trim() || !entry.targetId || !entry.type) {
      return NextResponse.json({ error: "Invalid blacklist entry" }, { status: 400 })
    }

    const supabase = getSupabase()
    const { error } = await supabase
      .from("blacklist_entries")
      .upsert(
        {
          platform: entry.platform,
          account_key: entry.accountKey.trim().toLowerCase(),
          type: entry.type,
          target_id: entry.targetId,
          title: entry.title,
          created_at: new Date(entry.createdAt).toISOString(),
        },
        { onConflict: "platform,account_key,target_id" }
      )

    if (error) throw error

    return NextResponse.json({ saved: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to save blacklist entry"
    return NextResponse.json({ saved: false, error: message }, { status: 500 })
  }
}

// DELETE /api/blacklist  { targetId, platform, accountKey }
export async function DELETE(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      targetId?: string
      platform?: string
      accountKey?: string
    }

    if (!body.targetId || !body.platform || !body.accountKey?.trim()) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 })
    }

    const supabase = getSupabase()
    const { error } = await supabase
      .from("blacklist_entries")
      .delete()
      .eq("platform", body.platform)
      .eq("account_key", body.accountKey.trim().toLowerCase())
      .eq("target_id", body.targetId)

    if (error) throw error

    return NextResponse.json({ saved: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to remove blacklist entry"
    return NextResponse.json({ saved: false, error: message }, { status: 500 })
  }
}
