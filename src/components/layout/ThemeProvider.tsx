"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CssBaseline,
  GlobalStyles,
  ThemeProvider as MuiThemeProvider,
  alpha,
  createTheme,
} from "@mui/material";
import useAnimeStore from "@/store/useAnimeStore";

function buildAppTheme(mode: "light" | "dark") {
  const isDark = mode === "dark";

  const palette = {
    mode,
    primary: {
      main: isDark ? "#bd9dff" : "#6F4BFF",
      light: isDark ? "#e6c5ff" : "#8E73FF",
      dark: isDark ? "#8a4cfc" : "#5635E8",
      contrastText: "#120c18",
    },
    secondary: {
      main: isDark ? "#c38bf5" : "#0EA5E9",
      light: isDark ? "#e6c5ff" : "#67E8F9",
      dark: isDark ? "#612b8f" : "#0284C7",
      contrastText: "#f4e7f9",
    },
    background: {
      default: isDark ? "#0a0510" : "#F4F1FF",
      paper: isDark ? "#120c18" : "#FFFFFF",
    },
    text: {
      primary: isDark ? "#F7F7FB" : "#171A2A",
      secondary: isDark ? "#AAB4C8" : "#5C647A",
    },
    success: { main: "#37C87A" },
    warning: { main: "#FFB347" },
    error: { main: "#FF6B81" },
    divider: isDark ? alpha("#C7D2FE", 0.12) : alpha("#3730A3", 0.12),
  } as const;

  return createTheme({
    palette,
    shape: { borderRadius: 8 },
    typography: {
      fontFamily: "var(--font-manrope), sans-serif",
      h1: {
        fontSize: "clamp(3rem, 8vw, 6.5rem)",
        lineHeight: 0.92,
        fontWeight: 700,
        letterSpacing: "-0.04em",
      },
      h2: {
        fontSize: "clamp(2rem, 5vw, 3.5rem)",
        lineHeight: 1.02,
        fontWeight: 700,
        letterSpacing: "-0.03em",
      },
      h3: {
        fontSize: "clamp(1.4rem, 3vw, 2.2rem)",
        fontWeight: 700,
        letterSpacing: "-0.02em",
      },
      h4: { fontSize: "1.2rem", fontWeight: 700 },
      button: {
        fontWeight: 700,
        letterSpacing: "0.02em",
        textTransform: "none",
      },
      overline: {
        fontSize: "0.72rem",
        letterSpacing: "0.22em",
        fontWeight: 700,
      },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: palette.background.default,
            color: palette.text.primary,
            backgroundImage: isDark
              ? "radial-gradient(circle at top, rgba(189,157,255,0.08), transparent 45%), radial-gradient(circle at 15% 15%, rgba(138,76,252,0.1), transparent 30%), linear-gradient(180deg, #0a0510 0%, #0a0510 60%, #17101e 100%)"
              : "radial-gradient(circle at top, rgba(83,216,255,0.13), transparent 28%), radial-gradient(circle at 18% 18%, rgba(111,75,255,0.15), transparent 35%), linear-gradient(180deg, #FBF8FF 0%, #F4F1FF 50%, #EEF4FF 100%)",
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          // FIX: removed backdropFilter and borderBottom from here —
          // NavbarShell's sx prop overrides these anyway (sx > styleOverrides).
          // Keeping only backgroundImage reset which NavbarShell doesn't set.
          root: {
            backgroundImage: "none",
            boxShadow: "none",
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: { backgroundImage: "none" },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 16,
            border: `1px solid ${palette.divider}`,
            boxShadow: isDark
              ? "0 24px 80px rgba(5, 10, 20, 0.55)"
              : "0 24px 80px rgba(96, 74, 227, 0.12)",
          },
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: { borderRadius: 999, paddingInline: 18 },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { borderRadius: 999, fontWeight: 700 },
        },
      },
      MuiTextField: {
        defaultProps: { variant: "outlined" },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: { borderRadius: 12 },
        },
      },
    },
  });
}

export default function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const storeTheme = useAnimeStore((s) => s.theme);

  // FIX: always render with "light" on the server — defer reading persisted
  // store value until after mount to avoid hydration mismatch. Without this,
  // server renders light theme HTML but client immediately applies dark theme,
  // causing a full MUI theme object mismatch on hydration.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const mode: "light" | "dark" = mounted && storeTheme === "dark" ? "dark" : "light";

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.classList.toggle("dark", mode === "dark");
  }, [mode, mounted]);

  const appTheme = useMemo(() => buildAppTheme(mode), [mode]);

  return (
    <MuiThemeProvider theme={appTheme}>
      <CssBaseline />
      <GlobalStyles
        styles={{
          ":root": {
            "--bg-base": appTheme.palette.background.default,
            "--bg-surface": appTheme.palette.background.paper,
            "--bg-elevated":
              mode === "dark"
                ? alpha("#1E293B", 0.92)
                : alpha("#FFFFFF", 0.9),
            "--bg-nav":
              mode === "dark"
                ? alpha("#0B1120", 0.76)
                : alpha("#F8F9FF", 0.82),
            "--accent": appTheme.palette.primary.main,
            "--accent-hover": appTheme.palette.primary.dark,
            "--accent-light": alpha(appTheme.palette.primary.main, 0.14),
            "--accent-warm": appTheme.palette.secondary.main,
            "--text-primary": appTheme.palette.text.primary,
            "--text-secondary": appTheme.palette.text.secondary,
            "--text-muted":
              mode === "dark"
                ? alpha(appTheme.palette.text.secondary, 0.7)
                : alpha(appTheme.palette.text.secondary, 0.8),
            "--success": appTheme.palette.success.main,
            "--warning": appTheme.palette.warning.main,
            "--border": appTheme.palette.divider,
            // FIX: added --skeleton-highlight — was in globals.css but missing here,
            // causing shimmer to fall back to hardcoded white in dark mode
            "--skeleton-highlight":
              mode === "dark"
                ? "rgba(255,255,255,0.08)"
                : "rgba(0,0,0,0.06)",
            "--shadow-sm":
              mode === "dark"
                ? "0 10px 30px rgba(2, 6, 23, 0.28)"
                : "0 10px 30px rgba(79, 70, 229, 0.08)",
            "--shadow-md":
              mode === "dark"
                ? "0 22px 60px rgba(2, 6, 23, 0.4)"
                : "0 22px 60px rgba(79, 70, 229, 0.14)",
            "--shadow-lg":
              mode === "dark"
                ? "0 36px 96px rgba(2, 6, 23, 0.52)"
                : "0 36px 96px rgba(79, 70, 229, 0.18)",
          },
          "html, body": {
            minHeight: "100%",
            scrollBehavior: "smooth",
          },
          body: {
            transition: "background-color 220ms ease, color 220ms ease",
          },
          "::selection": {
            backgroundColor: alpha(appTheme.palette.primary.main, 0.24),
          },
        }}
      />
      {children}
    </MuiThemeProvider>
  );
}