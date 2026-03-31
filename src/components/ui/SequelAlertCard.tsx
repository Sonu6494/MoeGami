"use client";

import type { ElementType } from "react";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import PlayCircleRoundedIcon from "@mui/icons-material/PlayCircleRounded";
import ScheduleRoundedIcon from "@mui/icons-material/ScheduleRounded";
import PlaylistAddCheckRoundedIcon from "@mui/icons-material/PlaylistAddCheckRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import { Box, Button, Card, Chip, Stack, Typography, alpha } from "@mui/material";
import type { SequelAlert } from "@/lib/types";

type PaletteKey = "success" | "primary" | "secondary" | "warning";

type StatusConfig = {
  label: string;
  paletteKey: PaletteKey;
  icon: ElementType;
};

// FIX: separated type, no React.ElementType (React not imported)
const STATUS_CONFIG: Record<SequelAlert["alert_status"], StatusConfig> = {
  available: { label: "Available Now", paletteKey: "success", icon: PlayCircleRoundedIcon },
  upcoming: { label: "Coming Soon", paletteKey: "primary", icon: ScheduleRoundedIcon },
  planned: { label: "Planned", paletteKey: "secondary", icon: PlaylistAddCheckRoundedIcon },
  in_progress: { label: "In Your List", paletteKey: "warning", icon: VisibilityRoundedIcon },
  watching: { label: "Watching", paletteKey: "secondary", icon: PlayCircleRoundedIcon },
}

export default function SequelAlertCard({ alert }: { alert: SequelAlert }) {
  const config = STATUS_CONFIG[alert.alert_status]
  const StatusIcon = config.icon

  const href =
    alert.platform === "MAL"
      ? `https://myanimelist.net/anime/${alert.next_entry.id}`
      : `https://anilist.co/anime/${alert.next_entry.id}`

  return (
    <Card
      sx={(t) => {
        // FIX: resolve palette color once, typed as any to avoid index signature errors
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const color = (t.palette as any)[config.paletteKey]
        return {
          p: 2,
          pl: 2.5,
          position: "relative",
          overflow: "hidden",
          transition: "box-shadow 0.2s ease, border-color 0.2s ease",
          "&:hover": {
            boxShadow:
              t.palette.mode === "dark"
                ? "0 8px 24px rgba(5,10,20,0.5)"
                : "0 8px 24px rgba(96,74,227,0.1)",
            borderColor: alpha(color.main, 0.3),
          },
          "&::before": {
            content: '""',
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 3,
            borderRadius: "3px 0 0 3px",
            background: `linear-gradient(180deg, ${color.light ?? color.main}, ${color.main})`,
          },
        }
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="center">
        {/* Cover — smaller on mobile */}
        <Box
          sx={(t) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const color = (t.palette as any)[config.paletteKey]
            return {
              width: { xs: 44, sm: 52 },
              height: { xs: 60, sm: 72 },
              borderRadius: 2,
              overflow: "hidden",
              flexShrink: 0,
              bgcolor: "action.hover",
              boxShadow: `0 4px 12px ${alpha(color.main, 0.2)}`,
            }
          }}
        >
          {alert.franchise_cover && (
            <Box
              component="img"
              src={alert.franchise_cover}
              alt={alert.franchise_title}
              sx={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          )}
        </Box>

        {/* Content — flex 1 */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack spacing={0.5}>
            <Stack
              direction="row"
              spacing={0.75}
              alignItems="center"
              flexWrap="wrap"
              useFlexGap
              sx={{ display: { xs: "none", sm: "flex" } }}
            >
              <Chip
                size="small"
                icon={<StatusIcon sx={{ fontSize: "0.8rem !important" }} />}
                label={config.label}
                sx={(t) => {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const color = (t.palette as any)[config.paletteKey]
                  return {
                    height: 20,
                    fontSize: "0.65rem",
                    fontWeight: 700,
                    color: color.main,
                    bgcolor: alpha(color.main, 0.12),
                    "& .MuiChip-icon": { color: "inherit" },
                  }
                }}
              />
            </Stack>

            <Typography
              variant="body2"
              sx={{ fontWeight: 800, lineHeight: 1.2, fontSize: { xs: "0.8rem", sm: "0.875rem" } }}
              noWrap
            >
              {alert.next_entry.title}
            </Typography>

            {/* Hide "After X" on mobile — saves vertical space */}
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: { xs: "none", sm: "block" } }}
            >
              After{" "}
              <Box component="span" sx={{ fontWeight: 600, color: "text.primary" }}>
                {alert.last_watched.title}
              </Box>
            </Typography>

            {/* Hide meta chips on mobile */}
            <Stack
              direction="row"
              spacing={0.5}
              flexWrap="wrap"
              useFlexGap
              sx={{ display: { xs: "none", sm: "flex" } }}
            >
              {alert.next_entry.season && (
                <Chip size="small" variant="outlined" label={alert.next_entry.season} />
              )}
              <Chip
                size="small"
                variant="outlined"
                label={alert.next_entry.type.replace("_", " ")}
              />
            </Stack>
          </Stack>
        </Box>

        {/* View button — icon only on mobile */}
        <Button
          component="a"
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          variant="outlined"
          size="small"
          endIcon={<OpenInNewRoundedIcon sx={{ fontSize: "0.9rem !important" }} />}
          sx={(t) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const color = (t.palette as any)[config.paletteKey]
            return {
              flexShrink: 0,
              minWidth: 0,
              px: { xs: 1, sm: 2 },
              // Hide label on mobile — just show the icon
              "& .MuiButton-endIcon": { ml: { xs: 0, sm: 0.5 } },
              borderColor: alpha(color.main, 0.4),
              color: color.main,
              "&:hover": {
                borderColor: color.main,
                bgcolor: alpha(color.main, 0.08),
              },
            }
          }}
        >
          <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>
            View
          </Box>
        </Button>
      </Stack>
    </Card>
  )
}