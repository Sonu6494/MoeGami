"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Button,
  Card,
  Container,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  alpha,
} from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import useAnimeStore from "@/store/useAnimeStore";
import { readDashboardSnapshot } from "@/lib/dashboardCache";
import Navbar from "@/components/layout/Navbar";
import SequelAlertCard from "@/components/ui/SequelAlertCard";

function SequelsContent() {
  const router = useRouter();
  const [sequelFilter, setSequelFilter] = useState("all");
  const [showAllSequels, setShowAllSequels] = useState(false);
  const [isPopulating, setIsPopulating] = useState(true);

  const username = useAnimeStore((s) => s.username);
  const malUsername = useAnimeStore((s) => s.malUsername);
  const platform = useAnimeStore((s) => s.platform);
  const setSequelAlerts = useAnimeStore((s) => s.setSequelAlerts);
  const sequelAlerts = useAnimeStore((s) => s.sequelAlerts);

  useEffect(() => {
    const cacheAccountKey = platform === "MAL" ? malUsername : username;
    
    if (sequelAlerts.length === 0 && cacheAccountKey) {
      // Hydrate from offline cache if refreshed directly on this route
      const cached = readDashboardSnapshot(platform, cacheAccountKey);
      if (cached && cached.sequelAlerts) {
        setSequelAlerts(cached.sequelAlerts);
      }
      setIsPopulating(false);
    } else {
      setIsPopulating(false);
    }
  }, [platform, malUsername, username, sequelAlerts.length, setSequelAlerts]);

  if (!username && platform !== "MAL") {
    // Prevent unauthenticated renders
    if (typeof window !== "undefined") router.replace("/");
    return null;
  }

  return (
    <>
      <Navbar />
      <Box component="main" sx={{ pb: 12, pt: { xs: 10, md: 12 } }}>
        <Container maxWidth="md">
          <Stack spacing={4}>
             <Stack direction="row" spacing={2} alignItems="center">
                <Button 
                   startIcon={<ArrowBackRoundedIcon />} 
                   onClick={() => router.push("/dashboard")}
                   sx={{ 
                     textTransform: 'none', 
                     color: 'text.secondary', 
                     fontWeight: 600, 
                     borderRadius: 999 
                   }}
                >
                  Dashboard
                </Button>
             </Stack>

            <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} spacing={2}>
              <Box>
                <Typography variant="h4" sx={{ 
                  fontWeight: 900, 
                  fontFamily: "var(--font-epilogue)", 
                  letterSpacing: "-0.03em",
                  background: (t) => t.palette.mode === 'dark' 
                    ? 'linear-gradient(to right, #ece1f4, #c38bf5)' 
                    : 'inherit',
                  WebkitBackgroundClip: (t) => t.palette.mode === 'dark' ? 'text' : 'inherit',
                  WebkitTextFillColor: (t) => t.palette.mode === 'dark' ? 'transparent' : 'inherit',
                }}>
                  WHAT TO WATCH NEXT
                </Typography>
                <Typography color="text.secondary" sx={{ mt: 1, fontWeight: 500 }}>
                  A complete timeline of available, upcoming, and planned sequels based on your library.
                </Typography>
              </Box>
            </Stack>

            {isPopulating ? (
              <Typography sx={{ textAlign: 'center', py: 8 }} color="text.secondary">
                Loading sequels...
              </Typography>
            ) : sequelAlerts.length > 0 ? (
              <Card
                sx={(theme) => ({
                  p: { xs: 2.5, md: 4 },
                  borderRadius: 4,
                  border: `1px solid ${alpha(theme.palette.divider, 0.4)}`,
                  background:
                    theme.palette.mode === "dark"
                      ? `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.95)}, ${alpha(
                        theme.palette.primary.main,
                        0.05
                      )})`
                      : undefined,
                })}
              >
                <Stack spacing={4}>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} justifyContent="space-between" alignItems={{ sm: "center" }}>
                    <Box>
                      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                        {sequelAlerts.filter((a) => a.alert_status === "available").length} sequels available right now
                      </Typography>
                    </Box>
                    <Box sx={{ overflowX: "auto", pb: 0.5 }}>
                      <ToggleButtonGroup
                        exclusive
                        size="small"
                        value={sequelFilter}
                        onChange={(_, v: string | null) => { if (v) setSequelFilter(v); }}
                        sx={{ flexWrap: "nowrap", whiteSpace: "nowrap" }}
                      >
                        <ToggleButton value="all" sx={{ px: { xs: 2, sm: 3 }, fontSize: "0.8rem", borderRadius: 999 }}>All</ToggleButton>
                        <ToggleButton value="available" sx={{ px: { xs: 2, sm: 3 }, fontSize: "0.8rem" }}>Available</ToggleButton>
                        <ToggleButton value="upcoming" sx={{ px: { xs: 2, sm: 3 }, fontSize: "0.8rem" }}>Upcoming</ToggleButton>
                        <ToggleButton value="planned" sx={{ px: { xs: 2, sm: 3 }, fontSize: "0.8rem", borderRadius: 999 }}>Planned</ToggleButton>
                      </ToggleButtonGroup>
                    </Box>
                  </Stack>

                  <Stack spacing={2}>
                    {sequelAlerts
                      .filter((alert) => {
                        if (sequelFilter === "available") return alert.alert_status === "available";
                        if (sequelFilter === "upcoming") return alert.alert_status === "upcoming";
                        if (sequelFilter === "planned") return alert.alert_status === "planned";
                        return true;
                      })
                      .slice(0, showAllSequels ? undefined : 10)
                      .map((alert, index) => (
                        <SequelAlertCard key={`${alert.franchise_id}-${index}`} alert={alert} />
                      ))}
                  </Stack>

                  {sequelAlerts.length > 10 && (
                    <Button 
                      variant="outlined" 
                      onClick={() => setShowAllSequels((value) => !value)} 
                      sx={{ textTransform: "none", borderRadius: 999, py: 1.5, fontWeight: 700 }}
                    >
                      {showAllSequels ? "Show less" : `Show ${sequelAlerts.length - 10} more sequels`}
                    </Button>
                  )}
                </Stack>
              </Card>
            ) : (
               <Card
                sx={(theme) => ({
                  p: { xs: 2.5, md: 4 },
                  borderRadius: 4,
                  textAlign: 'center',
                  border: `1px solid ${alpha(theme.palette.divider, 0.4)}`,
                })}
              >
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>
                     No sequels found
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 3 }}>
                     We haven't detected any missing sequels for completed anime in your library.
                  </Typography>
                  <Button variant="contained" onClick={() => router.push("/dashboard")} sx={{ borderRadius: 999, px: 4 }}>
                     Back to Dashboard
                  </Button>
              </Card>
            )}
            
          </Stack>
        </Container>
      </Box>
    </>
  );
}

export default function SequelsPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: "100dvh",
            display: "grid",
            placeItems: "center",
          }}
        />
      }
    >
      <SequelsContent />
    </Suspense>
  );
}
