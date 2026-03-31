"use client";

import { useState } from "react";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import MovieCreationRoundedIcon from "@mui/icons-material/MovieCreationRounded";
import OndemandVideoRoundedIcon from "@mui/icons-material/OndemandVideoRounded";
import TvRoundedIcon from "@mui/icons-material/TvRounded";
import PlayCircleRoundedIcon from "@mui/icons-material/PlayCircleRounded";
import PauseCircleRoundedIcon from "@mui/icons-material/PauseCircleRounded";
import StopCircleRoundedIcon from "@mui/icons-material/StopCircleRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import {
  Box,
  Button,
  Card,
  Chip,
  Collapse,
  Divider,
  IconButton,
  LinearProgress,
  MenuItem,
  Stack,
  TextField,
  Typography,
  alpha,
} from "@mui/material";
import type { FranchiseGroup, NormalisedEntry } from "@/lib/types";

const RELATION_BADGES: Record<
  string,
  { label: string; color: "primary" | "secondary" | "warning" | "success" | "default" }
> = {
  side_story: { label: "Side Story", color: "primary" },
  summary: { label: "Summary", color: "default" },
  spin_off: { label: "Spin-Off", color: "warning" },
  prequel: { label: "Prequel", color: "secondary" },
  alternative_version: { label: "Alt Version", color: "secondary" },
  alternative_setting: { label: "Alt Setting", color: "secondary" },
  source: { label: "Source", color: "success" },
  compilation: { label: "Compilation", color: "warning" },
};

type FranchiseOption = { id: string; title: string };

interface FranchiseCardProps {
  franchise: FranchiseGroup;
  isExpanded: boolean;
  onExpand: (id: string) => void;
  franchiseOptions: FranchiseOption[];
  overrideTargets: Map<number, string>;
  savingEntryId: number | null;
  onSaveOverride: (entryId: number, targetFranchiseId: string | null) => Promise<void>;
  onBlacklistFranchise: (id: string, title: string) => Promise<void>;
  onBlacklistEntry: (entryId: number, title: string) => Promise<void>;
  blacklistingId: string | number | null;
}

function getRelationBadge(entry: NormalisedEntry, allGroupEntries: NormalisedEntry[]) {
  const relation = entry.relations.find((item) =>
    allGroupEntries.some((ge) => ge.platform_id === item.id)
  );
  if (!relation) return null;
  return RELATION_BADGES[relation.relationType] ?? null;
}

function getStatusMeta(entry: NormalisedEntry) {
  if (entry.user_completed)
    return { label: "Done", color: "success.main", icon: CheckCircleRoundedIcon };
  if (entry.status === "CURRENT")
    return { label: "Watching", color: "secondary.main", icon: PlayCircleRoundedIcon };
  if (entry.status === "PAUSED")
    return { label: "Paused", color: "warning.main", icon: PauseCircleRoundedIcon };
  if (entry.status === "DROPPED")
    return { label: "Dropped", color: "error.main", icon: StopCircleRoundedIcon };
  return { label: "Not watched", color: "text.disabled", icon: OndemandVideoRoundedIcon };
}

function getEntryTypeIcon(entry: NormalisedEntry) {
  if (entry.type === "MOVIE") return <MovieCreationRoundedIcon sx={{ fontSize: "0.85rem" }} />;
  if (entry.type === "TV" || entry.type === "TV_SHORT")
    return <TvRoundedIcon sx={{ fontSize: "0.85rem" }} />;
  return <OndemandVideoRoundedIcon sx={{ fontSize: "0.85rem" }} />;
}

function ProgressBar({
  percentage,
  fullyCompleted,
  hasPendingSequel = false,
}: {
  percentage: number;
  fullyCompleted?: boolean;
  hasPendingSequel?: boolean;
}) {
  return (
    <LinearProgress
      variant="determinate"
      value={Math.max(percentage, percentage > 0 ? 2 : 0)}
      sx={(t) => ({
        // FIX: was 10px — too thick
        height: 5,
        borderRadius: 999,
        bgcolor: alpha(t.palette.primary.main, 0.1),
        "& .MuiLinearProgress-bar": {
          borderRadius: 999,
          background: fullyCompleted
            ? "linear-gradient(90deg, #FFD54F, #FF9800)"
            : percentage === 100 && !hasPendingSequel
              ? t.palette.success.main
              : `linear-gradient(90deg, ${t.palette.primary.main}, ${t.palette.secondary.main})`,
        },
      })}
    />
  );
}

