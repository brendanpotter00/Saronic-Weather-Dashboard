// The page. Owns the dashboard-wide view state — the window/demo config knobs and which day is
// expanded — calls the data and pin-flow hooks, and composes the sections top-down: header (with
// the source blurb) → the pinned windows → the config bar → the 10-day forecast (its status key
// rides the heading). Loading/error/empty are handled here so the sections can assume a present,
// non-empty ScoredForecast.

import { useEffect, useState } from 'react';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Skeleton from '@mui/material/Skeleton';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Button from '@mui/material/Button';
import { useScoredForecast } from './hooks/useScoredForecast';
import { usePinnedWindows } from './hooks/usePinnedWindows';
import { FORECAST_ERROR_COPY } from './errorMessage';
import { maybeThrowForSimulation } from '../forecast/simulate';
import type { ScoringOptions } from '../scoring/scoring';
import { DashboardHeader } from './components/DashboardHeader';
import { DashboardConfigPanel } from './components/DashboardConfigPanel';
import { PinnedWindowsSection } from './sections/PinnedWindowsSection';
import { ForecastSection } from './sections/ForecastSection';

export function Dashboard() {
  // DEV-only error-state harness: throws on ?simulate=throw. Gated on import.meta.env.DEV so it
  // dead-code-eliminates in a production build (the simulate module never ships).
  if (import.meta.env.DEV) maybeThrowForSimulation();
  // null = "no explicit choice yet" → scoring uses the product defaults (widest daylight window,
  // 6-hour demo) and echoes them back, which the control then seeds from. Dashboard-wide, lifted
  // out of any single day. Local view state with one owner (mirrors `selectedDate`, no Redux).
  const [windowConfig, setWindowConfig] = useState<ScoringOptions | null>(null);
  const { scored, isLoading, isFetching, isError, errorKind, refetch } = useScoredForecast(windowConfig ?? undefined);
  // null = "no explicit choice yet" → ForecastSection falls back to the first day (today). Keyed
  // by the stable date string, not an index, so it survives a refetch that reorders/replaces the array.
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  // The pinned windows and the single pending pin, with their add/confirm/cancel/unpin transitions.
  const pins = usePinnedWindows();

  // A valid 200 that scores to zero days means the daylight filter or the day-join dropped
  // everything — almost certainly an upstream/scoring bug, not normal operation. The UI shows a
  // calm empty state below (with Retry); log it so the anomaly isn't invisible. Keyed so it warns
  // once per such result, not on every render.
  const hasNoDays = scored !== undefined && scored.days.length === 0;
  useEffect(() => {
    if (hasNoDays) {
      console.warn('Forecast scored to zero days — daylight filter or day-join dropped all days.');
    }
  }, [hasNoDays]);

  // `isFetching` (not just first-load `isLoading`) so clicking Retry from the error state below
  // shows the skeleton again instead of silently re-flashing the same error.
  if (isLoading || isFetching) {
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

  if (isError || !scored) {
    const { title, detail } = FORECAST_ERROR_COPY[errorKind];
    return (
      <Container sx={{ py: { xs: 2, md: 4 } }}>
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => refetch()}>
              Retry
            </Button>
          }
        >
          <AlertTitle>{title}</AlertTitle>
          {detail}
        </Alert>
      </Container>
    );
  }

  if (scored.days.length === 0) {
    return (
      <Container sx={{ py: { xs: 2, md: 4 } }}>
        <Alert
          severity="info"
          action={
            <Button color="inherit" size="small" onClick={() => refetch()}>
              Retry
            </Button>
          }
        >
          The forecast returned no days.
        </Alert>
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
