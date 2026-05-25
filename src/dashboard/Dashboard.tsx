// The page. Owns the dashboard-wide view state — the window/demo config knobs and which day is
// expanded — calls the data and pin-flow hooks, and composes the sections top-down: header (with
// the source blurb) → the pinned windows → the config bar → the 10-day forecast (its status key
// rides the heading). Loading/error/empty are handled here so the sections can assume a present,
// non-empty ScoredForecast.

import { useState } from 'react';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Skeleton from '@mui/material/Skeleton';
import Alert from '@mui/material/Alert';
import { useScoredForecast } from './hooks/useScoredForecast';
import { usePinnedWindows } from './hooks/usePinnedWindows';
import type { ScoringOptions } from '../scoring/scoring';
import { DashboardHeader } from './components/DashboardHeader';
import { DashboardConfigPanel } from './components/DashboardConfigPanel';
import { PinnedWindowsSection } from './sections/PinnedWindowsSection';
import { ForecastSection } from './sections/ForecastSection';

export function Dashboard() {
  // null = "no explicit choice yet" → scoring uses the product defaults (widest daylight window,
  // 6-hour demo) and echoes them back, which the control then seeds from. Dashboard-wide, lifted
  // out of any single day. Local view state with one owner (mirrors `selectedDate`, no Redux).
  const [windowConfig, setWindowConfig] = useState<ScoringOptions | null>(null);
  const { scored, isLoading, error } = useScoredForecast(windowConfig ?? undefined);
  // null = "no explicit choice yet" → ForecastSection falls back to the first day (today). Keyed
  // by the stable date string, not an index, so it survives a refetch that reorders the array.
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  // The pinned windows and the single pending pin, with their add/confirm/cancel/unpin transitions.
  const pins = usePinnedWindows();

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

  const candidateCount = scored.days.filter((day) => day.isCandidate).length;

  return (
    <Container sx={{ py: { xs: 2, md: 4 } }}>
      <Stack spacing={{ xs: 2, md: 3 }}>
        <DashboardHeader
          site={scored.site}
          marineSite={scored.marineSite}
          marineAvailable={scored.marineAvailable}
        />
        <PinnedWindowsSection
          days={scored.days}
          demoWindowHours={scored.demoWindowHours}
          pinnedWindows={pins.pinnedWindows}
          pendingPin={pins.pendingPin}
          onConfirmPin={pins.confirmPin}
          onCancelPin={pins.cancelPin}
          onUnpin={pins.unpin}
        />
        <DashboardConfigPanel
          availableWindow={scored.availableWindow}
          daylightBounds={scored.daylightBounds}
          daylightEnvelope={scored.daylightEnvelope}
          demoWindowHours={scored.demoWindowHours}
          candidateCount={candidateCount}
          totalDays={scored.days.length}
          onChange={setWindowConfig}
        />
        <ForecastSection
          days={scored.days}
          marineAvailable={scored.marineAvailable}
          demoWindowHours={scored.demoWindowHours}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          onRequestPin={pins.requestPin}
        />
      </Stack>
    </Container>
  );
}
