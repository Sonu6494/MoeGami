"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useAnimeStore } from "@/store/useAnimeStore";
import { fetchAndNormalise } from "@/lib/anilist";
import { buildFranchiseGroups } from "@/lib/grouping";
import Navbar from "@/components/layout/Navbar";
import FranchiseCard from "@/components/ui/FranchiseCard";
import SequelAlertCard from "@/components/ui/SequelAlertCard";
import { scanForSequels } from "@/lib/sequelScanner";
import type { NormalisedEntry } from "@/lib/types";

type FilterType = "all" | "complete" | "in-progress" | "side_stories";
type SortOption = "az" | "za" | "pct-high" | "pct-low" | "entries";

export default function DashboardPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [sortOption, setSortOption] = useState<SortOption>("az");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sequelFilter, setSequelFilter] = useState('all');
  const [showAllSequels, setShowAllSequels] = useState(false);
  const [scanProgress, setScanProgress] = useState({ current: 0, total: 0 });

  const username = useAnimeStore((s) => s.username);
  const platform = useAnimeStore((s) => s.platform);
  const setPlatform = useAnimeStore((s) => s.setPlatform);
  const theme = useAnimeStore((s) => s.theme);
  const setRawEntries = useAnimeStore((s) => s.setRawEntries);
  const setFranchiseGroups = useAnimeStore((s) => s.setFranchiseGroups);
  const { sequelAlerts, setSequelAlerts, isScanning, setIsScanning } = useAnimeStore();
  const setError = useAnimeStore((s) => s.setError);
  const searchParams = useSearchParams();

  useEffect(() => {
    // Check if platform is passed in URL (redirect from MAL)
    const p = searchParams.get("platform");
    if (p === "mal") {
      setPlatform("MAL");
    }

    if (!username && p !== "mal") {
      router.replace("/");
    }
  }, [username, router, searchParams, setPlatform]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["anime-list", platform, username],
    queryFn: async (): Promise<NormalisedEntry[]> => {
      if (platform === "MAL") {
        const response = await fetch("/api/auth/mal/list");
        if (!response.ok) {
          const err = await response.json();
          if (err.error === "Not authenticated with MAL") {
            router.push("/");
            return [];
          }
          throw new Error(err.error ?? "MAL fetch failed");
        }
        const json = await response.json();
        return json.entries;
      } else {
        if (!username) return [];
        return fetchAndNormalise(username);
      }
    },
    enabled: platform === "MAL" || !!username,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const groups = useMemo(() => {
    if (!data || data.length === 0) return [];
    return buildFranchiseGroups(data);
  }, [data]);

  // Debug One Piece
  useEffect(() => {
    if (groups.length === 0) return;

    const op = groups.find(
      (f) =>
        f.main_timeline.some((e) => e.title.toLowerCase().includes("piece")) ||
        f.canonical_title.toLowerCase().includes("piece")
    );
    console.log("One Piece group:", op?.canonical_title);
    console.log(
      "One Piece MAIN:",
      op?.main_timeline.map((e) => `[${e.type}] ${e.title}`)
    );
    console.log(
      "One Piece SIDE:",
      op?.side_stories.map((e) => `[${e.type}] ${e.title}`)
    );
  }, [groups]);

  // Debug Re:Zero Splitting
  useEffect(() => {
    if (groups.length === 0) return;

    const reZeroGroups = groups.filter(
      (f) =>
        f.canonical_title.toLowerCase().includes("zero") ||
        f.main_timeline.some((e) => e.title.toLowerCase().includes("re:zero"))
    );

    console.log(`Re:Zero groups found: ${reZeroGroups.length}`);
    reZeroGroups.forEach((g) => {
      console.log(`\nGroup: "${g.canonical_title}"`);
      console.log(
        "Main:",
        g.main_timeline.map((e) => `[${e.type}] ${e.title}`)
      );
      console.log("Relations of first entry:", g.main_timeline[0]?.relations);
    });
  }, [groups]);

  const filteredGroups = useMemo(() => {
    return groups.filter((group) => {
      const query = searchTerm.toLowerCase().replace(/[-\s]+/g, " ").trim();
      if (query.length === 0) {
        if (activeFilter === "complete") return group.progress.percentage === 100;
        if (activeFilter === "in-progress")
          return group.progress.percentage > 0 && group.progress.percentage < 100;
        if (activeFilter === "side_stories") return group.side_stories.length > 0;
        return true;
      }

      const title = group.canonical_title
        .toLowerCase()
        .replace(/[-\s]+/g, " ")
        .trim();

      const searchMatch =
        title.includes(query) ||
        group.main_timeline.some((e) =>
          e.title.toLowerCase().replace(/[-\s]+/g, " ").includes(query)
        );

      if (!searchMatch) return false;

      if (activeFilter === "complete") return group.progress.percentage === 100;
      if (activeFilter === "in-progress")
        return group.progress.percentage > 0 && group.progress.percentage < 100;
      if (activeFilter === "side_stories") return group.side_stories.length > 0;

      return true;
    });
  }, [groups, searchTerm, activeFilter]);

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
    const franchises = groups.length;
    const completed = groups.filter((g) => g.progress.percentage === 100).length;
    const inProgress = groups.filter(
      (g) => g.progress.percentage > 0 && g.progress.percentage < 100
    ).length;
    const entries = data?.length ?? 0;

    return { franchises, completed, inProgress, entries };
  }, [groups, data]);

  useEffect(() => {
    if (!data) return;
    setRawEntries(data);
    setFranchiseGroups(groups);
  }, [data, groups, setRawEntries, setFranchiseGroups]);

  useEffect(() => {
    if (error) {
      setError(error.message);
    }
  }, [error, setError]);

  // Run sequel scan after franchise groups are ready
  useEffect(() => {
    if (groups.length === 0) return;
    if (sequelAlerts.length > 0) return; // already scanned this session

    const runScan = async () => {
      setIsScanning(true);
      try {
        const allIds = new Set<number>();
        const allEntriesMap = new Map<number, NormalisedEntry>();

        groups.forEach((f) => {
          [...f.main_timeline, ...f.side_stories].forEach((e) => {
            allIds.add(e.platform_id);
            allEntriesMap.set(e.platform_id, e);
          });
        });

        const alerts = await scanForSequels(
          groups,
          allIds,
          allEntriesMap, // ← new parameter
          (current, total) => setScanProgress({ current, total }) // ← add this
        );
        setSequelAlerts(alerts);
        console.log(`Sequel scan complete: ${alerts.length} alerts found`);
      } catch (err) {
        console.error("Sequel scan failed:", err);
      } finally {
        setIsScanning(false);
      }
    };

    runScan();
  }, [groups, sequelAlerts.length, setSequelAlerts, setIsScanning]);

  if (!username) return null;

  return (
    <>
      <Navbar />

      <main className="mx-auto max-w-5xl px-4 pb-16 pt-20">
        {/* Stats bar — 2x2 on mobile, 4x1 on desktop */}
        <div
          className="rounded-2xl p-4 my-6 grid grid-cols-2 md:grid-cols-4 gap-3"
          style={{
            backgroundColor: "var(--bg-surface)",
            border: "1px solid var(--border)",
          }}
        >
          {[
            { value: stats.franchises, label: "Franchises" },
            { value: stats.completed, label: "Completed" },
            { value: stats.inProgress, label: "In Progress" },
            { value: stats.entries, label: "Entries" },
          ].map((stat) => (
            <div key={stat.label} className="flex flex-col items-center py-2">
              <span
                className="text-2xl font-bold"
                style={{
                  color: "var(--accent)",
                  fontFamily: "'Bebas Neue', sans-serif",
                }}
              >
                {stat.value}
              </span>
              <span
                className="text-xs mt-0.5 tracking-wide uppercase"
                style={{ color: "var(--text-secondary)" }}
              >
                {stat.label}
              </span>
            </div>
          ))}
        </div>

        {/* Search + filters */}
        <div className="glass mb-8 rounded-2xl p-6">
          <div className="flex items-center gap-3 border-b border-white/10 pb-4">
            <svg
              className="h-5 w-5 text-[var(--text-secondary)]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search your library..."
              className="w-full bg-transparent text-lg text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)]/50"
            />
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-2">
              {(["all", "complete", "in-progress", "side_stories"] as FilterType[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className={`cursor-pointer rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
                    activeFilter === f
                      ? "bg-[var(--accent)] text-white shadow-lg shadow-[var(--accent)]/20"
                      : "glass text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  {f === "all"
                    ? "All"
                    : f === "complete"
                    ? "Complete ✓"
                    : f === "in-progress"
                    ? "In Progress"
                    : "Side Stories"}
                </button>
              ))}
            </div>

            <div className="relative">
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as SortOption)}
                className="glass cursor-pointer appearance-none rounded-full py-1.5 pl-4 pr-10 text-xs font-medium text-[var(--text-secondary)] outline-none hover:text-[var(--text-primary)]"
              >
                <option value="az">A → Z</option>
                <option value="za">Z → A</option>
                <option value="pct-high">% High → Low</option>
                <option value="pct-low">% Low → High</option>
                <option value="entries">Most Entries</option>
              </select>
              <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]">
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Sequel Scanner Section */}
        {isScanning && (
          <div
            className="rounded-2xl p-4 mb-6"
            style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)" }}
          >
            {/* Top row */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div
                  className="w-4 h-4 rounded-full border-2 animate-spin flex-shrink-0"
                  style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }}
                />
                <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                  Scanning for sequels
                </p>
              </div>

              {/* Right side: count + percentage */}
              <div className="flex items-center gap-2">
                {scanProgress.total > 0 && (
                  <>
                    <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                      {scanProgress.current} / {scanProgress.total} entries
                    </span>
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: "var(--accent-light)", color: "var(--accent)" }}
                    >
                      {Math.round((scanProgress.current / scanProgress.total) * 100)}%
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Progress bar */}
            {scanProgress.total > 0 && (
              <div
                className="w-full h-1.5 rounded-full overflow-hidden"
                style={{ backgroundColor: "var(--border)" }}
              >
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: `${Math.round((scanProgress.current / scanProgress.total) * 100)}%`,
                    background: "linear-gradient(90deg, var(--accent), #8B85FF)",
                  }}
                />
              </div>
            )}

            {/* Subtitle */}
            <p className="text-xs mt-2" style={{ color: "var(--text-secondary)" }}>
              {scanProgress.total === 0
                ? "Preparing scan..."
                : scanProgress.current === 0
                ? "Starting scan..."
                : scanProgress.current >= scanProgress.total
                ? "Almost done..."
                : `Checking your completed anime for available sequels`}
            </p>
          </div>
        )}

        {!isScanning && sequelAlerts.length > 0 && (
          <div className="mb-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">🔍</span>
                <h2 className="font-bold text-base" style={{ color: "var(--text-primary)" }}>
                  What to Watch Next
                </h2>
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-semibold"
                  style={{ backgroundColor: "rgba(108,99,255,0.15)", color: "var(--accent)" }}
                >
                  {sequelAlerts.filter((a) => a.alert_status === "available").length} available
                </span>
              </div>
              {/* Filter tabs */}
              <div className="flex gap-1">
                {["All", "Available", "Upcoming"].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setSequelFilter(tab.toLowerCase())}
                    className="text-xs px-3 py-1 rounded-full transition-all"
                    style={{
                      backgroundColor:
                        sequelFilter === tab.toLowerCase() ? "var(--accent)" : "var(--bg-elevated)",
                      color: sequelFilter === tab.toLowerCase() ? "#fff" : "var(--text-secondary)",
                    }}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Alert cards */}
            <div className="flex flex-col gap-2">
              {sequelAlerts
                .filter((a) => {
                  if (sequelFilter === "available") return a.alert_status === "available";
                  if (sequelFilter === "upcoming") return a.alert_status === "upcoming";
                  return true;
                })
                .slice(0, showAllSequels ? undefined : 5)
                .map((alert, i) => (
                  <SequelAlertCard key={`${alert.franchise_id}-${i}`} alert={alert} />
                ))}
            </div>

            {/* Show more */}
            {sequelAlerts.length > 5 && (
              <button
                onClick={() => setShowAllSequels((s) => !s)}
                className="w-full mt-2 py-2 text-xs rounded-xl transition-all"
                style={{ color: "var(--text-secondary)", backgroundColor: "var(--bg-elevated)" }}
              >
                {showAllSequels ? "Show less ↑" : `Show ${sequelAlerts.length - 5} more ↓`}
              </button>
            )}
          </div>
        )}

        {/* Franchise list */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
              <p className="animate-pulse text-sm text-[var(--text-secondary)]">
                Fetching your library...
              </p>
            </div>
          ) : error ? (
            <div className="glass flex flex-col items-center justify-center gap-4 rounded-2xl border-red-500/20 p-12 text-center">
              <div className="rounded-full bg-red-500/10 p-4 text-red-500">
                <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-red-100">Load Error</h3>
                <p className="mt-2 text-sm text-red-100/60 max-w-xs">{error.message}</p>
              </div>
              <button
                onClick={() => refetch()}
                className="mt-4 cursor-pointer rounded-full bg-red-500 px-8 py-2 text-xs font-bold text-white transition-all hover:bg-red-600"
              >
                Retry
              </button>
            </div>
          ) : sortedGroups.length > 0 ? (
            <div className="flex flex-col gap-4">
              {sortedGroups.map((franchise) => (
                <FranchiseCard
                  key={franchise.franchise_id}
                  franchise={franchise}
                  isExpanded={expandedId === franchise.franchise_id}
                  onExpand={(id) => setExpandedId((prev) => (prev === id ? null : id))}
                />
              ))}
            </div>
          ) : (
            <div className="glass flex min-h-[300px] flex-col items-center justify-center rounded-2xl p-8 text-center">
              <span className="text-4xl mb-4">🔍</span>
              <p className="text-[var(--text-secondary)]">
                {searchTerm.length > 0
                  ? "No franchises match your search"
                  : "Your library appears to be empty"}
              </p>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
