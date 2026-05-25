// The page. Owns the only piece of view state — which day is expanded — and lays the dashboard
// out top-down: context (header) → the future pinned window's reserved slot → the 10-day line →
// the selected day's detail. Loading/error/empty are handled here so the children can assume a
// present, non-empty ScoredForecast.

import { useState } from 'react';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Skeleton from '@mui/material/Skeleton';
import Alert from '@mui/material/Alert';
import { useScoredForecast } from './hooks/useScoredForecast';
import type { ScoringOptions } from '../scoring/scoring';
import { DashboardHeader } from './components/DashboardHeader';
import { PinnedWindowSlot } from './components/PinnedWindowSlot';
import { WindowControls } from './components/WindowControls';
import { HorizonStrip } from './components/HorizonStrip';
import { DayDetail } from './components/DayDetail';

export function Dashboard() {
  // null = "no explicit choice yet" → scoring uses the product defaults (widest daylight window,
  // 6-hour demo) and echoes them back, which the control then seeds from. Dashboard-wide, lifted
  // out of any single day. Local view state with one owner (mirrors `selectedDate`, no Redux).
  const [windowConfig, setWindowConfig] = useState<ScoringOptions | null>(null);
  const { scored, isLoading, error } = useScoredForecast(windowConfig ?? undefined);
  // null = "no explicit choice yet" → fall back to the first day (today). Keyed by the stable
  // date string, not an index, so it survives a refetch that reorders/replaces the array.
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  if (isLoading) {
    return (
      <Container sx={{ py: { xs: 2, md: 4 } }}>
        <Stack spacing={2} aria-busy="true" aria-label="Loading forecast">
          <Skeleton variant="text" width="60%" height={48} />
          <Skeleton variant="rounded" height={120} />
          <Skeleton variant="rounded" height={360} />
        </Stack>
      </Container>
    );
  }

  if (error || !scored) {
    return (
      <Container sx={{ py: { xs: 2, md: 4 } }}>
        <Alert severity="error">
          Couldn't load the forecast. Check the connection and reload — a hard reload refetches.
        </Alert>
      </Container>
    );
  }

  if (scored.days.length === 0) {
    return (
      <Container sx={{ py: { xs: 2, md: 4 } }}>
        <Alert severity="info">The forecast returned no days.</Alert>
      </Container>
    );
  }

  const selected = scored.days.find((day) => day.date === selectedDate) ?? scored.days[0];
  const candidateCount = scored.days.filter((day) => day.isCandidate).length;

  return (
    <Container sx={{ py: { xs: 2, md: 4 } }}>
      <Stack spacing={{ xs: 2, md: 3 }}>
        <DashboardHeader
          site={scored.site}
          marineSite={scored.marineSite}
          marineAvailable={scored.marineAvailable}
        />
        <PinnedWindowSlot />
        <WindowControls
          availableWindow={scored.availableWindow}
          daylightBounds={scored.daylightBounds}
          daylightEnvelope={scored.daylightEnvelope}
          demoWindowHours={scored.demoWindowHours}
          candidateCount={candidateCount}
          totalDays={scored.days.length}
          onChange={setWindowConfig}
        />
        {!scored.marineAvailable && (
          <Alert severity="warning">
            Marine (wave) data is unavailable — every hour is treated as no-go until it returns.
          </Alert>
        )}
        <HorizonStrip days={scored.days} selectedDate={selected.date} onSelect={setSelectedDate} />
        <DayDetail day={selected} />
      </Stack>
    </Container>
  );
}
