import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { NormalisedEntry, FranchiseGroup, SequelAlert } from "@/lib/types";

interface AnimeStore {
  username: string;
  platform: "ANILIST" | "MAL";
  theme: "dark" | "warm" | "light";
  rawEntries: NormalisedEntry[];
  franchiseGroups: FranchiseGroup[];
  sequelAlerts: SequelAlert[];
  isLoading: boolean;
  isScanning: boolean;
  malAccessToken: string | null;
  malAuthenticated: boolean;
  error: string | null;

  setUsername: (username: string) => void;
  setPlatform: (platform: "ANILIST" | "MAL") => void;
  setRawEntries: (entries: NormalisedEntry[]) => void;
  setFranchiseGroups: (groups: FranchiseGroup[]) => void;
  setSequelAlerts: (alerts: SequelAlert[]) => void;
  setLoading: (loading: boolean) => void;
  setIsScanning: (isScanning: boolean) => void;
  setMALAuthenticated: (authenticated: boolean) => void;
  setError: (error: string | null) => void;
  setTheme: (theme: "dark" | "warm" | "light") => void;
}

export const useAnimeStore = create<AnimeStore>()(
  persist(
    (set) => ({
      username: "",
      platform: "ANILIST",
      theme: "light",
      rawEntries: [],
      franchiseGroups: [],
      sequelAlerts: [],
      isLoading: false,
      isScanning: false,
      malAccessToken: null,
      malAuthenticated: false,
      error: null,

      setUsername: (username) => set({ username }),
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
      partialize: (state) => ({
        username: state.username,
        theme: state.theme,
        platform: state.platform,
      }),
    }
  )
);

export default useAnimeStore;
