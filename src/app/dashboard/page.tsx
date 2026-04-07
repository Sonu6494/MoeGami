"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Grid,
  InputAdornment,
  LinearProgress,
  MenuItem,
  Paper,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  alpha,
} from "@mui/material";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import SyncRoundedIcon from "@mui/icons-material/SyncRounded";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import FolderCopyRoundedIcon from "@mui/icons-material/FolderCopyRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import ListAltRoundedIcon from "@mui/icons-material/ListAltRounded";
import PlayCircleFilledRoundedIcon from "@mui/icons-material/PlayCircleFilledRounded";
import SubscriptionsRoundedIcon from "@mui/icons-material/SubscriptionsRounded";
import { useAnimeStore } from "@/store/useAnimeStore";
import { fetchAndNormalise } from "@/lib/anilist";
import {
  formatLastSynced,
  getDashboardCacheStaleTime,
  readDashboardSnapshot,
  readRemoteDashboardSnapshot,
  writeDashboardSnapshot,
  writeRemoteDashboardSnapshot,
} from "@/lib/dashboardCache";
import {
  addToRemoteBlacklist,
  buildBlacklistSets,
  readBlacklist,
  readRemoteBlacklist,
  removeFromRemoteBlacklist,
  writeBlacklist,
} from "@/lib/blacklistCache";
import { applyFranchiseOverrides, buildFranchiseGroups } from "@/lib/grouping";
import Navbar from "@/components/layout/Navbar";
import FranchiseCard from "@/components/ui/FranchiseCard";
import FranchiseCardSkeleton from "@/components/ui/FranchiseCardSkeleton";
import SequelAlertCard from "@/components/ui/SequelAlertCard";
import SequelAlertCardSkeleton from "@/components/ui/SequelAlertCardSkeleton";
import { scanForSequels } from "@/lib/sequelScanner";
import type {
  BlacklistEntry,
  DashboardSnapshot,
  DashboardSnapshotSource,
  FranchiseGroup,
  FranchiseOverride,
  NormalisedEntry,
  SequelAlert,
} from "@/lib/types";

type FilterType = "all" | "complete" | "in-progress" | "side_stories";
type SortOption = "az" | "za" | "pct-high" | "pct-low" | "entries";
type DashboardSnapshotResult = {
  snapshot: DashboardSnapshot;
  source: DashboardSnapshotSource;
};

function buildScanContext(groups: DashboardSnapshot["franchiseGroups"]) {
  const allIds = new Set<number>();
  const allEntriesMap = new Map<number, NormalisedEntry>();

  groups.forEach((group) => {
    [...group.main_timeline, ...group.side_stories].forEach((entry) => {
      allIds.add(entry.platform_id);
      allEntriesMap.set(entry.platform_id, entry);
    });
  });

  return { allIds, allEntriesMap };
}

function applySequelAwareProgress(groups: FranchiseGroup[], sequelAlerts: SequelAlert[]) {
  const pendingByFranchise = new Map<string, SequelAlert[]>();

  sequelAlerts.forEach((alert) => {
    if (!pendingByFranchise.has(alert.franchise_id)) {
      pendingByFranchise.set(alert.franchise_id, []);
    }
    pendingByFranchise.get(alert.franchise_id)!.push(alert);
  });

  return groups.map((group) => {
    const alerts = pendingByFranchise.get(group.franchise_id) ?? [];
    const pendingSequelCount = alerts.length;

    if (pendingSequelCount === 0) {
      return {
        ...group,
        has_pending_sequel: false,
        pending_sequel_count: 0,
      };
    }

    if (group.is_donghua) {
      return {
        ...group,
        has_pending_sequel: true,
        pending_sequel_count: pendingSequelCount,
        progress: {
          ...group.progress,
          fully_completed: false,
        },
      };
    }

    const completedMainEntries = group.main_timeline.filter((entry) => entry.user_completed).length;

    const extraAlerts = alerts.filter(
      (a) =>
        !group.main_timeline.some((m) => m.platform_id === a.next_entry.id) &&
        !group.side_stories.some((m) => m.platform_id === a.next_entry.id)
    );

    const extraAlertsCount = extraAlerts.filter(
      (a) =>
        a.alert_status !== "upcoming" &&
        a.next_entry.status !== "NOT_YET_RELEASED"
    ).length;

    const newMainTimeline = [...group.main_timeline];
    extraAlerts.forEach((a) => {
      newMainTimeline.push({
        id: a.next_entry.id,
        platform_id: a.next_entry.id,
        platform: a.platform,
        title: a.next_entry.title,
        title_romaji: a.next_entry.title,
        title_english: a.next_entry.title,
        type: a.next_entry.type,
        episodes_total: 0,
        episodes_watched: 0,
        user_completed: false,
        status: "PLANNING",
        score: 0,
        cover_image: a.next_entry.cover_image ?? group.cover_image,
        start_year: a.next_entry.year ?? null,
        country_of_origin: group.is_donghua ? "CN" : "JP",
        relations: [],
      });
    });

    newMainTimeline.sort(
      (a, b) => (a.start_year ?? 9999) - (b.start_year ?? 9999) || a.platform_id - b.platform_id
    );

    const sequelAwareTotal = group.main_timeline.length + extraAlertsCount;
    const sequelAwarePercentage =
      sequelAwareTotal > 0 ? Math.floor((completedMainEntries / sequelAwareTotal) * 100) : 0;

    return {
      ...group,
      main_timeline: newMainTimeline,
      has_pending_sequel: true,
      pending_sequel_count: pendingSequelCount,
      progress: {
        ...group.progress,
        main_timeline_total: sequelAwareTotal,
        main_timeline_completed: completedMainEntries,
        percentage: sequelAwarePercentage,
        fully_completed: false,
      },
    };
  });
}



