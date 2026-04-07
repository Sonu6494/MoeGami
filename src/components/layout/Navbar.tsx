"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import {
  Avatar,
  Box,
  Button,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  Typography,
  InputAdornment,
  TextField,
} from "@mui/material";
import useAnimeStore from "@/store/useAnimeStore";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { NavBrandLink, NavbarShell } from "@/components/layout/NavShared";

export default function Navbar() {
  const {
    username,
    malUsername,
    platform,
    setUsername,
    setMalUsername,
    setFranchiseGroups,
    setSequelAlerts,
  } = useAnimeStore();
  const setPlatform = useAnimeStore((s) => s.setPlatform);
  const malAvatarUrl = useAnimeStore((s) => s.malAvatarUrl);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const displayName =
    platform === "MAL" ? malUsername || "MAL User" : username || "AniList User";

  // FIX: abbreviated platform label — "MyAnimeList" was too wide
  const platformLabel = platform === "MAL" ? "MAL" : "AniList";

  const globalSearchTerm = useAnimeStore((s) => s.globalSearchTerm);
  const setGlobalSearchTerm = useAnimeStore((s) => s.setGlobalSearchTerm);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setGlobalSearchTerm(e.target.value);
    if (window.location.pathname !== "/dashboard") {
      router.push("/dashboard#library-section");
    } else {
      const el = document.getElementById("library-section");
      // Only scroll if we are not reasonably close to the library section to prevent annoying jumps while typing
      if (el && window.scrollY < el.offsetTop - 200) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  };

  async function handleDisconnect() {
    if (platform === "MAL") {
      await fetch("/api/auth/mal/logout");
    }
    queryClient.removeQueries({ queryKey: ["anime-list"] });
    setUsername("");
    setMalUsername("");
    setFranchiseGroups([]);
    setSequelAlerts([]);
    setPlatform("ANILIST");
    setAnchorEl(null);
    router.push("/");
  }

  return (
    <NavbarShell>
      <Stack direction="row" spacing={1.5} alignItems="center">
        <NavBrandLink logoOnly={true} />
      </Stack>

      <Stack direction="row" spacing={2} alignItems="center">
        {(username || malUsername) && (
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ display: { xs: "none", md: "flex" } }}>
            <Button
              onClick={() => router.push("/sequels")}
              sx={{
                textTransform: "none",
                fontWeight: 700,
                fontSize: "0.85rem",
                color: "text.secondary",
                "&:hover": { color: "text.primary" }
              }}
            >
              Sequels
            </Button>
            <Button
              onClick={() => router.push("/dashboard")}
              sx={{
                textTransform: "none",
                fontWeight: 700,
                fontSize: "0.85rem",
                color: "text.secondary",
                "&:hover": { color: "text.primary" }
              }}
            >
              Your Library
            </Button>
          </Stack>
        )}

        {(username || malUsername) && (
          <TextField
            value={globalSearchTerm}
            onChange={handleSearchChange}
            placeholder="Search franchises..."
            size="small"
            sx={{
              display: { xs: "none", sm: "block" },
              width: 220,
              "& .MuiOutlinedInput-root": {
                borderRadius: 4,
                height: 36,
                pr: 1,
                // Level 1 surface — slightly lighter than the nav background
                bgcolor: (t) => t.palette.mode === "dark"
                  ? "rgba(19, 13, 27, 0.9)"   /* --bg-surface */
                  : "rgba(255,255,255,0.9)",
                "& fieldset": {
                  borderColor: (t) => t.palette.mode === "dark"
                    ? "rgba(255,255,255,0.09)"
                    : "rgba(0,0,0,0.1)",
                },
                "&:hover fieldset": {
                  borderColor: (t) => t.palette.mode === "dark"
                    ? "rgba(255,255,255,0.15)"
                    : "rgba(0,0,0,0.2)",
                },
                "&.Mui-focused fieldset": {
                  borderColor: "primary.main",
                  borderWidth: "1px",
                },
              },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon color="action" sx={{ fontSize: 18 }} />
                </InputAdornment>
              ),
            }}
          />
        )}

        <ThemeToggle />

        <Button
          onClick={(e) => setAnchorEl(e.currentTarget)}
          endIcon={<ExpandMoreRoundedIcon sx={{ fontSize: 16 }} />}
          sx={(theme) => ({
            minWidth: 0,
            px: 1,
            py: 0.75,
            borderRadius: 2,
            border: `1px solid`,
            // FIX: same visible border fix as back button
            borderColor:
              theme.palette.mode === "dark"
                ? "rgba(255,255,255,0.15)"
                : "rgba(0,0,0,0.12)",
            color: "text.primary",
            textTransform: "none",
            bgcolor:
              theme.palette.mode === "dark"
                ? "rgba(255,255,255,0.04)"
                : "rgba(255,255,255,0.9)",
            "&:hover": {
              borderColor: theme.palette.primary.main,
              bgcolor:
                theme.palette.mode === "dark"
                  ? "rgba(255,255,255,0.07)"
                  : "rgba(255,255,255,1)",
            },
          })}
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <Avatar
              src={(platform === "MAL" && malAvatarUrl) ? malAvatarUrl : undefined}
              sx={{
                width: 28,
                height: 28,
                bgcolor: "primary.main",
                fontSize: "0.75rem",
                fontWeight: 700,
              }}
            >
              {!(platform === "MAL" && malAvatarUrl) && displayName.charAt(0).toUpperCase()}
            </Avatar>
            <Box
              sx={{
                display: { xs: "none", sm: "block" },
                textAlign: "left",
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 700,
                  lineHeight: platform === "MAL" ? 1.5 : 1.2,
                  fontSize: "0.8rem"
                }}
              >
                {displayName}
              </Typography>
              {platform !== "MAL" && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ lineHeight: 1, fontSize: "0.68rem" }}
                >
                  AniList username
                </Typography>
              )}
            </Box>
          </Stack>
        </Button>
      </Stack>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        PaperProps={{
          elevation: 0,
          sx: (theme) => ({
            mt: 1,
            minWidth: 56,
            borderRadius: 3,
            border: `1px solid`,
            borderColor:
              theme.palette.mode === "dark"
                ? "rgba(255,255,255,0.12)"
                : "rgba(0,0,0,0.08)",
            // Level 3 — dropdown floats above everything
            bgcolor:
              theme.palette.mode === "dark"
                ? "#261d33"  /* --bg-overlay */
                : "#ffffff",
            // Top edge highlight for dark elevation
            boxShadow:
              theme.palette.mode === "dark"
                ? "0 1px 0 rgba(255,255,255,0.10) inset"
                : "0 8px 24px rgba(0,0,0,0.08)",
          }),
        }}
      >
        <MenuItem
          onClick={handleDisconnect}
          sx={{ color: "error.main", justifyContent: "center", py: 1.5 }}
        >
          <LogoutRoundedIcon />
        </MenuItem>
      </Menu>
    </NavbarShell >
  );
}