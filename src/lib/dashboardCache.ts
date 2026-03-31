import type { DashboardSnapshot, Platform } from "./types"

const CACHE_VERSION = 1

function normaliseAccountKey(accountKey: string) {
  return accountKey.trim().toLowerCase()
}

function getStorageKey(platform: Platform, accountKey: string) {
  return `moegami-dashboard-cache:v${CACHE_VERSION}:${platform}:${normaliseAccountKey(accountKey)}`
}

// Removes cache entries from any previous cache version for this account
function clearStaleCacheKeys(platform: Platform, accountKey: string) {
  const normalised = normaliseAccountKey(accountKey)
  const prefix = `moegami-dashboard-cache:`
  const currentKey = getStorageKey(platform, accountKey)

  try {
    const toRemove: string[] = []
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i)
      if (key && key.startsWith(prefix) && key.includes(`${platform}:${normalised}`) && key !== currentKey) {
        toRemove.push(key)
      }
    }
    toRemove.forEach((k) => window.localStorage.removeItem(k))
  } catch {
    // Non-fatal — stale keys are cosmetic
  }
}

export function getDashboardCacheStaleTime(platform: Platform) {
  return platform === "MAL" ? 15 * 60 * 1000 : 30 * 60 * 1000
}

export function readDashboardSnapshot(
  platform: Platform,
  accountKey: string
): DashboardSnapshot | null {
  if (typeof window === "undefined") return null
  if (!accountKey.trim()) return null

  try {
    const raw = window.localStorage.getItem(getStorageKey(platform, accountKey))
    if (!raw) return null

    const parsed = JSON.parse(raw) as {
      version?: number
      snapshot?: DashboardSnapshot
    }

    if (parsed.version !== CACHE_VERSION || !parsed.snapshot) return null

    return parsed.snapshot
  } catch {
    return null
  }
}

export function writeDashboardSnapshot(snapshot: DashboardSnapshot): { saved: boolean; error: string | null } {
  if (typeof window === "undefined") return { saved: false, error: "No window" }
  if (!snapshot.accountKey.trim()) return { saved: false, error: "Missing account key" }

  try {
    clearStaleCacheKeys(snapshot.platform, snapshot.accountKey)
    window.localStorage.setItem(
      getStorageKey(snapshot.platform, snapshot.accountKey),
      JSON.stringify({ version: CACHE_VERSION, snapshot })
    )
    return { saved: true, error: null }
  } catch (err) {
    const message = err instanceof DOMException && err.name === "QuotaExceededError"
      ? "Local storage quota exceeded"
      : "Failed to write local cache"
    return { saved: false, error: message }
  }
}

export function formatLastSynced(syncedAt: number | null) {
  // FIX: was `!syncedAt` which treats 0 as null
  if (syncedAt === null) return "Never synced"

  const diffMs = Date.now() - syncedAt
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000))

  if (diffMinutes < 1) return "Synced just now"
  if (diffMinutes === 1) return "Synced 1 minute ago"
  if (diffMinutes < 60) return `Synced ${diffMinutes} minutes ago`

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours === 1) return "Synced 1 hour ago"
  if (diffHours < 24) return `Synced ${diffHours} hours ago`

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays === 1) return "Synced 1 day ago"
  return `Synced ${diffDays} days ago`
}

export async function readRemoteDashboardSnapshot(
  platform: Platform,
  accountKey: string
): Promise<DashboardSnapshot | null> {
  if (!accountKey.trim()) return null

  try {
    const params = new URLSearchParams({ platform, accountKey })
    const response = await fetch(`/api/dashboard-snapshot?${params.toString()}`)
    if (!response.ok) return null

    const json = (await response.json()) as { snapshot?: DashboardSnapshot | null }
    return json.snapshot ?? null
  } catch {
    return null
  }
}

export async function writeRemoteDashboardSnapshot(
  snapshot: DashboardSnapshot
): Promise<{ saved: boolean; error: string | null }> {
  if (!snapshot.accountKey.trim()) {
    return { saved: false, error: "Missing account key" }
  }

  try {
    const response = await fetch("/api/dashboard-snapshot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ snapshot }),
    })

    const json = (await response.json()) as { saved?: boolean; error?: string }

    if (!response.ok || json.saved !== true) {
      return { saved: false, error: json.error ?? "Cloud snapshot save failed" }
    }

    return { saved: true, error: null }
  } catch {
    return { saved: false, error: "Cloud snapshot request failed" }
  }
}