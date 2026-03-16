'use client'

import { useState } from 'react'
import type { FranchiseGroup, NormalisedEntry } from '@/lib/types'

// ── Relation badge config ─────────────────────────────

const RELATION_BADGES: Record<string, { label: string; className: string }> = {
  SIDE_STORY: { label: 'SIDE STORY', className: 'bg-blue-500/15 text-blue-400 border border-blue-500/20' },
  SUMMARY: { label: 'SUMMARY', className: 'bg-gray-500/15 text-gray-400 border border-gray-500/20' },
  SPIN_OFF: { label: 'SPIN OFF', className: 'bg-orange-500/15 text-orange-400 border border-orange-500/20' },
  PREQUEL: { label: 'PREQUEL', className: 'bg-purple-500/15 text-purple-400 border border-purple-500/20' },
  ALTERNATIVE_VERSION: { label: 'ALT VERSION', className: 'bg-pink-500/15 text-pink-400 border border-pink-500/20' },
  ALTERNATIVE_SETTING: { label: 'ALT SETTING', className: 'bg-pink-500/15 text-pink-400 border border-pink-500/20' },
}

const TYPE_COLORS: Record<string, string> = {
  TV: 'bg-[#6C63FF]/20 text-[#8B85FF]',
  TV_SHORT: 'bg-[#6C63FF]/20 text-[#8B85FF]',
  MOVIE: 'bg-cyan-500/20 text-cyan-400',
  OVA: 'bg-yellow-500/20 text-yellow-400',
  ONA: 'bg-green-500/20 text-green-400',
  SPECIAL: 'bg-rose-500/20 text-rose-400',
  MUSIC: 'bg-pink-500/20 text-pink-400',
}

// ── Helper functions ──────────────────────────────────

function getRelationBadge(
  entry: NormalisedEntry,
  allGroupEntries: NormalisedEntry[],
) {
  const rel = entry.relations.find((r) =>
    allGroupEntries.some((ge) => ge.platform_id === r.id),
  )
  if (!rel) return null
  return RELATION_BADGES[rel.relationType] ?? null
}

function getStatusIcon(entry: NormalisedEntry) {
  if (entry.user_completed) {
    return (
      <span className="flex items-center justify-center w-5 h-5 rounded-md bg-[#4CAF50]/20 text-[#4CAF50] text-xs flex-shrink-0">
        ✓
      </span>
    )
  }
  if (entry.status === 'CURRENT') {
    return (
      <span className="flex items-center justify-center w-5 h-5 rounded-md bg-blue-500/20 text-blue-400 text-xs flex-shrink-0">
        ▶
      </span>
    )
  }
  if (entry.status === 'PAUSED') {
    return (
      <span className="flex items-center justify-center w-5 h-5 rounded-md bg-orange-500/20 text-orange-400 text-xs flex-shrink-0">
        ⏸
      </span>
    )
  }
  if (entry.status === 'DROPPED') {
    return (
      <span className="flex items-center justify-center w-5 h-5 rounded-md bg-red-500/20 text-red-400 text-xs flex-shrink-0">
        ✕
      </span>
    )
  }
  return (
    <span className="flex items-center justify-center w-5 h-5 rounded-md bg-white/5 text-[#9E9E9E] text-xs flex-shrink-0">
      ○
    </span>
  )
}

function ProgressBar({
  percentage,
  fullyCompleted,
  size = 'sm',
}: {
  percentage: number
  fullyCompleted?: boolean
  size?: 'sm' | 'md'
}) {
  const height = size === 'sm' ? 'h-1' : 'h-1.5'

  const fill =
    fullyCompleted
      ? 'linear-gradient(90deg, #FFD700, #FFA500)'
      : percentage === 100
        ? '#4CAF50'
        : 'linear-gradient(90deg, #6C63FF, #8B85FF)'

  return (
    <div className={`w-full ${height} rounded-full overflow-hidden`}
      style={{ backgroundColor: 'var(--border)' }}>
      <div
        className={`${height} rounded-full transition-all duration-700 ease-out`}
        style={{
          width: `${Math.max(percentage, percentage > 0 ? 2 : 0)}%`,
          background: fill,
        }}
      />
    </div>
  )
}

