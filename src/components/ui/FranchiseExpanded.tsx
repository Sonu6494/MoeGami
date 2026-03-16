"use client";

import Image from "next/image";
import type { FranchiseGroup, NormalisedEntry } from "@/lib/types";
import ProgressBar from "./ProgressBar";

interface FranchiseExpandedProps {
  group: FranchiseGroup;
  onClose: () => void;
}

function EntryRow({ entry }: { entry: NormalisedEntry }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-white/[0.03] px-3 py-2">
      <div className="relative h-12 w-8 shrink-0 overflow-hidden rounded-lg">
        <Image
          src={entry.cover_image}
          alt={entry.title}
          fill
          className="object-cover"
          sizes="32px"
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white truncate">
          {entry.title}
        </p>
        <p className="text-xs text-[#9E9E9E]">
          {entry.type} · {entry.start_year ?? "TBA"}
          {entry.score > 0 && ` · ★ ${entry.score}`}
        </p>
      </div>
      <span
        className="text-xs font-medium px-2 py-0.5 rounded-full"
        style={{
          backgroundColor: entry.user_completed
            ? "rgba(76, 175, 80, 0.15)"
            : "rgba(108, 99, 255, 0.15)",
          color: entry.user_completed ? "#4CAF50" : "#6C63FF",
        }}
      >
        {entry.user_completed ? "Done" : "Incomplete"}
      </span>
    </div>
  );
}

export default function FranchiseExpanded({ group, onClose }: FranchiseExpandedProps) {
  return (
    <div className="rounded-2xl bg-[#1A1A1A] p-6 shadow-xl shadow-black/30">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex gap-4 min-w-0">
          <div className="relative h-28 w-20 shrink-0 overflow-hidden rounded-xl">
            <Image
              src={group.cover_image}
              alt={group.canonical_title}
              fill
              className="object-cover"
              sizes="80px"
            />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-white truncate">{group.canonical_title}</h2>
            <p className="text-sm text-[#9E9E9E] mt-1">
              {group.progress.main_timeline_completed}/{group.progress.main_timeline_total} main entries completed
            </p>
            <div className="mt-3 w-48">
              <ProgressBar percentage={group.progress.percentage} showLabel />
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-[#9E9E9E] hover:text-white transition-colors p-1 cursor-pointer"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M15 5L5 15M5 5l10 10"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      {/* Main Timeline */}
      {group.main_timeline.length > 0 && (
        <div className="mb-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#9E9E9E] mb-2">
            Main Timeline
          </h3>
          <div className="flex flex-col gap-1.5">
            {group.main_timeline.map((entry) => (
              <EntryRow key={entry.id} entry={entry} />
            ))}
          </div>
        </div>
      )}

      {/* Side Stories */}
      {group.side_stories.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#9E9E9E] mb-2">
            Side Stories
          </h3>
          <div className="flex flex-col gap-1.5">
            {group.side_stories.map((entry) => (
              <EntryRow key={entry.id} entry={entry} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
