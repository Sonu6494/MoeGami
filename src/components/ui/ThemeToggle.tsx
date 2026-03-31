"use client";

import { useEffect, useState } from "react";
import { IconButton, Tooltip } from "@mui/material";
import DarkModeRoundedIcon from "@mui/icons-material/DarkModeRounded";
import LightModeRoundedIcon from "@mui/icons-material/LightModeRounded";
import useAnimeStore from "@/store/useAnimeStore";

export default function ThemeToggle() {
  const { theme, setTheme } = useAnimeStore();

  // FIX: defer reading persisted value until after mount
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const mode = mounted && theme === "dark" ? "dark" : "light";
  const nextMode = mode === "dark" ? "light" : "dark";

  return (
    <Tooltip title={`Switch to ${nextMode} mode`}>
      <IconButton
        onClick={() => setTheme(nextMode)}
        aria-label={`Current theme: ${mode}. Switch to ${nextMode}.`}
        sx={(t) => ({
          width: 36,
          height: 36,
          borderRadius: 2,
          border: "1px solid",
          // FIX: visible border — same token as both navbars
          borderColor:
            t.palette.mode === "dark"
              ? "rgba(255,255,255,0.15)"
              : "rgba(0,0,0,0.15)",
          bgcolor:
            t.palette.mode === "dark"
              ? "rgba(255,255,255,0.04)"
              : "rgba(255,255,255,0.75)",
          color: t.palette.text.primary,
          transition: "border-color 0.2s, background-color 0.2s",
          "&:hover": {
            bgcolor:
              t.palette.mode === "dark"
                ? "rgba(255,255,255,0.08)"
                : "rgba(255,255,255,0.95)",
            borderColor: t.palette.primary.main,
          },
        })}
      >
        {mode === "dark" ? (
          <LightModeRoundedIcon sx={{ fontSize: 18 }} />
        ) : (
          <DarkModeRoundedIcon sx={{ fontSize: 18 }} />
        )}
      </IconButton>
    </Tooltip>
  );
}