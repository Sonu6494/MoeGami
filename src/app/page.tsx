"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Box,
  Button,
  Container,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  alpha,
} from "@mui/material";
import LoginRoundedIcon from "@mui/icons-material/LoginRounded";
import HomeNavbar from "@/components/layout/HomeNavbar";
import { useAnimeStore } from "@/store/useAnimeStore";

type PlatformChoice = "ANILIST" | "MAL";

export default function LandingPage() {
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformChoice>("ANILIST");
  const [input, setInput] = useState("");
  const [malAuthenticated, setMalAuthenticated] = useState(false);
  const [malUsername, setMalUsernameLocal] = useState("");

  const setUsername = useAnimeStore((s) => s.setUsername);
  const setPlatform = useAnimeStore((s) => s.setPlatform);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/mal/check")
      .then((r) => r.json())
      .then((data) => {
        if (data.authenticated) {
          setMalAuthenticated(true);
          setMalUsernameLocal(data.username);
          setSelectedPlatform("MAL");
        }
      })
      .catch(() => {});
  }, []);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (selectedPlatform !== "ANILIST") return;
    const trimmed = input.trim();
    if (!trimmed) return;
    setUsername(trimmed);
    setPlatform("ANILIST");
    router.push("/dashboard");
  }

  return (
    <Box
      sx={(theme) => ({
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        bgcolor: theme.palette.mode === "dark" ? "#110c18" : "background.default",
        color: theme.palette.mode === "dark" ? "#ece1f4" : "text.primary",
      })}
    >
      <HomeNavbar />

      <Box
        component="main"
        sx={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          py: 8,
          px: 2,
        }}
      >
        <Container maxWidth="md">
          <Box
            sx={(theme) => ({
              p: { xs: 5, md: 8 },
              borderRadius: "32px",
              background: theme.palette.mode === "dark" 
                ? "#16111e" 
                : `linear-gradient(135deg, ${alpha("#ffffff", 0.6)}, ${alpha("#ffffff", 0.3)})`,
              backdropFilter: theme.palette.mode === "dark" ? "none" : "blur(12px)",
              border: theme.palette.mode === "dark" ? "none" : "1px solid",
              borderColor: theme.palette.mode === "dark" ? "transparent" : "rgba(0,0,0,0.08)",
              boxShadow: theme.palette.mode === "dark" 
                ? "0 8px 32px rgba(236,225,244,0.02)" 
                : "0 24px 48px rgba(0,0,0,0.05)",
              textAlign: "center",
              position: "relative",
              overflow: "hidden",
            })}
          >
            {/* Ambient Background Glows */}
            <Box
              sx={(theme) => ({
                position: "absolute",
                top: 0,
                left: "20%",
                width: "60%",
                height: "100%",
                background: theme.palette.mode === "dark" 
                  ? "radial-gradient(circle at top, rgba(138,76,252,0.15), transparent 60%)"
                  : "radial-gradient(circle at top, rgba(111,75,255,0.08), transparent 60%)",
                pointerEvents: "none",
              })}
            />

            <Stack spacing={5} alignItems="center" sx={{ position: "relative", zIndex: 1 }}>
              <Box>
                <Typography 
                  variant="h2" 
                  sx={(theme) => ({ 
                    fontFamily: "var(--font-epilogue)", 
                    fontWeight: 800, 
                    mb: 1.5,
                    letterSpacing: "-0.03em",
                    color: theme.palette.mode === "dark" ? "#ece1f4" : "text.primary"
                  })}
                >
                  Moe
                  <Box component="span" sx={{ color: "primary.main" }}>
                    Gami
                  </Box>
                </Typography>
                <Typography
                  sx={(theme) => ({ 
                    fontSize: "1.1rem", 
                    maxWidth: 480, 
                    mx: "auto", 
                    lineHeight: 1.6,
                    color: theme.palette.mode === "dark" ? "#b1a8b9" : "text.secondary",
                    fontFamily: "var(--font-manrope)"
                  })}
                >
                  Track your anime franchises and discover what to watch next.
                </Typography>
              </Box>

              <ToggleButtonGroup
                exclusive
                value={selectedPlatform}
                onChange={(_, value: PlatformChoice | null) =>
                  value && setSelectedPlatform(value)
                }
                sx={(theme) => ({
                  bgcolor: theme.palette.mode === "dark" 
                    ? alpha("#31283c", 0.2) 
                    : alpha("#FFFFFF", 0.9),
                  backdropFilter: theme.palette.mode === "dark" ? "blur(12px)" : "none",
                  borderRadius: 999,
                  p: 0.75,
                  "& .MuiToggleButtonGroup-grouped": {
                    border: 0,
                    borderRadius: 999,
                    "&.Mui-disabled": { border: 0 },
                    "&:not(:first-of-type)": { borderRadius: 999 },
                    "&:first-of-type": { borderRadius: 999 },
                  },
                })}
              >
                <ToggleButton 
                  value="ANILIST" 
                  sx={{ 
                    px: 4, 
                    py: 1.5,
                    "&.Mui-selected": { bgcolor: alpha("#bd9dff", 0.15) }
                  }}
                >
                  <svg fill="#02A9FF" role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" width="24" height="24">
                    <title>AniList</title>
                    <path d="M24 17.53v2.421c0 .71-.391 1.101-1.1 1.101h-5l-.057-.165L11.84 3.736c.106-.502.46-.788 1.053-.788h2.422c.71 0 1.1.391 1.1 1.1v12.38H22.9c.71 0 1.1.392 1.1 1.101zM11.034 2.947l6.337 18.104h-4.918l-1.052-3.131H6.019l-1.077 3.131H0L6.361 2.948h4.673zm-.66 10.96-1.69-5.014-1.541 5.015h3.23z"/>
                  </svg>
                </ToggleButton>
                <ToggleButton 
                  value="MAL" 
                  sx={{ 
                    px: 4, 
                    py: 1.5,
                    "&.Mui-selected": { bgcolor: alpha("#bd9dff", 0.15) }
                  }}
                >
                  <svg fill="#2E51A2" role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" width="24" height="24">
                    <title>MyAnimeList</title>
                    <path d="M14.921 6.479c-.82 0-3.683 0-4.947 3.156-.662 1.652-.986 4.812.876 7.886l1.934-1.41s-.767-1.095-1.083-3.191h2.897l.022 3.19h2.604V8.835h-2.581v2.043l-2.46-.023s.413-2.408 2.877-2.336h2.454l-.572-2.04ZM0 6.528v9.624h2.348v-5.84l2.031 2.664 2.047-2.652v5.828h2.336V6.528H6.437L4.368 9.474 2.31 6.528Zm18.447.022v9.583h5.022L24 14.09h-3.232V6.55Z"/>
                  </svg>
                </ToggleButton>
              </ToggleButtonGroup>

              {selectedPlatform === "ANILIST" ? (
                <Stack
                  component="form"
                  onSubmit={handleSubmit}
                  direction={{ xs: "column", sm: "row" }}
                  spacing={1.5}
                  sx={{ width: "100%", maxWidth: 440 }}
                >
                  <TextField
                    id="hero-input"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Your AniList username"
                    fullWidth
                    sx={(theme) => ({
                      "& .MuiOutlinedInput-root": {
                        bgcolor: theme.palette.mode === "dark" ? "#231d2d" : alpha("#FFFFFF", 0.8),
                        borderRadius: 999, // round-full pill
                        color: theme.palette.mode === "dark" ? "#ece1f4" : "text.primary",
                        "& fieldset": {
                          borderColor: theme.palette.mode === "dark" ? "transparent" : alpha("#000", 0.1),
                          transition: "border-color 0.2s",
                        },
                        "&:hover fieldset": {
                          borderColor: theme.palette.mode === "dark" ? alpha("#4c4554", 0.15) : alpha("#000", 0.2),
                        },
                        "&.Mui-focused fieldset": {
                          borderColor: theme.palette.mode === "dark" ? alpha("#4c4554", 0.3) : "primary.main", // ghost border outline_variant
                          borderWidth: "1px",
                        },
                      },
                      "& .MuiInputBase-input": {
                        px: 3,
                        py: 2,
                        fontFamily: "var(--font-manrope)",
                      }
                    })}
                  />
                  <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    startIcon={<LoginRoundedIcon />}
                    sx={(theme) => ({ 
                      whiteSpace: "nowrap", 
                      px: 4,
                      borderRadius: 999,
                      background: theme.palette.mode === "dark" 
                        ? "linear-gradient(135deg, #8a4cfc 0%, #bd9dff 100%)"
                        : "linear-gradient(135deg, #6F4BFF 0%, #8E73FF 100%)",
                      color: theme.palette.mode === "dark" ? "#3c0089" : "#ffffff",
                      fontWeight: 700,
                      fontFamily: "var(--font-manrope)",
                      textTransform: "none",
                      boxShadow: theme.palette.mode === "dark" 
                        ? "0 8px 32px rgba(189,157,255,0.24)"
                        : "0 8px 24px rgba(111,75,255,0.25)",
                      "&:hover": {
                        background: theme.palette.mode === "dark"
                          ? "linear-gradient(135deg, #7c3aed 0%, #a67aff 100%)"
                          : "linear-gradient(135deg, #5635E8 0%, #7d60ff 100%)",
                        boxShadow: theme.palette.mode === "dark"
                          ? "0 12px 40px rgba(189,157,255,0.32)"
                          : "0 12px 32px rgba(111,75,255,0.3)",
                      }
                    })}
                  >
                    Launch
                  </Button>
                </Stack>
              ) : malAuthenticated ? (
                <Stack spacing={2} alignItems="center">
                  <Alert 
                    severity="success" 
                    variant="outlined" 
                    sx={(theme) => ({ 
                      width: "100%", 
                      maxWidth: 440,
                      bgcolor: theme.palette.mode === "dark" ? alpha("#37C87A", 0.05) : alpha("#37C87A", 0.1),
                      borderColor: alpha("#37C87A", 0.2),
                      color: theme.palette.mode === "dark" ? "#ece1f4" : "text.primary",
                      borderRadius: 4
                    })}
                  >
                    Signed in as <strong>{malUsername}</strong>
                  </Alert>
                  <Button
                    component="a"
                    href="/dashboard?platform=mal"
                    variant="contained"
                    size="large"
                    sx={{ 
                      bgcolor: "#2E51A2", 
                      "&:hover": { bgcolor: "#294A93" }, 
                      width: "100%", 
                      maxWidth: 440,
                      borderRadius: 999,
                      py: 1.5,
                      fontFamily: "var(--font-manrope)",
                      fontWeight: 700,
                    }}
                  >
                    Go to Dashboard
                  </Button>
                </Stack>
              ) : (
                <Stack spacing={2} alignItems="center" sx={{ width: "100%", maxWidth: 440 }}>
                  <Button
                    component="a"
                    href="/api/auth/mal/login"
                    variant="contained"
                    size="large"
                    fullWidth
                    sx={{ 
                      bgcolor: "#2E51A2", 
                      "&:hover": { bgcolor: "#294A93" }, 
                      py: 1.5,
                      borderRadius: 999,
                      fontFamily: "var(--font-manrope)",
                      fontWeight: 700,
                    }}
                  >
                    Connect MyAnimeList
                  </Button>
                  <Typography variant="body2" sx={(theme) => ({ 
                    color: theme.palette.mode === "dark" ? "#7a7282" : "text.secondary" /* outline */ 
                  })}>
                    Secure OAuth 2.0 connection.
                  </Typography>
                </Stack>
              )}
            </Stack>
          </Box>
        </Container>
      </Box>
    </Box>
  );
}