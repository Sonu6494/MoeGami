"use client";

import { Box, Card, Skeleton, Stack } from "@mui/material";

export default function FranchiseCardSkeleton() {
  return (
    <Card sx={{ borderRadius: 3, overflow: "hidden" }}>
      <Box sx={{ p: 2 }}>
        <Stack direction="row" spacing={1.75} alignItems="center">
          {/* Cover — matches FranchiseCard's 56×80 */}
          <Skeleton
            variant="rectangular"
            width={56}
            height={80}
            sx={{ borderRadius: 2, flexShrink: 0 }}
          />

          <Stack sx={{ flex: 1, minWidth: 0 }} spacing={1}>
            {/* Title */}
            <Skeleton variant="text" width="60%" height={22} />

            {/* Chips row */}
            <Stack direction="row" spacing={0.75}>
              <Skeleton variant="rounded" width={64} height={22} sx={{ borderRadius: 999 }} />
              <Skeleton variant="rounded" width={52} height={22} sx={{ borderRadius: 999 }} />
            </Stack>

            {/* Progress label */}
            <Skeleton variant="text" width="40%" height={16} />

            {/* Progress bar */}
            <Skeleton variant="rounded" height={5} sx={{ borderRadius: 999 }} />
          </Stack>

          {/* Percentage + chevron */}
          <Stack direction="row" spacing={0.5} alignItems="center" flexShrink={0}>
            <Skeleton variant="text" width={32} height={20} />
            <Skeleton variant="circular" width={28} height={28} />
          </Stack>
        </Stack>
      </Box>
    </Card>
  );
}