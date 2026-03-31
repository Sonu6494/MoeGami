"use client";

import GitHubIcon from "@mui/icons-material/GitHub";
import RocketLaunchRoundedIcon from "@mui/icons-material/RocketLaunchRounded";
import LibraryBooksRoundedIcon from "@mui/icons-material/LibraryBooksRounded";
import { Button, IconButton, Stack } from "@mui/material";
import { useRouter } from "next/navigation";
import { useAnimeStore } from "@/store/useAnimeStore";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { NavBrandLink, NavbarShell } from "@/components/layout/NavShared";
import { useEffect, useState } from "react";



export default function HomeNavbar() {
  const username = useAnimeStore((s) => s.username);
  const router = useRouter();

  // FIX: defer reading persisted store until after hydration to avoid mismatch.
  // Server always renders "Launch App", client corrects after mount.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isLoggedIn = mounted && !!username;



  return (
    <NavbarShell>
      <NavBrandLink />



      <Stack direction="row" spacing={1.2} alignItems="center">
        <ThemeToggle />

        {/* FIX: plain <a> for external URL, not Next.js Link */}
        <IconButton
          component="a"
          href="https://github.com"
          target="_blank"
          rel="noopener noreferrer"
          sx={(theme) => ({
            width: 36,
            height: 36,
            borderRadius: 2,
            border: "1px solid",
            // FIX: visible border — same token as dashboard navbar
            borderColor:
              theme.palette.mode === "dark"
                ? "rgba(255,255,255,0.15)"
                : "rgba(0,0,0,0.15)",
            color: "text.primary",
            bgcolor:
              theme.palette.mode === "dark"
                ? "rgba(255,255,255,0.04)"
                : "rgba(255,255,255,0.8)",
            display: { xs: "none", sm: "inline-flex" },
            "&:hover": {
              borderColor: theme.palette.primary.main,
            },
          })}
        >
          <GitHubIcon sx={{ fontSize: 18 }} />
        </IconButton>

        <Button
          onClick={() => {
            if (isLoggedIn) {
              router.push("/dashboard");
            } else {
              document.getElementById("hero-input")?.focus();
            }
          }}
          variant="contained"
          startIcon={
            isLoggedIn ? <LibraryBooksRoundedIcon /> : <RocketLaunchRoundedIcon />
          }
          sx={{ px: 2.2, py: 1, textTransform: "none" }}
        >
          {/* FIX: only renders user-specific text after mount to prevent hydration mismatch */}
          {isLoggedIn ? "Dashboard" : "Login"}
        </Button>
      </Stack>
    </NavbarShell>
  );
}