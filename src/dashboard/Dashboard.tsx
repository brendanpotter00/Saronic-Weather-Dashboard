// The page. Owns the dashboard-wide view state (config knobs + which day is expanded), calls the
// data and pin-flow hooks, and composes the sections. Loading/error/empty are handled here so the
// sections can assume a present, non-empty ScoredForecast.

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
  // DEV-only ?simulate=throw harness; gated so it dead-code-eliminates from production.
  if (import.meta.env.DEV) maybeThrowForSimulation();
  // null = "no explicit choice yet" → scoring uses the product defaults and echoes them back, which
  // the control then seeds from.
  const [windowConfig, setWindowConfig] = useState<ScoringOptions | null>(null);
  const { scored, isLoading, isFetching, isError, errorKind, refetch } = useScoredForecast(windowConfig ?? undefined);
  // null = "no explicit choice yet" → ForecastSection falls back to the first day. Keyed by the
  // stable date string (not an index) so it survives a refetch.
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const pins = usePinnedWindows();

  // Zero days from a valid 200 means the daylight filter or day-join dropped everything — likely a
  // bug, not normal. Log it (the UI still shows a calm empty state below).
  const hasNoDays = scored !== undefined && scored.days.length === 0;
  useEffect(() => {
    if (hasNoDays) {
      console.warn('Forecast scored to zero days — daylight filter or day-join dropped all days.');
    }
  }, [hasNoDays]);

  // `isFetching` (not just `isLoading`) so Retry shows the skeleton again, not the same error.
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
