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
      sx={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        bgcolor: "background.default",
      }}
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
        }}
      >
        <Container maxWidth="md">
          <Box
            sx={(theme) => ({
              p: { xs: 4, md: 6 },
              borderRadius: 4,
              border: "1px solid",
              borderColor:
                theme.palette.mode === "dark"
                  ? "rgba(255,255,255,0.08)"
                  : "rgba(0,0,0,0.08)",
              background:
                theme.palette.mode === "dark"
                  ? `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.4)}, ${alpha(theme.palette.background.paper, 0.1)})`
                  : `linear-gradient(135deg, ${alpha("#ffffff", 0.6)}, ${alpha("#ffffff", 0.3)})`,
              backdropFilter: "blur(12px)",
              boxShadow:
                theme.palette.mode === "dark"
                  ? "0 24px 48px rgba(0,0,0,0.5)"
                  : "0 24px 48px rgba(0,0,0,0.05)",
              textAlign: "center",
            })}
          >
            <Stack spacing={4} alignItems="center">
              <Box>
                <Typography variant="h2" sx={{ fontWeight: 800, mb: 1 }}>
                  Moe
                  <Box component="span" sx={{ color: "primary.main" }}>
                    Gami
                  </Box>
                </Typography>
                <Typography
                  color="text.secondary"
                  sx={{ fontSize: "1.1rem", maxWidth: 480, mx: "auto", lineHeight: 1.6 }}
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
                  bgcolor:
                    theme.palette.mode === "dark"
                      ? alpha(theme.palette.background.paper, 0.8)
                      : alpha("#FFFFFF", 0.9),
                  borderRadius: 999,
                  p: 0.5,
                })}
              >
                <ToggleButton value="ANILIST" sx={{ borderRadius: 999, px: 4, py: 1 }}>
                  <svg fill="#02A9FF" role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" width="24" height="24">
                    <title>AniList</title>
                    <path d="M24 17.53v2.421c0 .71-.391 1.101-1.1 1.101h-5l-.057-.165L11.84 3.736c.106-.502.46-.788 1.053-.788h2.422c.71 0 1.1.391 1.1 1.1v12.38H22.9c.71 0 1.1.392 1.1 1.101zM11.034 2.947l6.337 18.104h-4.918l-1.052-3.131H6.019l-1.077 3.131H0L6.361 2.948h4.673zm-.66 10.96-1.69-5.014-1.541 5.015h3.23z"/>
                  </svg>
                </ToggleButton>
                <ToggleButton value="MAL" sx={{ borderRadius: 999, px: 4, py: 1 }}>
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
                  sx={{ width: "100%", maxWidth: 420 }}
                >
                  <TextField
                    id="hero-input"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Your AniList username"
                    fullWidth
                    sx={(theme) => ({
                      "& .MuiOutlinedInput-root": {
                        bgcolor:
                          theme.palette.mode === "dark"
                            ? alpha(theme.palette.background.paper, 0.6)
                            : alpha("#FFFFFF", 0.8),
                        borderRadius: 2,
                      },
                    })}
                  />
                  <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    startIcon={<LoginRoundedIcon />}
                    sx={{ whiteSpace: "nowrap", px: 3.5 }}
                  >
                    Launch
                  </Button>
                </Stack>
              ) : malAuthenticated ? (
                <Stack spacing={2} alignItems="center">
                  <Alert severity="success" variant="outlined" sx={{ width: "100%", maxWidth: 420 }}>
                    Signed in as <strong>{malUsername}</strong>
                  </Alert>
                  <Button
                    component="a"
                    href="/dashboard?platform=mal"
                    variant="contained"
                    size="large"
                    sx={{ bgcolor: "#2E51A2", "&:hover": { bgcolor: "#294A93" }, width: "100%", maxWidth: 420 }}
                  >
                    Go to Dashboard
                  </Button>
                </Stack>
              ) : (
                <Stack spacing={2} alignItems="center" sx={{ width: "100%", maxWidth: 420 }}>
                  <Button
                    component="a"
                    href="/api/auth/mal/login"
                    variant="contained"
                    size="large"
                    fullWidth
                    sx={{ bgcolor: "#2E51A2", "&:hover": { bgcolor: "#294A93" }, py: 1.5 }}
                  >
                    Connect MyAnimeList
                  </Button>
                  <Typography variant="body2" color="text.secondary">
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