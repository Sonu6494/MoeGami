import { create } from "zustand"
import { persist } from "zustand/middleware"
import type {
  NormalisedEntry,
  FranchiseGroup,
  SequelAlert,
  Platform,
} from "@/lib/types"

// Persisted slice — only these fields survive page reloads
interface PersistedAnimeStore {
  username: string
  malUsername: string
  malAvatarUrl: string | null
  platform: Platform
  theme: "dark" | "light"
}

interface AnimeStore extends PersistedAnimeStore {
  rawEntries: NormalisedEntry[]
  franchiseGroups: FranchiseGroup[]
  sequelAlerts: SequelAlert[]
  isLoading: boolean
  isScanning: boolean
  malAuthenticated: boolean
  error: string | null

  setUsername: (username: string) => void
  setMalUsername: (malUsername: string, avatarUrl?: string | null) => void
  setPlatform: (platform: Platform) => void
  setRawEntries: (entries: NormalisedEntry[]) => void
  setFranchiseGroups: (groups: FranchiseGroup[]) => void
  setSequelAlerts: (alerts: SequelAlert[]) => void
  setLoading: (loading: boolean) => void
  setIsScanning: (isScanning: boolean) => void
  setMALAuthenticated: (authenticated: boolean) => void
  setError: (error: string | null) => void
  setTheme: (theme: "dark" | "light") => void
}

export const useAnimeStore = create<AnimeStore>()(
  persist(
    (set) => ({
      username: "",
      malUsername: "",
      malAvatarUrl: null,
      platform: "ANILIST",
      theme: "light",
      rawEntries: [],
      franchiseGroups: [],
      sequelAlerts: [],
      isLoading: false,
      isScanning: false,
      // FIX: removed malAccessToken — lives in httpOnly cookie, not client state
      malAuthenticated: false,
      error: null,

      setUsername: (username) => set({ username }),
      setMalUsername: (malUsername, avatarUrl) => set((s) => ({ malUsername, malAvatarUrl: avatarUrl !== undefined ? avatarUrl : s.malAvatarUrl })),
      setPlatform: (platform) => set({ platform }),
      setRawEntries: (rawEntries) => set({ rawEntries }),
      setFranchiseGroups: (franchiseGroups) => set({ franchiseGroups }),
      setSequelAlerts: (sequelAlerts) => set({ sequelAlerts }),
      setLoading: (isLoading) => set({ isLoading }),
      setIsScanning: (isScanning) => set({ isScanning }),
      setMALAuthenticated: (malAuthenticated) => set({ malAuthenticated }),
      setError: (error) => set({ error }),
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: "moegami-store",
      version: 2,
      // FIX: explicit return type matches PersistedAnimeStore so TypeScript
      // catches missing or misspelled fields
      migrate: (persistedState): PersistedAnimeStore => {
        const state = persistedState as Partial<PersistedAnimeStore> | undefined
        return {
          username: state?.username ?? "",
          malUsername: state?.malUsername ?? "",
          malAvatarUrl: state?.malAvatarUrl ?? null,
          theme: state?.theme === "dark" ? "dark" : "light",
          platform: state?.platform ?? "ANILIST",
        }
      },
      partialize: (state): PersistedAnimeStore => ({
        username: state.username,
        malUsername: state.malUsername,
        malAvatarUrl: state.malAvatarUrl,
        theme: state.theme,
        platform: state.platform,
      }),
    }
  )
)

export default useAnimeStore