/* ── Main Dashboard Content ── */
function DashboardContent() {
  const [visibleCount, setVisibleCount] = useState(20);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchTerm = useAnimeStore((s) => s.globalSearchTerm);
  const setSearchTerm = useAnimeStore((s) => s.setGlobalSearchTerm);
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [sortOption, setSortOption] = useState<SortOption>("az");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleExpand = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  const [sequelFilter, setSequelFilter] = useState("all");
  const [showAllSequels, setShowAllSequels] = useState(false);
  const [scanProgress, setScanProgress] = useState({ current: 0, total: 0 });
  const [cloudSyncNotice, setCloudSyncNotice] = useState<string | null>(null);
  const [overrideSavingEntryId, setOverrideSavingEntryId] = useState<number | null>(null);
  const [blacklistingId, setBlacklistingId] = useState<string | number | null>(null);
  const [overrideSequelAlerts, setOverrideSequelAlerts] = useState<SequelAlert[] | null>(null);
  const forceFreshSyncRef = useRef(false);

  const username = useAnimeStore((s) => s.username);
  const malUsername = useAnimeStore((s) => s.malUsername);
  const platform = useAnimeStore((s) => s.platform);
  const setPlatform = useAnimeStore((s) => s.setPlatform);
  const setMalUsername = useAnimeStore((s) => s.setMalUsername);
  const setRawEntries = useAnimeStore((s) => s.setRawEntries);
  const setFranchiseGroups = useAnimeStore((s) => s.setFranchiseGroups);
  const setSequelAlerts = useAnimeStore((s) => s.setSequelAlerts);
  const isScanning = useAnimeStore((s) => s.isScanning);
  const setIsScanning = useAnimeStore((s) => s.setIsScanning);
  const setError = useAnimeStore((s) => s.setError);

  const cacheAccountKey = platform === "MAL" ? malUsername : username;
  const cachedSnapshot = useMemo(
    () => readDashboardSnapshot(platform, cacheAccountKey),
    [platform, cacheAccountKey]
  );

  const localBlacklist = useMemo(
    () => readBlacklist(platform, cacheAccountKey),
    [platform, cacheAccountKey]
  );

  useEffect(() => {
    const queryPlatform = searchParams.get("platform");
    if (queryPlatform === "mal") {
      setPlatform("MAL");
    }

    if (!username && platform !== "MAL" && queryPlatform !== "mal") {
      router.replace("/");
    }
  }, [platform, router, searchParams, setPlatform, username]);

  const {
    data: snapshotResult,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery<DashboardSnapshotResult>({
    queryKey: ["dashboard-snapshot", platform, platform === "MAL" ? "__mal_session__" : username],
    queryFn: async () => {
      const syncedAt = Date.now();
      const staleTime = getDashboardCacheStaleTime(platform);

      // Temporarily disable reading from remote snapshot to bypass caching issue 
      const remoteSnapshot: any = null; // forceFreshSyncRef.current ? null : await readRemoteDashboardSnapshot(platform, cacheAccountKey);

      if (remoteSnapshot && Date.now() - remoteSnapshot.syncedAt < staleTime) {
        return {
          snapshot: remoteSnapshot,
          source: "cloud",
        };
      }

      let accountKey = cacheAccountKey;
      let entries: NormalisedEntry[] = [];

      if (platform === "MAL") {
        const response = await fetch("/api/auth/mal/list");
        if (!response.ok) {
          const err = await response.json();
          if (err.error === "Not authenticated with MAL") {
            router.push("/");
            return {
              snapshot: {
                platform,
                accountKey: "",
                rawEntries: [],
                franchiseGroups: [],
                sequelAlerts: [],
                syncedAt,
              },
              source: "fresh",
            };
          }

          throw new Error(err.error ?? "MAL fetch failed");
        }

        const json = await response.json();
        if (json.malUsername) {
          setMalUsername(json.malUsername, json.malAvatarUrl);
          accountKey = json.malUsername;
        }
        entries = json.entries;
      } else {
        if (!username) {
          return {
            snapshot: {
              platform,
              accountKey: "",
              rawEntries: [],
              franchiseGroups: [],
              sequelAlerts: [],
              syncedAt,
            },
            source: "fresh",
          };
        }

        entries = await fetchAndNormalise(username);
      }

      const franchiseGroups = buildFranchiseGroups(entries);
      const { allIds, allEntriesMap } = buildScanContext(franchiseGroups);

      setScanProgress({ current: 0, total: 0 });
      setIsScanning(true);

      try {
        const blacklistSets = buildBlacklistSets(await readRemoteBlacklist(platform, accountKey));

        const sequelAlerts = await scanForSequels(
          franchiseGroups,
          allIds,
          allEntriesMap,
          (current, total) => setScanProgress({ current, total }),
          platform,
          blacklistSets.franchiseIds,
          blacklistSets.entryIds
        );

        return {
          snapshot: {
            platform,
            accountKey,
            rawEntries: entries,
            franchiseGroups,
            sequelAlerts,
            syncedAt,
          },
          source: "fresh",
        };
      } finally {
        setIsScanning(false);
      }
    },
    enabled: platform === "MAL" || !!username,
    initialData: forceFreshSyncRef.current ? undefined : cachedSnapshot
      ? {
        snapshot: cachedSnapshot,
        source: "local",
      }
      : undefined,
    initialDataUpdatedAt: cachedSnapshot?.syncedAt,
    staleTime: 0, // Temporarily disabled cache to force fetching naya data
    retry: 0,
    refetchOnWindowFocus: false,
  });

  const snapshot = snapshotResult?.snapshot ?? null;
  const snapshotSource = snapshotResult?.source ?? null;
  const overrideAccountKey = snapshot?.accountKey ?? cacheAccountKey;

  const {
    data: overrides = [],
    refetch: refetchOverrides,
  } = useQuery<FranchiseOverride[]>({
    queryKey: ["franchise-overrides", platform, overrideAccountKey],
    queryFn: async () => {
      const params = new URLSearchParams({
        platform,
        accountKey: overrideAccountKey,
      });
      const response = await fetch(`/api/franchise-overrides?${params.toString()}`);
      const json = (await response.json()) as {
        overrides?: FranchiseOverride[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(json.error ?? "Failed to load franchise overrides");
      }

      return json.overrides ?? [];
    },
    enabled: !!overrideAccountKey,
    initialData: [],
    retry: 0,
    refetchOnWindowFocus: false,
  });

  const {
    data: blacklist = [],
    refetch: refetchBlacklist,
  } = useQuery<BlacklistEntry[]>({
    queryKey: ["blacklist", platform, overrideAccountKey],
    queryFn: () => readRemoteBlacklist(platform, overrideAccountKey),
    enabled: !!overrideAccountKey,
    initialData: localBlacklist,
    retry: 0,
    refetchOnWindowFocus: false,
  });

  const blacklistSets = useMemo(() => buildBlacklistSets(blacklist), [blacklist]);

  const data = useMemo(() => snapshot?.rawEntries ?? [], [snapshot]);
  const baseGroups = useMemo(() => snapshot?.franchiseGroups ?? [], [snapshot]);
  const groups = useMemo(() => applyFranchiseOverrides(baseGroups, overrides), [baseGroups, overrides]);
  const sequelAlerts = useMemo(
    () => overrideSequelAlerts ?? snapshot?.sequelAlerts ?? [],
    [overrideSequelAlerts, snapshot]
  );
  const overrideTargets = useMemo(
    () => new Map(overrides.map((override) => [override.entryId, override.targetFranchiseId])),
    [overrides]
  );
  const franchiseOptions = useMemo(
    () =>
      groups.map((group) => ({
        id: group.franchise_id,
        title: group.canonical_title,
      })),
    [groups]
  );
  const displayGroups = useMemo(
    () => applySequelAwareProgress(groups, sequelAlerts),
    [groups, sequelAlerts]
  );
  const errorMessage = error instanceof Error ? error.message : "Failed to load your library";
  const lastSyncedLabel = formatLastSynced(snapshot?.syncedAt ?? null);
  const sourceLabel = useMemo(() => {
    if (!snapshotSource) return null;
    if (snapshotSource === "local") return "Browser cache";
    if (snapshotSource === "cloud") return "Cloud cache";
    return "Fresh sync";
  }, [snapshotSource]);

  useEffect(() => {
    if (!snapshot) {
      setOverrideSequelAlerts(null);
      return;
    }

    if (overrides.length === 0) {
      setOverrideSequelAlerts(null);
      return;
    }

    let cancelled = false;
    const { allIds, allEntriesMap } = buildScanContext(groups);

    setScanProgress({ current: 0, total: 0 });
    setIsScanning(true);

    void scanForSequels(
      groups,
      allIds,
      allEntriesMap,
      (current, total) => {
        if (!cancelled) {
          setScanProgress({ current, total });
        }
      },
      platform,
      blacklistSets.franchiseIds,
      blacklistSets.entryIds
    )
      .then((alerts) => {
        if (!cancelled) {
          setOverrideSequelAlerts(alerts);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const message =
            err instanceof Error ? err.message : "Failed to refresh sequel alerts";
          setError(message);
          setOverrideSequelAlerts(snapshot.sequelAlerts);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsScanning(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [groups, overrides, platform, setError, setIsScanning, snapshot, blacklistSets]);

  useEffect(() => {
    if (!snapshot) return;

    setRawEntries(snapshot.rawEntries);
    setFranchiseGroups(displayGroups);
    setSequelAlerts(sequelAlerts);
    setCloudSyncNotice(null);

    if (snapshot.accountKey) {
      writeDashboardSnapshot(snapshot);
      if (snapshotSource === "fresh") {
        void writeRemoteDashboardSnapshot(snapshot).then((result) => {
          if (!result.saved) {
            setCloudSyncNotice("Cloud cache failed, browser cache still saved");
          }
        });
      }
    }
  }, [
    displayGroups,
    sequelAlerts,
    setFranchiseGroups,
    setRawEntries,
    setSequelAlerts,
    snapshot,
    snapshotSource,
  ]);

  useEffect(() => {
    if (error) {
      setError(errorMessage);
    }
  }, [error, errorMessage, setError]);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setVisibleCount((prev) => prev + 20);
      }
    });
    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }
    return () => observer.disconnect();
  }, []);

  const filteredGroups = useMemo(() => {
    return displayGroups.filter((group) => {
      const query = searchTerm.toLowerCase().replace(/[-\s]+/g, " ").trim();
      if (query.length === 0) {
        if (activeFilter === "complete") return group.progress.percentage === 100;
        if (activeFilter === "in-progress") {
          return group.progress.percentage > 0 && group.progress.percentage < 100;
        }
        if (activeFilter === "side_stories") return group.side_stories.length > 0;
        return true;
      }

      const title = group.canonical_title.toLowerCase().replace(/[-\s]+/g, " ").trim();
      const searchMatch =
        title.includes(query) ||
        group.main_timeline.some((entry) =>
          entry.title.toLowerCase().replace(/[-\s]+/g, " ").includes(query)
        );

      if (!searchMatch) return false;

      if (activeFilter === "complete") return group.progress.percentage === 100;
      if (activeFilter === "in-progress") {
        return group.progress.percentage > 0 && group.progress.percentage < 100;
      }
      if (activeFilter === "side_stories") return group.side_stories.length > 0;

      return true;
    });
  }, [activeFilter, displayGroups, searchTerm]);

  const sortedGroups = useMemo(() => {
    const sorted = [...filteredGroups];

    switch (sortOption) {
      case "az":
        return sorted.sort((a, b) => a.canonical_title.localeCompare(b.canonical_title));
      case "za":
        return sorted.sort((a, b) => b.canonical_title.localeCompare(a.canonical_title));
      case "pct-high":
        return sorted.sort((a, b) => b.progress.percentage - a.progress.percentage);
      case "pct-low":
        return sorted.sort((a, b) => a.progress.percentage - b.progress.percentage);
      case "entries":
        return sorted.sort(
          (a, b) =>
            b.main_timeline.length +
            b.side_stories.length -
            (a.main_timeline.length + a.side_stories.length)
        );
      default:
        return sorted;
    }
  }, [filteredGroups, sortOption]);

  const stats = useMemo(() => {
    const franchises = displayGroups.length;
    const completed = displayGroups.filter((group) => group.progress.percentage === 100).length;
    const inProgress = displayGroups.filter(
      (group) => group.progress.percentage > 0 && group.progress.percentage < 100
    ).length;
    const entries = data.length;

    return { franchises, completed, inProgress, entries };
  }, [data.length, displayGroups]);

  const inProgressGroups = useMemo(() => {
    return displayGroups.filter((g) => g.progress.percentage > 0 && g.progress.percentage < 100);
  }, [displayGroups]);

  const planningGroups = useMemo(() => {
    return displayGroups.filter((g) => g.progress.percentage === 0 && g.main_timeline.some((e) => e.status === "PLANNING" || e.status === "CURRENT"));
  }, [displayGroups]);

  const heroItem = useMemo(() => {
    let targetGroup = inProgressGroups.length > 0 ? inProgressGroups[0] : planningGroups[0];
    if (!targetGroup && displayGroups.length > 0) targetGroup = displayGroups[0];
    if (!targetGroup) return null;

    const current = targetGroup.main_timeline.find((e) => e.status === "CURRENT");
    if (current) return { group: targetGroup, entry: current };

    const planning = targetGroup.main_timeline.find((e) => e.status === "PLANNING");
    if (planning) return { group: targetGroup, entry: planning };

    return { group: targetGroup, entry: targetGroup.main_timeline[0] };
  }, [inProgressGroups, planningGroups, displayGroups]);

  async function handleManualSync() {
    setError(null);
    forceFreshSyncRef.current = true;

    try {
      await refetch();
    } finally {
      forceFreshSyncRef.current = false;
    }
  }

  async function handleSaveOverride(entryId: number, targetFranchiseId: string | null) {
    if (!overrideAccountKey) {
      setError("Missing account key for franchise override");
      return;
    }

    setError(null);
    setOverrideSavingEntryId(entryId);

    try {
      const response = await fetch("/api/franchise-overrides", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          platform,
          accountKey: overrideAccountKey,
          entryId,
          targetFranchiseId,
        }),
      });

      const json = (await response.json()) as {
        saved?: boolean;
        error?: string;
      };

      if (!response.ok || json.saved !== true) {
        throw new Error(json.error ?? "Failed to save franchise override");
      }

      await refetchOverrides();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to save franchise override";
      setError(message);
    } finally {
      setOverrideSavingEntryId(null);
    }
  }

  async function handleBlacklistFranchise(id: string, title: string) {
    if (!overrideAccountKey) return;
    setBlacklistingId(id);
    try {
      const entry: BlacklistEntry = {
        platform,
        accountKey: overrideAccountKey,
        type: "franchise",
        targetId: id,
        title,
        createdAt: Date.now(),
      };
      const result = await addToRemoteBlacklist(entry);
      if (result.saved) {
        writeBlacklist(platform, overrideAccountKey, [...blacklist, entry]);
        await refetchBlacklist();
      } else {
        setError(result.error);
      }
    } catch (err: any) {
      setError(err.message || "Failed to ignore franchise");
    } finally {
      setBlacklistingId(null);
    }
  }

  async function handleBlacklistEntry(entryId: number, title: string) {
    if (!overrideAccountKey) return;
    setBlacklistingId(entryId);
    try {
      const entry: BlacklistEntry = {
        platform,
        accountKey: overrideAccountKey,
        type: "entry",
        targetId: entryId.toString(),
        title,
        createdAt: Date.now(),
      };
      const result = await addToRemoteBlacklist(entry);
      if (result.saved) {
        writeBlacklist(platform, overrideAccountKey, [...blacklist, entry]);
        await refetchBlacklist();
      } else {
        setError(result.error);
      }
    } catch (err: any) {
      setError(err.message || "Failed to ignore entry");
    } finally {
      setBlacklistingId(null);
    }
  }

  async function handleRemoveBlacklist(targetId: string) {
    if (!overrideAccountKey) return;
    try {
      const result = await removeFromRemoteBlacklist(targetId, platform, overrideAccountKey);
      if (result.saved) {
        const next = blacklist.filter((b) => b.targetId !== targetId);
        writeBlacklist(platform, overrideAccountKey, next);
        await refetchBlacklist();
      }
    } catch (err: any) {
      setError(err.message || "Failed to remove from blacklist");
    }
  }

  if (!username && platform !== "MAL") return null;

  return (
    <>
      <Navbar />
      <Box component="main" sx={{ pb: 12, pt: { xs: 10, md: 12 } }}>
        <Container maxWidth="lg">
          <Stack spacing={4}>
            {/* ── Header ── */}
            <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} spacing={2}>
              <Box>
                <Typography variant="h4" sx={{
                  fontWeight: 900,
                  fontFamily: "var(--font-epilogue)",
                  letterSpacing: "-0.03em",
                  background: (t) => t.palette.mode === 'dark'
                    ? 'linear-gradient(to right, #e8e0f4, #b09ad8)'  /* desaturated secondary gradient */
                    : 'inherit',
                  WebkitBackgroundClip: (t) => t.palette.mode === 'dark' ? 'text' : 'inherit',
                  WebkitTextFillColor: (t) => t.palette.mode === 'dark' ? 'transparent' : 'inherit',
                }}>
                  DASHBOARD
                </Typography>
              </Box>
              <Button
                onClick={handleManualSync}
                disabled={isFetching}
                size="small"
                variant="outlined"
                startIcon={isFetching ? <CircularProgress size={12} color="inherit" /> : <SyncRoundedIcon sx={{ fontSize: 16 }} />}
                sx={(t) => ({
                  borderRadius: 999,
                  textTransform: "none",
                  fontWeight: 600,
                  fontSize: "0.75rem",
                  py: 0.5,
                  px: 1.5,
                  color: "text.secondary",
                  borderColor: alpha(t.palette.divider, 0.8),
                  bgcolor: alpha(t.palette.action.hover, 0.04),
                  "&:hover": {
                    borderColor: "primary.main",
                    color: "primary.main",
                    bgcolor: alpha(t.palette.primary.main, 0.04),
                  },
                })}
              >
                {isFetching ? "Syncing..." : lastSyncedLabel}
              </Button>
            </Stack>

            {/* ── Hero Banner ── */}
            {heroItem && (
              <Box
                sx={{
                  position: 'relative',
                  width: '100%',
                  height: { xs: 190, md: 260 },
                  borderRadius: 4,
                  overflow: 'hidden',
                  bgcolor: 'background.paper',
                  boxShadow: (t) => t.shadows[10],
                }}
              >
                <Box sx={{
                  position: 'absolute',
                  inset: 0,
                  backgroundImage: `url(${heroItem.entry.cover_image})`,
                  backgroundSize: 'cover',
                  // Artwork focal point on the right — keeps faces/action visible
                  backgroundPosition: { xs: 'center 20%', md: 'right center' },
                }} />
                {/* Two-layer gradient composite for strong text legibility */}
                <Box sx={{
                  position: 'absolute',
                  inset: 0,
                  background: (t) => t.palette.mode === 'dark'
                    ? [
                      // Layer 1 — left-to-right reading scrim (text legibility)
                      'linear-gradient(to right, rgba(9, 5, 15, 0.97) 0%, rgba(9, 5, 15, 0.82) 35%, rgba(9, 5, 15, 0.4) 60%, transparent 80%)',
                      // Layer 2 — bottom scrim (CTA button area)
                      'linear-gradient(to top, rgba(9, 5, 15, 0.95) 0%, rgba(9, 5, 15, 0.3) 30%, transparent 55%)',
                    ].join(', ')
                    : [
                      'linear-gradient(to right, rgba(244, 241, 255, 0.97) 0%, rgba(244, 241, 255, 0.82) 35%, rgba(244, 241, 255, 0.35) 60%, transparent 80%)',
                      'linear-gradient(to top, rgba(244, 241, 255, 0.95) 0%, rgba(244, 241, 255, 0.4) 30%, transparent 55%)',
                    ].join(', '),
                }} />
                <Box sx={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  p: { xs: 3, md: 5 },
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: 1.5,
                  zIndex: 2,
                }}>
                  <Chip
                    label={heroItem.entry.status === 'CURRENT' ? 'Continue Watching' : heroItem.entry.status === 'COMPLETED' ? 'Completed' : 'Plan to Watch'}
                    size="small"
                    color="primary"
                    sx={{ fontWeight: 800, backdropFilter: 'blur(8px)', bgcolor: (t) => alpha(t.palette.primary.main, 0.8), color: '#fff' }}
                  />
                  <Typography variant="h2" sx={{
                    fontWeight: 900,
                    fontFamily: 'var(--font-epilogue)',
                    textShadow: (t) => t.palette.mode === 'dark' ? '0 4px 16px rgba(0,0,0,0.8)' : '0 2px 8px rgba(255,255,255,0.8)',
                    // T1 — hero title: primary text tier
                    color: (t) => t.palette.mode === 'dark' ? t.palette.text.primary : 'text.primary',
                    lineHeight: 1.1,
                  }}>
                    {heroItem.entry.title}
                  </Typography>
                  <Typography variant="body1" sx={{
                    opacity: 0.85,
                    fontWeight: 500,
                    textShadow: (t) => t.palette.mode === 'dark' ? '0 2px 8px rgba(0,0,0,0.8)' : 'none',
                    maxWidth: 700,
                    // T2 — hero subtitle: secondary text tier
                    color: (t) => t.palette.mode === 'dark' ? t.palette.text.secondary : 'text.secondary',
                  }}>
                    {heroItem.group.canonical_title} {heroItem.group.progress.percentage > 0 ? `• ${heroItem.group.progress.percentage}% Complete` : ''}
                  </Typography>
                  <Button
                    variant="contained"
                    size="large"
                    startIcon={<SubscriptionsRoundedIcon />}
                    onClick={() => {
                      document.getElementById('library-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      setExpandedId(heroItem.group.franchise_id);
                    }}
                    sx={{
                      mt: 2,
                      borderRadius: 999,
                      px: 4,
                      py: 1.5,
                      fontWeight: 800,
                      background: (t) => t.palette.mode === 'dark' ? `linear-gradient(135deg, ${t.palette.primary.light}, ${t.palette.primary.main})` : `linear-gradient(135deg, ${t.palette.primary.main}, ${t.palette.primary.dark})`,
                      // Glow uses desaturated primary — rgba(176,164,236,...)
                      boxShadow: (t) => t.palette.mode === 'dark' ? '0 8px 24px rgba(176, 164, 236, 0.3)' : '0 8px 24px rgba(111, 75, 255, 0.4)',
                      color: (t) => t.palette.mode === 'dark' ? '#1e0a48' : '#ffffff',
                    }}
                  >
                    View Timeline
                  </Button>
                </Box>
              </Box>
            )}

            {/* ── Quick Stats Row ── */}
            <Paper
              elevation={0}
              sx={(t) => ({
                borderRadius: 4,
                p: { xs: 2, md: 2.5 },
                border: '1px solid',
                borderColor: t.palette.mode === 'dark'
                  ? 'rgba(255,255,255,0.09)'
                  : t.palette.divider,
                // Level 2 — stat bar floats above the page canvas
                background: t.palette.mode === 'dark'
                  ? '#1d1528'   /* --bg-elevated */
                  : alpha('#ffffff', 0.6),
                backdropFilter: t.palette.mode === 'dark' ? 'none' : 'blur(12px)',
                // Top edge highlight for dark mode elevation
                boxShadow: t.palette.mode === 'dark'
                  ? '0 1px 0 rgba(255,255,255,0.09) inset'
                  : 'none',
                display: "flex",
                flexDirection: { xs: "column", sm: "row" },
                alignItems: "center",
                justifyContent: "space-between",
                gap: 2,
              })}
            >
              <Stack direction="row" sx={{ width: "100%", overflowX: "auto", "&::-webkit-scrollbar": { display: "none" }, scrollbarWidth: "none" }} spacing={{ xs: 3, md: 5 }} justifyContent={{ xs: "space-between", sm: "space-around" }}>
                {[
                  { value: stats.inProgress, label: "Watching", icon: TrendingUpRoundedIcon, color: "#b0a4ec" },
                  { value: stats.completed, label: "Completed", icon: CheckCircleRoundedIcon, color: "#10b981" },
                  { value: stats.franchises, label: "Franchises", icon: FolderCopyRoundedIcon, color: "#b09ad8" },
                  { value: stats.entries, label: "Library Entries", icon: ListAltRoundedIcon, color: "#67E8F9" },
                ].map((stat) => (
                  <Stack key={stat.label} direction="row" alignItems="center" spacing={1.5} sx={{ flexShrink: 0 }}>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        display: "grid",
                        placeItems: "center",
                        bgcolor: alpha(stat.color, 0.1),
                        color: stat.color,
                        flexShrink: 0,
                      }}
                    >
                      <stat.icon sx={{ fontSize: 20 }} />
                    </Box>
                    <Box>
                      <Typography sx={{ fontSize: "1.25rem", fontWeight: 800, fontFamily: 'var(--font-epilogue)', lineHeight: 1, color: 'text.primary' }}>
                        {stat.value}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, fontSize: "0.7rem", textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {stat.label}
                      </Typography>
                    </Box>
                  </Stack>
                ))}
              </Stack>
            </Paper>

            {/* ── Continue Watching Rail ── */}
            {inProgressGroups.length > 0 && (
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 800, fontFamily: 'var(--font-epilogue)', mb: 2 }}>
                  Continue Watching
                </Typography>
                <Box sx={{
                  display: 'flex', gap: 2, overflowX: 'auto', pb: 2, px: 0.5, mx: -0.5,
                  scrollSnapType: 'x mandatory',
                  '&::-webkit-scrollbar': { display: 'none' },
                  scrollbarWidth: 'none',
                }}>
                  {inProgressGroups.map(group => {
                    const mainEntry = group.main_timeline.find(e => e.status === "CURRENT") || group.main_timeline.find(e => e.episodes_watched && e.episodes_watched > 0) || group.main_timeline[0];
                    return (
                      <Paper
                        key={`cw-${group.franchise_id}`}
                        onClick={() => {
                          document.getElementById('library-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          setExpandedId(group.franchise_id);
                        }}
                        elevation={0}
                        sx={(t) => ({
                          width: 160, flexShrink: 0, scrollSnapAlign: 'start', cursor: 'pointer',
                          borderRadius: 3, overflow: 'hidden', position: 'relative',
                          // Level 1 — card surface
                          bgcolor: t.palette.mode === 'dark' ? '#130d1b' : 'background.paper',
                          border: `1px solid`,
                          borderColor: t.palette.mode === 'dark'
                            ? 'rgba(255,255,255,0.08)'
                            : alpha(t.palette.divider, 0.4),
                          transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.2s',
                          display: "flex", flexDirection: "column",
                          boxShadow: t.palette.mode === 'dark'
                            ? '0 1px 0 rgba(255,255,255,0.07) inset'
                            : 'none',
                          '&:hover': {
                            transform: 'translateY(-6px)',
                            borderColor: t.palette.mode === 'dark'
                              ? 'rgba(255,255,255,0.15)'
                              : alpha(t.palette.primary.main, 0.4),
                            boxShadow: t.palette.mode === 'dark'
                              ? '0 1px 0 rgba(255,255,255,0.12) inset'
                              : t.shadows[12],
                          }
                        })}
                      >
                        <Box sx={{ width: "100%", paddingTop: "150%", position: "relative", backgroundColor: 'action.disabledBackground', overflow: "hidden" }}>
                          <Box sx={{ position: "absolute", inset: 0, backgroundImage: `url(${mainEntry?.cover_image})`, backgroundSize: 'cover', backgroundPosition: 'center', transition: "transform 0.4s", ".MuiPaper-root:hover &": { transform: "scale(1.05)" } }} />
                          <Box sx={{ position: "absolute", inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 40%)', display: 'flex', alignItems: 'flex-end', p: 1 }}>
                            <Typography variant="caption" sx={{ color: '#fff', fontWeight: 700, bgcolor: 'rgba(0,0,0,0.6)', px: 0.75, py: 0.25, borderRadius: 1, backdropFilter: 'blur(4px)', display: "inline-block", fontSize: "0.65rem" }}>
                              {mainEntry?.status === 'CURRENT' && mainEntry.episodes_watched ? `Ep ${mainEntry.episodes_watched}` : `${mainEntry.episodes_watched || 0}/${mainEntry.episodes_total || '?'} Eps`}
                            </Typography>
                          </Box>
                        </Box>
                        <Box sx={{ p: 1.5, display: "flex", flexDirection: "column", flex: 1, justifyContent: "space-between" }}>
                          <Typography variant="body2" sx={{ fontWeight: 800, fontFamily: 'var(--font-epilogue)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.2, mb: 1 }}>
                            {group.canonical_title}
                          </Typography>
                          <Box>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, fontSize: "0.65rem" }}>
                                {group.progress.percentage}%
                              </Typography>
                              <PlayCircleFilledRoundedIcon color="primary" sx={{ fontSize: 16, opacity: 0.9 }} />
                            </Stack>
                            <LinearProgress
                              variant="determinate"
                              value={group.progress.percentage || 0}
                              sx={{ height: 4, borderRadius: 2, '& .MuiLinearProgress-bar': { borderRadius: 2, background: (t) => `linear-gradient(90deg, ${t.palette.primary.main}, ${t.palette.secondary.main})` } }}
                            />
                          </Box>
                        </Box>
                      </Paper>
                    )
                  })}
                </Box>
              </Box>
            )}

            {/* ── Aura Selections (Plan to Watch) ── */}
            {planningGroups.length > 0 && (
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 800, fontFamily: 'var(--font-epilogue)', mb: 2 }}>
                  Aura Selections
                </Typography>
                <Box sx={{
                  display: 'flex', gap: 2, overflowX: 'auto', pb: 2, px: 0.5, mx: -0.5,
                  scrollSnapType: 'x mandatory',
                  '&::-webkit-scrollbar': { display: 'none' },
                  scrollbarWidth: 'none',
                }}>
                  {planningGroups.map(group => {
                    const mainEntry = group.main_timeline.find(e => e.status === "PLANNING") || group.main_timeline[0];
                    return (
                      <Box
                        key={`aura-${group.franchise_id}`}
                        onClick={() => {
                          document.getElementById('library-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          setExpandedId(group.franchise_id);
                        }}
                        sx={{
                          width: 160, flexShrink: 0, scrollSnapAlign: 'start', cursor: 'pointer',
                          borderRadius: 3, overflow: 'hidden', position: 'relative',
                          transition: 'transform 0.2s, box-shadow 0.2s',
                          '&:hover': {
                            transform: 'translateY(-4px)',
                            boxShadow: (t) => t.shadows[8],
                          }
                        }}
                      >
                        <Box sx={{ width: '100%', paddingTop: '140%', position: 'relative', overflow: 'hidden', borderRadius: 3 }}>
                          <Box sx={{
                            position: 'absolute', inset: 0,
                            backgroundImage: `url(${mainEntry?.cover_image})`, backgroundSize: 'cover', backgroundPosition: 'center',
                            transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                            bgcolor: 'action.disabledBackground',
                            '.MuiBox-root:hover &': { transform: 'scale(1.05)' }
                          }} component="div" />
                          <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 60%)' }} />
                          <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, p: 1.5 }}>
                            <Typography variant="body2" sx={{ color: '#fff', fontWeight: 700, lineHeight: 1.2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                              {group.canonical_title}
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                    )
                  })}
                </Box>
              </Box>
            )}

            <Box id="library-section" sx={{ pt: 4, mt: 4, borderTop: '1px solid', borderColor: 'divider' }}>
              <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ mb: 3 }}>
                <Box
                  sx={(theme) => ({
                    width: 38,
                    height: 38,
                    borderRadius: 2.5,
                    display: "grid",
                    placeItems: "center",
                    bgcolor: alpha(theme.palette.primary.main, 0.12),
                    color: "primary.main",
                    flexShrink: 0,
                  })}
                >
                  <TuneRoundedIcon sx={{ fontSize: 20 }} />
                </Box>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 800, fontFamily: 'var(--font-epilogue)', lineHeight: 1.1 }}>
                    Franchise Library
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Expand any franchise card for timeline details and manual overrides.
                  </Typography>
                </Box>
              </Stack>

              {/* ── Search + Filter Toolbar ── */}
              <Paper
                sx={(t) => ({
                  borderRadius: 2.5,
                  p: 2,
                  border: `1px solid`,
                  borderColor: t.palette.mode === 'dark'
                    ? 'rgba(255,255,255,0.09)'
                    : alpha(t.palette.divider, 0.4),
                  // Level 1 — toolbar sits at surface level
                  bgcolor: t.palette.mode === 'dark'
                    ? '#130d1b'   /* --bg-surface */
                    : 'background.paper',
                  backdropFilter: t.palette.mode === 'dark' ? 'none' : 'blur(12px)',
                })}
              >
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }} justifyContent="space-between">
                  <Box sx={{ overflowX: "auto", pb: 0.5 }}>
                    <ToggleButtonGroup
                      exclusive
                      value={activeFilter}
                      onChange={(_, v: FilterType | null) => { if (v) setActiveFilter(v); }}
                      size="small"
                      sx={{
                        flexWrap: "nowrap",
                        "& .MuiToggleButton-root": {
                          textTransform: "none",
                          fontWeight: 500,
                          fontSize: "0.8rem",
                          py: 0.5,
                          px: { xs: 1.25, sm: 1.5 },
                          whiteSpace: "nowrap",
                        },
                      }}
                    >
                      <ToggleButton value="all">All</ToggleButton>
                      <ToggleButton value="complete">Complete</ToggleButton>
                      <ToggleButton value="in-progress">In Progress</ToggleButton>
                      <ToggleButton value="side_stories">Side Stories</ToggleButton>
                    </ToggleButtonGroup>
                  </Box>

                  <TextField
                    select
                    size="small"
                    value={sortOption}
                    onChange={(e) => setSortOption(e.target.value as SortOption)}
                    sx={{ minWidth: { xs: "100%", sm: 148 } }}
                  >
                    <MenuItem value="az">A to Z</MenuItem>
                    <MenuItem value="za">Z to A</MenuItem>
                    <MenuItem value="pct-high">% High → Low</MenuItem>
                    <MenuItem value="pct-low">% Low → High</MenuItem>
                    <MenuItem value="entries">Most Entries</MenuItem>
                  </TextField>
                </Stack>
              </Paper>

              {/* ── Scan Progress ── */}
              {isScanning && (
                <Paper
                  sx={(theme) => ({
                    borderRadius: 3,
                    p: 2.5,
                    background:
                      theme.palette.mode === "dark"
                        ? `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.08)}, ${alpha(theme.palette.background.paper, 0.8)})`
                        : `linear-gradient(135deg, ${alpha(theme.palette.primary.light, 0.08)}, ${alpha("#FFFFFF", 0.95)})`,
                    border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                  })}
                >
                  <Stack spacing={1.5}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Stack direction="row" spacing={1.25} alignItems="center">
                        <CircularProgress size={20} />
                        <Typography variant="body1" sx={{ fontWeight: 700 }}>
                          Scanning for sequels
                        </Typography>
                      </Stack>
                      {scanProgress.total > 0 && (
                        <Chip
                          size="small"
                          color="primary"
                          label={`${scanProgress.current} / ${scanProgress.total}`}
                        />
                      )}
                    </Stack>

                    {scanProgress.total > 0 && (
                      <LinearProgress
                        variant="determinate"
                        value={Math.round((scanProgress.current / scanProgress.total) * 100)}
                        sx={(theme) => ({
                          borderRadius: 999,
                          height: 6,
                          bgcolor: alpha(theme.palette.primary.main, 0.1),
                          "& .MuiLinearProgress-bar": {
                            borderRadius: 999,
                            background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                          },
                        })}
                      />
                    )}

                    <Typography variant="caption" color="text.secondary">
                      {scanProgress.total === 0
                        ? "Preparing scan..."
                        : scanProgress.current === 0
                          ? "Starting scan..."
                          : scanProgress.current >= scanProgress.total
                            ? "Almost done..."
                            : "Checking your completed anime for available sequels."}
                    </Typography>
                  </Stack>
                </Paper>
              )}

              {/* ── Sequel Alerts Removed to Dedicated Route ── */}

              {/* ── Franchise Library ── */}
              <Stack spacing={2}>
                {isLoading ? (
                  <Stack spacing={3}>
                    <Box>
                      <Typography variant="body1" sx={{ fontWeight: 700, mb: 0.5 }}>
                        Loading your library...
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Building franchise timelines and sequel suggestions.
                      </Typography>
                    </Box>

                    <Stack spacing={1.5}>
                      <SequelAlertCardSkeleton />
                      <SequelAlertCardSkeleton />
                    </Stack>

                    <Stack spacing={2}>
                      <FranchiseCardSkeleton />
                      <FranchiseCardSkeleton />
                      <FranchiseCardSkeleton />
                    </Stack>
                  </Stack>
                ) : error && !snapshot ? (
                  <Paper sx={{ borderRadius: 3, p: 5 }}>
                    <Stack spacing={2} alignItems="center" textAlign="center">
                      <Alert severity="error" sx={{ maxWidth: 520, width: "100%" }}>
                        {errorMessage}
                      </Alert>
                      <Button onClick={() => refetch()} variant="contained">
                        Retry
                      </Button>
                    </Stack>
                  </Paper>
                ) : sortedGroups.length > 0 ? (
                  <Stack spacing={2.5}>
                    {/* Secondary library header removed to fix clutter */}
                    {sortedGroups.slice(0, visibleCount).map((franchise) => (
                      <FranchiseCard
                        key={franchise.franchise_id}
                        franchise={franchise}
                        isExpanded={expandedId === franchise.franchise_id}
                        onExpand={handleExpand}
                        franchiseOptions={franchiseOptions}
                        overrideTargets={overrideTargets}
                        savingEntryId={overrideSavingEntryId}
                        onSaveOverride={handleSaveOverride}
                        onBlacklistFranchise={handleBlacklistFranchise}
                        onBlacklistEntry={handleBlacklistEntry}
                        blacklistingId={blacklistingId}
                      />
                    ))}
                    {visibleCount < sortedGroups.length && (
                      <Box ref={loadMoreRef} sx={{ py: 3, display: 'flex', justifyContent: 'center' }}>
                        <CircularProgress size={24} />
                      </Box>
                    )}
                  </Stack>
                ) : (
                  <Paper sx={{ borderRadius: 3, p: 6 }}>
                    <Stack spacing={1.5} alignItems="center" textAlign="center">
                      <SearchRoundedIcon color="primary" sx={{ fontSize: 40 }} />
                      <Typography variant="h6" sx={{ fontWeight: 800 }}>
                        {searchTerm.length > 0
                          ? "No franchises match your search"
                          : "Your library appears to be empty"}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Try a broader search or refresh your synced library.
                      </Typography>
                    </Stack>
                  </Paper>
                )}
              </Stack>
            </Box>

            {/* ── Blacklist Manager ── */}
            {blacklist.length > 0 && (
              <Box sx={{ mt: 8, pt: 4, borderTop: "1px solid", borderColor: "divider" }}>
                <Stack spacing={2}>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Box
                      sx={(theme) => ({
                        width: 32,
                        height: 32,
                        borderRadius: 1.5,
                        display: "grid",
                        placeItems: "center",
                        bgcolor: alpha(theme.palette.error.main, 0.1),
                        color: "error.main",
                      })}
                    >
                      <ListAltRoundedIcon sx={{ fontSize: 16 }} />
                    </Box>
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                        Ignored Items
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        These franchises and entries will detect but will not show up in your "What to Watch Next" alerts.
                      </Typography>
                    </Box>
                  </Stack>

                  <Grid container spacing={1}>
                    {blacklist.map((item) => (
                      <Grid key={item.targetId} size={{ xs: 12, sm: 6, md: 4 }}>
                        <Paper
                          variant="outlined"
                          sx={{
                            p: 1.5,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            borderRadius: 2,
                            bgcolor: (t) => alpha(t.palette.background.default, 0.5),
                          }}
                        >
                          <Box sx={{ minWidth: 0, mr: 1, flex: 1 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap title={item.title}>
                              {item.title}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {item.type === "franchise" ? "Whole Franchise" : "Specific Sequel"}
                            </Typography>
                          </Box>
                          <Button
                            size="small"
                            color="inherit"
                            onClick={() => handleRemoveBlacklist(item.targetId)}
                            sx={{ minWidth: 0, p: 0.5, px: 1, borderRadius: 1, textTransform: "none", fontSize: "0.75rem" }}
                          >
                            Restore
                          </Button>
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                </Stack>
              </Box>
            )}
          </Stack>
        </Container>
      </Box >
    </>
  );
}

/* ── Page Export (Suspense boundary for useSearchParams) ── */
export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: "100dvh",
            display: "grid",
            placeItems: "center",
          }}
        />
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
