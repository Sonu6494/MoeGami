"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useAnimeStore } from "@/store/useAnimeStore";
import { fetchAndNormalise } from "@/lib/anilist";
import { buildFranchiseGroups } from "@/lib/grouping";
import Navbar from "@/components/layout/Navbar";
import FranchiseCard from "@/components/ui/FranchiseCard";

type FilterType = "all" | "complete" | "in-progress" | "side_stories";
type SortOption = "az" | "za" | "pct-high" | "pct-low" | "entries";

export default function DashboardPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [sortOption, setSortOption] = useState<SortOption>("az");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const username = useAnimeStore((s) => s.username);
  const theme = useAnimeStore((s) => s.theme);
  const setRawEntries = useAnimeStore((s) => s.setRawEntries);
  const setFranchiseGroups = useAnimeStore((s) => s.setFranchiseGroups);
  const setError = useAnimeStore((s) => s.setError);

  useEffect(() => {
    if (!username) {
      router.replace("/");
    }
  }, [username, router]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["anime-list", username],
    queryFn: () => fetchAndNormalise(username),
    enabled: !!username,
  });

  const groups = useMemo(() => {
    if (!data || data.length === 0) return [];
    return buildFranchiseGroups(data);
  }, [data]);

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
