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
      // Desaturated ~25% from original — reduces visual vibration on dark bg
      // while keeping contrast ratio well above WCAG AA
      main:          isDark ? "#b0a4ec" : "#6F4BFF",  // hsl(258,70%,80%) ← was #bd9dff (100% sat)
      light:         isDark ? "#d8caf0" : "#8E73FF",  // hsl(270,68%,87%) ← was #e6c5ff
      dark:          isDark ? "#7f62d8" : "#5635E8",  // hsl(258,65%,62%) ← was #8a4cfc
      contrastText: "#120c18",
    },
    secondary: {
      main:          isDark ? "#b09ad8" : "#0EA5E9",  // hsl(272,55%,73%) ← was #c38bf5 (84% sat)
      light:         isDark ? "#d8caf0" : "#67E8F9",
      dark:          isDark ? "#5a3880" : "#0284C7",
      contrastText: "#f4e7f9",
    },
    background: {
      // Level 0 — canvas
      default: isDark ? "#09050f" : "#F4F1FF",
      // Level 1 — cards / panels
      paper:   isDark ? "#130d1b" : "#FFFFFF",
    },
    text: {
      // T1 — Primary: warm off-white, avoids halation from pure #FFF on dark bg
      primary:   isDark ? "#EDE8F5" : "#171A2A",
      // T2 — Secondary: ~70% brightness, warm purple-gray for labels & metadata
      secondary: isDark ? "#A29AB8" : "#5C647A",
      // T3 — Disabled (tertiary): ~50% brightness for hint text & counts
      disabled:  isDark ? "#6E6678" : "#9099AF",
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
            // Cards sit at Level 1 (--bg-surface)
            backgroundColor: isDark ? "#130d1b" : "#FFFFFF",
            border: `1px solid ${palette.divider}`,
            // In dark mode, a subtle top-edge highlight replaces shadow
            boxShadow: isDark
              ? "0 1px 0 rgba(255,255,255,0.07) inset"
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
            // 4-level elevation scale
            "--bg-base": mode === "dark" ? "#09050f" : appTheme.palette.background.default,
            "--bg-surface": mode === "dark" ? "#130d1b" : appTheme.palette.background.paper,
            "--bg-elevated": mode === "dark" ? "#1d1528" : alpha("#FFFFFF", 0.9),
            "--bg-overlay": mode === "dark" ? "#261d33" : "#FFFFFF",
            "--bg-nav":
              mode === "dark"
                ? "rgba(19, 13, 27, 0.82)"
                : alpha("#F8F9FF", 0.82),
            "--accent": appTheme.palette.primary.main,
            "--accent-hover": appTheme.palette.primary.dark,
            "--accent-light": alpha(appTheme.palette.primary.main, 0.14),
            "--accent-warm": appTheme.palette.secondary.main,
            "--text-primary": appTheme.palette.text.primary,
            "--text-secondary": appTheme.palette.text.secondary,
            // T3 — disabled slot holds the tertiary (muted) tier
            "--text-muted": appTheme.palette.text.disabled,
            "--success": appTheme.palette.success.main,
            "--warning": appTheme.palette.warning.main,
            "--border": mode === "dark" ? "rgba(255,255,255,0.07)" : appTheme.palette.divider,
            "--elevation-border": mode === "dark" ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.08)",
            "--skeleton-highlight":
              mode === "dark"
                ? "rgba(255,255,255,0.08)"
                : "rgba(0,0,0,0.06)",
            // In dark mode, shadows are replaced by elevation-based surface colors;
            // keep light-mode shadows meaningful.
            "--shadow-sm":
              mode === "dark"
                ? "0 1px 0 rgba(255,255,255,0.06) inset"
                : "0 10px 30px rgba(79, 70, 229, 0.08)",
            "--shadow-md":
              mode === "dark"
                ? "0 1px 0 rgba(255,255,255,0.08) inset"
                : "0 22px 60px rgba(79, 70, 229, 0.14)",
            "--shadow-lg":
              mode === "dark"
                ? "0 1px 0 rgba(255,255,255,0.10) inset"
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