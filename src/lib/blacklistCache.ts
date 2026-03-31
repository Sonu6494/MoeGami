import type { BlacklistEntry, Platform } from "./types"

const CACHE_VERSION = 1
const STORAGE_KEY_PREFIX = `moegami-blacklist:v${CACHE_VERSION}`

function getStorageKey(platform: Platform, accountKey: string) {
  return `${STORAGE_KEY_PREFIX}:${platform}:${accountKey.trim().toLowerCase()}`
}

// ── Local storage ─────────────────────────────────────

export function readBlacklist(
  platform: Platform,
  accountKey: string
): BlacklistEntry[] {
  if (typeof window === "undefined") return []
  if (!accountKey.trim()) return []

  try {
    const raw = window.localStorage.getItem(getStorageKey(platform, accountKey))
    if (!raw) return []
    return JSON.parse(raw) as BlacklistEntry[]
  } catch {
    return []
  }
}

export function writeBlacklist(
  platform: Platform,
  accountKey: string,
  entries: BlacklistEntry[]
): void {
  if (typeof window === "undefined") return
  if (!accountKey.trim()) return

  try {
    window.localStorage.setItem(
      getStorageKey(platform, accountKey),
      JSON.stringify(entries)
    )
  } catch {
    // QuotaExceededError — non-fatal
  }
}

// ── Remote API ────────────────────────────────────────

export async function readRemoteBlacklist(
  platform: Platform,
  accountKey: string
): Promise<BlacklistEntry[]> {
  if (!accountKey.trim()) return []

  try {
    const params = new URLSearchParams({ platform, accountKey })
    const response = await fetch(`/api/blacklist?${params.toString()}`)
    if (!response.ok) return []

    const json = (await response.json()) as { entries?: BlacklistEntry[] }
    return json.entries ?? []
  } catch {
    return []
  }
}

export async function addToRemoteBlacklist(
  entry: BlacklistEntry
): Promise<{ saved: boolean; error: string | null }> {
  if (!entry.accountKey.trim()) {
    return { saved: false, error: "Missing account key" }
  }

  try {
    const response = await fetch("/api/blacklist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entry }),
    })

    const json = (await response.json()) as { saved?: boolean; error?: string }

    if (!response.ok || json.saved !== true) {
      return { saved: false, error: json.error ?? "Failed to save blacklist entry" }
    }

    return { saved: true, error: null }
  } catch {
    return { saved: false, error: "Blacklist request failed" }
  }
}

export async function removeFromRemoteBlacklist(
  targetId: string,
  platform: Platform,
  accountKey: string
): Promise<{ saved: boolean; error: string | null }> {
  if (!accountKey.trim()) {
    return { saved: false, error: "Missing account key" }
  }

  try {
    const response = await fetch("/api/blacklist", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetId, platform, accountKey }),
    })

    const json = (await response.json()) as { saved?: boolean; error?: string }

    if (!response.ok || json.saved !== true) {
      return { saved: false, error: json.error ?? "Failed to remove blacklist entry" }
    }

    return { saved: true, error: null }
  } catch {
    return { saved: false, error: "Blacklist request failed" }
  }
}

// ── Helpers ───────────────────────────────────────────

export function buildBlacklistSets(entries: BlacklistEntry[]) {
  const franchiseIds = new Set<string>()
  const entryIds = new Set<number>()

  for (const item of entries) {
    if (item.type === "franchise") {
      franchiseIds.add(item.targetId)
    } else {
      entryIds.add(Number(item.targetId))
    }
  }

  return { franchiseIds, entryIds }
}
