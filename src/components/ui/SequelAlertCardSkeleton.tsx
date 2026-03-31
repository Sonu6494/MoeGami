"use client";

import { Box, Card, Skeleton, Stack } from "@mui/material";

export default function SequelAlertCardSkeleton() {
  return (
    <Card sx={{ borderRadius: 3, p: 2, pl: 2.5 }}>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.75} alignItems={{ sm: "center" }}>
        {/* Cover — matches SequelAlertCard's 52×72 */}
        <Skeleton
          variant="rectangular"
          width={52}
          height={72}
          sx={{ borderRadius: 2, flexShrink: 0 }}
        />

        {/* Content */}
        <Stack sx={{ flex: 1, minWidth: 0 }} spacing={0.75}>
          {/* Status chip + franchise name */}
          <Stack direction="row" spacing={1} alignItems="center">
            <Skeleton variant="rounded" width={100} height={22} sx={{ borderRadius: 999 }} />
            <Skeleton variant="text" width={120} height={16} />
          </Stack>

          {/* Next entry title */}
          <Skeleton variant="text" width="65%" height={20} />

          {/* "After X" line */}
          <Skeleton variant="text" width="45%" height={16} />

          {/* Meta chips */}
          <Stack direction="row" spacing={0.5}>
            <Skeleton variant="rounded" width={72} height={22} sx={{ borderRadius: 999 }} />
            <Skeleton variant="rounded" width={52} height={22} sx={{ borderRadius: 999 }} />
          </Stack>
        </Stack>

        {/* View button */}
        <Skeleton
          variant="rounded"
          width={72}
          height={32}
          sx={{ borderRadius: 999, flexShrink: 0, alignSelf: { xs: "flex-start", sm: "center" } }}
        />
      </Stack>
    </Card>
  );
}