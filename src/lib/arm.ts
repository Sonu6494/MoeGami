export type ARMEntry = {
  anilist_id?: number
  mal_id?: number
}

export type ARMIndex = {
  malToAni: Map<number, number>
  aniToMal: Map<number, number>
  loadedAt: number
}

const ARM_DATA_URL =
  "https://raw.githubusercontent.com/Fribb/anime-lists/master/anime-offline-database-reduced.json"
const ARM_REVALIDATE_MS = 24 * 60 * 60 * 1000

let armIndexPromise: Promise<ARMIndex> | null = null

async function fetchARMIndex(): Promise<ARMIndex> {
  const response = await fetch(ARM_DATA_URL, { cache: "no-store" })

  if (!response.ok) {
    throw new Error(`ARM mapping fetch failed: ${response.status}`)
  }

  const rows = (await response.json()) as ARMEntry[]
  const malToAni = new Map<number, number>()
  const aniToMal = new Map<number, number>()

  for (const row of rows) {
    if (typeof row.mal_id !== "number" || typeof row.anilist_id !== "number") {
      continue
    }
    malToAni.set(row.mal_id, row.anilist_id)
    aniToMal.set(row.anilist_id, row.mal_id)
  }

  return { malToAni, aniToMal, loadedAt: Date.now() }
}

function makeARMPromise(): Promise<ARMIndex> {
  return fetchARMIndex().catch((err) => {
    armIndexPromise = null
    throw err
  })
}

export async function getARMIndex(): Promise<ARMIndex> {
  if (!armIndexPromise) {
    armIndexPromise = makeARMPromise()
    return armIndexPromise
  }

  const currentIndex = await armIndexPromise
  if (Date.now() - currentIndex.loadedAt < ARM_REVALIDATE_MS) {
    return currentIndex
  }

  armIndexPromise = makeARMPromise()
  return armIndexPromise
}