// ── Entry Row ─────────────────────────────────────────

function EntryRow({
  entry,
  index,
  allGroupEntries,
  showRelationBadge = false,
}: {
  entry: NormalisedEntry
  index: number
  allGroupEntries: NormalisedEntry[]
  showRelationBadge?: boolean
}) {
  const badge = showRelationBadge ? getRelationBadge(entry, allGroupEntries) : null
  const typeColor = TYPE_COLORS[entry.type] ?? 'bg-white/10 text-[#9E9E9E]'

  return (
    <div
      className="flex items-start gap-3 py-2.5 border-t"
      style={{ borderColor: "var(--border)" }}
    >
      {/* Status icon */}
      {getStatusIcon(entry)}

      {/* Number */}
      <span
        className="text-xs font-mono w-5 text-right flex-shrink-0 mt-0.5"
        style={{ color: "var(--accent)", opacity: 0.6 }}
      >
        {index}.
      </span>

      {/* Title + year */}
      <div className="flex-1 min-w-0">
        <p
          className="text-sm leading-snug truncate"
          style={{
            color: entry.user_completed ? "var(--text-primary)" : "var(--text-secondary)",
          }}
        >
          {entry.title}
        </p>
        <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
          {entry.start_year ?? "—"}
          {entry.score > 0 && (
            <span className="ml-2 text-yellow-500/80">★ {entry.score}</span>
          )}
        </p>
      </div>

      {/* Badges */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {badge && (
          <span className={`text-[10px] font-semibold tracking-wide px-1.5 py-0.5 rounded-md ${badge.className}`}>
            {badge.label}
          </span>
        )}
        <span className={`text-[10px] font-semibold tracking-wide px-1.5 py-0.5 rounded-md ${typeColor}`}>
          {entry.type.replace('_', ' ')}
        </span>
      </div>
    </div>
  )
}

// ── Main FranchiseCard ────────────────────────────────

interface FranchiseCardProps {
  franchise: FranchiseGroup
  isExpanded: boolean
  onExpand: (id: string) => void
}

export default function FranchiseCard({
  franchise,
  isExpanded,
  onExpand,
}: FranchiseCardProps) {
  const { progress } = franchise
  const allEntries = [...franchise.main_timeline, ...franchise.side_stories]

  const progressBadge = () => {
    const badgeBase =
      "text-[11px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap";

    if (progress.fully_completed) {
      return (
        <span
          className={badgeBase}
          style={{
            background: "linear-gradient(90deg,#FFD700,#FFA500)",
            color: "#000",
          }}
        >
          ★ Full
        </span>
      );
    }
    if (progress.percentage === 100) {
      return (
        <span
          className={badgeBase}
          style={{
            backgroundColor: "rgba(76,175,80,0.15)",
            color: "#4CAF50",
            border: "1px solid rgba(76,175,80,0.3)",
          }}
        >
          ✓ Done
        </span>
      );
    }
    return (
      <span
        className="text-sm font-bold flex-shrink-0"
        style={{ color: "var(--accent)" }}
      >
        {progress.percentage}%
      </span>
    );
  };

  return (
    <div
      className="rounded-2xl overflow-hidden transition-all duration-200 hover:border-[rgba(124,58,237,0.25)] hover:shadow-[var(--shadow-md)]"
      style={{
        backgroundColor: "var(--bg-surface)",
        boxShadow: isExpanded ? "var(--shadow-lg)" : "var(--shadow-sm)",
        border: "1px solid var(--border)",
      }}
    >
      {/* ── Collapsed header ── */}
      <button
        onClick={() => onExpand(franchise.franchise_id)}
        className="group/card w-full p-4 text-left hover:bg-white/2 transition-colors duration-150"
        aria-expanded={isExpanded}
      >
        <div className="flex items-start gap-4">
          {/* Cover image */}
          <div className="flex-shrink-0 w-14 h-20 rounded-xl overflow-hidden bg-white/5 shadow-inner">
            {franchise.cover_image ? (
              <img
                src={franchise.cover_image}
                alt={franchise.canonical_title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover/card:scale-110"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white/20 text-2xl font-display">
                ?
              </div>
            )}
          </div>

          {/* Content — stacks differently on mobile vs desktop */}
          <div className="flex-1 min-w-0">
            {/* Title row */}
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <h3
                className="font-semibold text-sm md:text-base leading-snug"
                style={{
                  color: "var(--text-primary)",
                  // Allow 2 lines on mobile, 1 line on desktop
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {franchise.canonical_title}
                {franchise.is_donghua && <span className="ml-1 text-xs">🇨🇳</span>}
              </h3>

              {/* Badge + chevron — always right aligned */}
              <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                {progressBadge()}
                <span
                  className="transition-transform duration-300 flex-shrink-0"
                  style={{
                    transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                    color: "var(--text-secondary)",
                    display: "inline-block",
                  }}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </span>
              </div>
            </div>

            {/* Entry count chips */}
            <div className="flex items-center gap-1.5 mb-2">
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: "var(--accent-light)",
                  color: "var(--accent)",
                }}
              >
                {franchise.main_timeline.length} main
              </span>
              {franchise.side_stories.length > 0 && (
                <span
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: "var(--bg-elevated)",
                    color: "var(--text-secondary)",
                  }}
                >
                  {franchise.side_stories.length} side
                </span>
              )}
            </div>

            {/* Progress bar */}
            <ProgressBar
              percentage={progress.percentage}
              fullyCompleted={progress.fully_completed}
              size="sm"
            />
          </div>
        </div>
      </button>

      {/* ── Expanded content ── */}
      {isExpanded && (
        <div className="px-4 pb-4" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          {/* MAIN TIMELINE */}
          <div className="mt-4">
            <p
              className="text-[10px] font-bold tracking-[0.2em] mb-2 uppercase"
              style={{ color: "var(--accent)" }}
            >
              Main Timeline
            </p>
            <div className="space-y-1">
              {franchise.main_timeline.map((entry, i) => (
                <EntryRow
                  key={entry.platform_id}
                  entry={entry}
                  index={i + 1}
                  allGroupEntries={allEntries}
                  showRelationBadge={false}
                />
              ))}
            </div>
          </div>

          {/* SIDE STORIES */}
          {franchise.side_stories.length > 0 && (
            <div className="mt-6">
              <p className="text-[10px] font-bold tracking-[0.2em] mb-2 uppercase text-[var(--text-muted)]">
                Side Stories
              </p>
              <div className="space-y-1 opacity-90">
                {franchise.side_stories.map((entry, i) => (
                  <EntryRow
                    key={entry.platform_id}
                    entry={entry}
                    index={i + 1}
                    allGroupEntries={allEntries}
                    showRelationBadge={true}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Progress summary */}
          <div className="mt-6 pt-4 border-t border-white/5">
            <div className="flex items-center justify-between mb-2 px-1">
              <p className="text-[10px] md:text-xs text-[var(--text-secondary)]">
                {progress.main_timeline_completed} of {progress.main_timeline_total} main entries
                complete
              </p>
              <p
                className="text-xs font-bold"
                style={{ color: progress.percentage === 100 ? "#4CAF50" : "#8B85FF" }}
              >
                {progress.percentage}%
              </p>
            </div>
            <ProgressBar
              percentage={progress.percentage}
              fullyCompleted={progress.fully_completed}
              size="md"
            />
          </div>
        </div>
      )}
    </div>
  )
}