function EntryRow({
  entry,
  index,
  allGroupEntries,
  showRelationBadge = false,
}: {
  entry: NormalisedEntry;
  index: number;
  allGroupEntries: NormalisedEntry[];
  showRelationBadge?: boolean;
}) {
  const badge = showRelationBadge ? getRelationBadge(entry, allGroupEntries) : null;
  const statusMeta = getStatusMeta(entry);
  const StatusIcon = statusMeta.icon;

  return (
    <Stack
      direction="row"
      spacing={1.25}
      alignItems="center"
      sx={{ py: 1, borderTop: "1px solid", borderColor: "divider" }}
    >
      {/* Status icon */}
      <Box sx={{ color: statusMeta.color, display: "grid", placeItems: "center", flexShrink: 0 }}>
        <StatusIcon sx={{ fontSize: 18 }} />
      </Box>

      {/* Index */}
      <Typography variant="caption" color="text.disabled" sx={{ minWidth: 16, flexShrink: 0 }}>
        {index}.
      </Typography>

      {/* Title + year */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          variant="body2"
          sx={{
            fontWeight: 600,
            lineHeight: 1.2,
            // Dim unwatched entries slightly
            opacity: entry.user_completed || entry.status === "CURRENT" ? 1 : 0.7,
          }}
          noWrap
        >
          {entry.title}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {entry.start_year ?? "—"}
          {entry.score > 0 ? ` · ${entry.score}★` : ""}
        </Typography>
      </Box>

      {/* Badges */}
      <Stack direction="row" spacing={0.5} flexShrink={0}>
        {badge && (
          <Chip size="small" color={badge.color} variant="outlined" label={badge.label} />
        )}
        <Chip
          size="small"
          icon={getEntryTypeIcon(entry)}
          variant="outlined"
          label={entry.type.replace("_", " ")}
          sx={{ "& .MuiChip-icon": { ml: "6px" } }}
        />
      </Stack>
    </Stack>
  );
}

function OverrideEntryRow({
  entry,
  currentFranchiseId,
  franchiseOptions,
  activeOverrideTarget,
  isSaving,
  onSaveOverride,
  onBlacklistEntry,
  isBlacklisting,
}: {
  entry: NormalisedEntry;
  currentFranchiseId: string;
  franchiseOptions: FranchiseOption[];
  activeOverrideTarget: string | null;
  isSaving: boolean;
  onSaveOverride: (entryId: number, targetFranchiseId: string | null) => Promise<void>;
  onBlacklistEntry: (entryId: number, title: string) => Promise<void>;
  isBlacklisting: boolean;
}) {
  const [selectedTarget, setSelectedTarget] = useState("");
  const manualTargetId = `manual:${entry.platform_id}`;
  const moveOptions = franchiseOptions.filter(
    (o) => o.id !== currentFranchiseId && o.id !== manualTargetId
  );
  const resolvedTarget = selectedTarget || moveOptions[0]?.id || "";

  return (
    <Card
      variant="outlined"
      sx={(t) => ({
        p: 1.5,
        borderRadius: 2,
        bgcolor:
          t.palette.mode === "dark"
            ? alpha(t.palette.background.default, 0.4)
            : alpha(t.palette.background.default, 0.5),
      })}
    >
      <Stack spacing={1}>
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
            {entry.title}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {activeOverrideTarget ? "Override active" : "Auto grouped"}
          </Typography>
        </Box>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={0.75} alignItems={{ sm: "center" }}>
          <Button
            onClick={() => onSaveOverride(entry.platform_id, manualTargetId)}
            disabled={isSaving || activeOverrideTarget === manualTargetId}
            variant="outlined"
            size="small"
            sx={{ flexShrink: 0 }}
          >
            {activeOverrideTarget === manualTargetId ? "Own Group ✓" : "New Group"}
          </Button>
          <TextField
            select
            size="small"
            fullWidth
            value={resolvedTarget}
            onChange={(e) => setSelectedTarget(e.target.value)}
            disabled={isSaving || moveOptions.length === 0}
          >
            {moveOptions.length === 0 ? (
              <MenuItem value="">No other targets</MenuItem>
            ) : (
              moveOptions.map((o) => (
                <MenuItem key={o.id} value={o.id}>
                  {o.title}
                </MenuItem>
              ))
            )}
          </TextField>
          <Button
            onClick={() => onSaveOverride(entry.platform_id, resolvedTarget)}
            disabled={isSaving || !resolvedTarget}
            variant="contained"
            size="small"
            sx={{ flexShrink: 0 }}
          >
            Move
          </Button>
          <Button
            onClick={() => onSaveOverride(entry.platform_id, null)}
            disabled={isSaving || !activeOverrideTarget}
            variant="text"
            color="inherit"
            size="small"
            sx={{ flexShrink: 0 }}
          >
            Reset
          </Button>

          <Button
            onClick={() => onBlacklistEntry(entry.platform_id, entry.title)}
            disabled={isSaving || isBlacklisting}
            variant="text"
            color="error"
            size="small"
            sx={{ flexShrink: 0, ml: "auto" }}
          >
            Ignore sequels
          </Button>
        </Stack>
      </Stack>
    </Card>
  );
}

export default function FranchiseCard({
  franchise,
  isExpanded,
  onExpand,
  franchiseOptions,
  overrideTargets,
  savingEntryId,
  onSaveOverride,
  onBlacklistFranchise,
  onBlacklistEntry,
  blacklistingId,
}: FranchiseCardProps) {
  const progress = franchise.progress;
  const allEntries = [...franchise.main_timeline, ...franchise.side_stories];

  // FIX: Override panel is hidden by default — power feature, not primary UI
  const [showOverrides, setShowOverrides] = useState(false);

  return (
    <Card
      sx={(t) => ({
        overflow: "hidden",
        borderRadius: 2,
        border: `1px solid ${alpha(t.palette.divider, 0.3)}`,
        transition: "box-shadow 0.2s ease, border-color 0.2s ease",
        // FIX: no translateY — it conflicts with Collapse expand animation
        "&:hover": {
          boxShadow:
            t.palette.mode === "dark"
              ? "0 8px 24px rgba(5,10,20,0.4)"
              : "0 8px 24px rgba(96,74,227,0.1)",
          borderColor: alpha(t.palette.primary.main, 0.25),
        },
      })}
    >
      {/* ── Collapsed header (always visible) ── */}
      <Box
        sx={{ p: 2, cursor: "pointer" }}
        onClick={() => onExpand(franchise.franchise_id)}
      >
        <Stack direction="row" spacing={1.75} alignItems="center">
          {/* Cover */}
          <Box
            sx={(t) => ({
              // FIX: smaller cover — was 180px tall on mobile
              width: 56,
              height: 80,
              borderRadius: 2,
              overflow: "hidden",
              bgcolor: "action.hover",
              flexShrink: 0,
              boxShadow: `0 4px 12px ${alpha(t.palette.primary.main, 0.15)}`,
            })}
          >
            {franchise.cover_image && (
              <Box
                component="img"
                src={franchise.cover_image}
                alt={franchise.canonical_title}
                sx={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            )}
          </Box>

          {/* Content */}
          <Stack sx={{ flex: 1, minWidth: 0 }} spacing={0.75}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={0.75}>
              {/* Give title more room — minWidth 0 is critical */}
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography
                  variant="subtitle1"
                  sx={{
                    fontWeight: 700,
                    lineHeight: 1.2,
                    fontSize: { xs: "0.875rem", sm: "1rem" },
                  }}
                  noWrap
                >
                  {franchise.canonical_title}
                  {franchise.is_donghua && (
                    <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.75 }}>
                      CN
                    </Typography>
                  )}
                </Typography>

                <Stack direction="row" spacing={0.5} mt={0.5} flexWrap="wrap" useFlexGap>
                  <Chip
                    size="small"
                    color="primary"
                    variant="filled"
                    label={`${franchise.main_timeline.length} main`}
                    sx={{ height: 20, fontSize: "0.65rem" }}
                  />
                  {franchise.side_stories.length > 0 && (
                    <Chip
                      size="small"
                      variant="outlined"
                      label={`${franchise.side_stories.length} side`}
                      sx={{ height: 20, fontSize: "0.65rem" }}
                    />
                  )}
                  {franchise.has_pending_sequel && (
                    <Chip
                      size="small"
                      color="secondary"
                      label="Next up"
                      sx={{ height: 20, fontSize: "0.65rem" }}
                    />
                  )}
                </Stack>
              </Box>

              {/* Percentage + chevron — fixed width so title gets the rest */}
              <Stack direction="row" spacing={0.25} alignItems="center" sx={{ flexShrink: 0, width: 64, justifyContent: "flex-end" }}>
                <Typography
                  variant="caption"
                  sx={(t) => ({
                    fontWeight: 700,
                    fontSize: "0.8rem",
                    color:
                      progress.percentage === 100 && !franchise.has_pending_sequel
                        ? t.palette.success.main
                        : t.palette.primary.main,
                  })}
                >
                  {progress.percentage}%
                </Typography>
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    onExpand(franchise.franchise_id);
                  }}
                  sx={{ p: 0.5 }}
                >
                  <ExpandMoreRoundedIcon
                    sx={{
                      fontSize: 18,
                      transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                      transition: "transform 200ms ease",
                    }}
                  />
                </IconButton>
              </Stack>
            </Stack>

            <Typography variant="caption" color="text.secondary">
              {progress.main_timeline_completed} / {progress.main_timeline_total} main complete
            </Typography>

            <ProgressBar
              percentage={progress.percentage}
              fullyCompleted={progress.fully_completed}
              hasPendingSequel={franchise.has_pending_sequel}
            />
          </Stack>
        </Stack>
      </Box>

      {/* ── Expanded content ── */}
      <Collapse in={isExpanded} timeout="auto" unmountOnExit>
        <Divider />
        <Stack spacing={2.5} sx={{ p: 2.5 }}>
          {/* Main Timeline */}
          <Box>
            <Typography variant="overline" color="primary.main" sx={{ fontWeight: 700 }}>
              Main Timeline
            </Typography>
            <Box mt={0.5}>
              {franchise.main_timeline.map((entry, i) => (
                <EntryRow
                  key={entry.platform_id}
                  entry={entry}
                  index={i + 1}
                  allGroupEntries={allEntries}
                />
              ))}
            </Box>
          </Box>

          {/* Side Stories */}
          {franchise.side_stories.length > 0 && (
            <Box>
              <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700 }}>
                Side Stories
              </Typography>
              <Box mt={0.5}>
                {franchise.side_stories.map((entry, i) => (
                  <EntryRow
                    key={entry.platform_id}
                    entry={entry}
                    index={i + 1}
                    allGroupEntries={allEntries}
                    showRelationBadge
                  />
                ))}
              </Box>
            </Box>
          )}

          {/* FIX: Override section hidden behind toggle — was always visible */}
          <Box>
            <Button
              size="small"
              variant="text"
              color="inherit"
              startIcon={<TuneRoundedIcon sx={{ fontSize: 16 }} />}
              onClick={() => setShowOverrides((v) => !v)}
              sx={{ color: "text.secondary", textTransform: "none", px: 0 }}
            >
              {showOverrides ? "Hide grouping overrides" : "Manage grouping"}
            </Button>

            <Button
              size="small"
              variant="text"
              color="error"
              onClick={() => onBlacklistFranchise(franchise.franchise_id, franchise.canonical_title)}
              disabled={blacklistingId === franchise.franchise_id}
              sx={{ textTransform: "none", px: 0, ml: 2 }}
            >
              Ignore franchise
            </Button>

            <Collapse in={showOverrides} timeout="auto" unmountOnExit>
              <Stack spacing={1} mt={1.5}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  Move entries to a different franchise or give them their own group.
                </Typography>
                {allEntries.map((entry) => (
                  <OverrideEntryRow
                    key={`override-${entry.platform_id}`}
                    entry={entry}
                    currentFranchiseId={franchise.franchise_id}
                    franchiseOptions={franchiseOptions}
                    activeOverrideTarget={overrideTargets.get(entry.platform_id) ?? null}
                    isSaving={savingEntryId === entry.platform_id}
                    onSaveOverride={onSaveOverride}
                    onBlacklistEntry={onBlacklistEntry}
                    isBlacklisting={blacklistingId === entry.platform_id}
                  />
                ))}
              </Stack>
            </Collapse>
          </Box>
        </Stack>
      </Collapse>
    </Card>
  );
}