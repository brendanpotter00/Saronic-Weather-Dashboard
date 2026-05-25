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
import { scoreNamedWindow } from '../scoring/window';
import { DashboardHeader } from './components/DashboardHeader';
import { PinnedWindowSlot } from './components/PinnedWindowSlot';
import { PinConfirmDialog } from './components/PinConfirmDialog';
import { WindowControls } from './components/WindowControls';
import { HorizonStrip } from './components/HorizonStrip';
import { DayDetail } from './components/DayDetail';
import { DashboardFooter } from './components/DashboardFooter';

// A pinned/previewed window is identified by its day + start clock-hour; the length is derived
// from the dashboard-wide demo length, never stored, so the card always reflects the current
// setting and re-scores against the latest forecast.
interface WindowRef {
  date: string;
  startHour: number;
}

export function Dashboard() {
  // null = "no explicit choice yet" → scoring uses the product defaults (widest daylight window,
  // 6-hour demo) and echoes them back, which the control then seeds from. Dashboard-wide, lifted
  // out of any single day. Local view state with one owner (mirrors `selectedDate`, no Redux).
  const [windowConfig, setWindowConfig] = useState<ScoringOptions | null>(null);
  const { scored, isLoading, error } = useScoredForecast(windowConfig ?? undefined);
  // null = "no explicit choice yet" → fall back to the first day (today). Keyed by the stable
  // date string, not an index, so it survives a refetch that reorders/replaces the array.
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  // The window Tara has pinned to the top, and the one currently open in the confirm dialog (a
  // pending pin, or an Edit of the existing one). Both ephemeral view state with one owner, like
  // selectedDate — persistence is out of scope (picture it DB-saved).
  const [pinnedWindow, setPinnedWindow] = useState<WindowRef | null>(null);
  const [dialogWindow, setDialogWindow] = useState<WindowRef | null>(null);

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

  // Re-derive each window's score from the live forecast on every render — the pinned card and the
  // dialog stay dumb, and a refetch makes the status "firm up" with no card-level logic. A window
  // whose day has rolled off the 10-day horizon scores null and the slot/dialog simply hide.
  const scoreFor = (ref: WindowRef | null) => {
    const day = ref && scored.days.find((d) => d.date === ref.date);
    return ref && day ? scoreNamedWindow(day, ref.startHour, scored.demoWindowHours) : null;
  };
  const pinnedScore = scoreFor(pinnedWindow);
  const dialogScore = scoreFor(dialogWindow);

  return (
    <Container sx={{ py: { xs: 2, md: 4 } }}>
      <Stack spacing={{ xs: 2, md: 3 }}>
        <DashboardHeader />
        <PinnedWindowSlot
          date={pinnedWindow?.date ?? null}
          score={pinnedScore}
          demoWindowHours={scored.demoWindowHours}
          onEdit={() => setDialogWindow(pinnedWindow)}
          onUnpin={() => setPinnedWindow(null)}
        />
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
        <DayDetail
          day={selected}
          demoWindowHours={scored.demoWindowHours}
          onRequestPin={(date, startHour) => setDialogWindow({ date, startHour })}
        />
        <DashboardFooter
          site={scored.site}
          marineSite={scored.marineSite}
          marineAvailable={scored.marineAvailable}
        />
      </Stack>
      {dialogWindow && dialogScore && (
        <PinConfirmDialog
          open
          date={dialogWindow.date}
          score={dialogScore}
          demoWindowHours={scored.demoWindowHours}
          onConfirm={() => {
            setPinnedWindow(dialogWindow);
            setDialogWindow(null);
          }}
          onClose={() => setDialogWindow(null)}
        />
      )}
    </Container>
  );
}
