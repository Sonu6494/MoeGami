import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { NormalisedEntry, FranchiseGroup } from "@/lib/types";

interface AnimeStore {
  username: string;
  platform: "ANILIST" | "MAL";
  theme: "dark" | "warm" | "light";
  rawEntries: NormalisedEntry[];
  franchiseGroups: FranchiseGroup[];
  isLoading: boolean;
  error: string | null;

  setUsername: (username: string) => void;
  setPlatform: (platform: "ANILIST" | "MAL") => void;
  setRawEntries: (entries: NormalisedEntry[]) => void;
  setFranchiseGroups: (groups: FranchiseGroup[]) => void;
  setLoading: (loading: boolean) => void;
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
      isLoading: false,
      error: null,

      setUsername: (username) => set({ username }),
      setPlatform: (platform) => set({ platform }),
      setRawEntries: (rawEntries) => set({ rawEntries }),
      setFranchiseGroups: (franchiseGroups) => set({ franchiseGroups }),
      setLoading: (isLoading) => set({ isLoading }),
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
