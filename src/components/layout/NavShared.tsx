"use client";

import Link from "next/link";
import {
  AppBar,
  Box,
  Button,
  Container,
  Stack,
  Toolbar,
  Typography,
  alpha,
} from "@mui/material";

export function BrandLockup({ compact = false }: { compact?: boolean }) {
  return (
    <Stack direction="row" spacing={1.5} alignItems="center">
      <Box
        sx={(theme) => ({
          width: compact ? 34 : 38,
          height: compact ? 34 : 38,
          borderRadius: 2.5,
          display: "grid",
          placeItems: "center",
          color: "#F8F7FF",
          fontFamily: "var(--font-bebas-neue), sans-serif",
          fontSize: compact ? "1rem" : "1.05rem",
          letterSpacing: "0.06em",
          flexShrink: 0,
          background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
          boxShadow: `0 10px 28px ${alpha(theme.palette.primary.main, 0.35)}`,
        })}
      >
        MG
      </Box>

      {/* FIX: compact hides the entire text block, not just the subtitle */}
      {!compact && (
        <Box>
          <Typography
            sx={{
              fontFamily: "var(--font-bebas-neue), sans-serif",
              fontSize: "1.55rem",
              letterSpacing: "0.12em",
              lineHeight: 0.9,
            }}
          >
            MOE
            <Box component="span" sx={{ color: "primary.main", ml: 0.5 }}>
              GAMI
            </Box>
          </Typography>
        </Box>
      )}

      {/* When compact, show just the wordmark without subtitle */}
      {compact && (
        <Typography
          sx={{
            fontFamily: "var(--font-bebas-neue), sans-serif",
            fontSize: "1.35rem",
            letterSpacing: "0.12em",
            lineHeight: 1,
          }}
        >
          MOE
          <Box component="span" sx={{ color: "primary.main", ml: 0.5 }}>
            GAMI
          </Box>
        </Typography>
      )}
    </Stack>
  );
}

export function NavbarShell({ children }: { children: React.ReactNode }) {
  return (
    <AppBar
      position="fixed"
      color="transparent"
      elevation={0}
      sx={(theme) => ({
        top: { xs: 8, md: 16 },
        left: 0,
        right: 0,
        mx: "auto",
        width: "calc(100% - 32px)",
        maxWidth: "1200px",
        borderRadius: 2,
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        backgroundColor:
          theme.palette.mode === "dark"
            ? alpha("#080808", 0.82)
            : alpha("#ffffff", 0.85),
        border: `1px solid ${
          theme.palette.mode === "dark"
            ? "rgba(255,255,255,0.07)"
            : "rgba(0,0,0,0.08)"
        }`,
      })}
    >
      <Container maxWidth={false}>
        <Toolbar
          disableGutters
          sx={{ minHeight: "64px !important", gap: 2, justifyContent: "space-between" }}
        >
          {children}
        </Toolbar>
      </Container>
    </AppBar>
  );
}

export function NavBrandLink({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" style={{ textDecoration: "none", color: "inherit" }}>
      <BrandLockup compact={compact} />
    </Link>
  );
}

export function NavGhostButton({ href, label }: { href: string; label: string }) {
  return (
    <Button
      component="a"
      href={href}
      color="inherit"
      sx={{
        color: "text.secondary",
        textTransform: "none",
        "&:hover": { color: "text.primary" },
      }}
    >
      {label}
    </Button>
  );
}