// The page. Owns the view state — the expanded day, the dashboard-wide window config, the pinned
// windows, and the pending-pin dialog — and lays the dashboard out top-down: context (header) →
// pinned windows → config panel → the 10-day line → the selected day's detail, with the pin
// confirm dialog layered on top. Loading/error/empty are handled here so the children can assume a
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
import {
  type WindowSelection,
  type PinnedWindow,
  pinnedWindowKey,
  addPinnedWindow,
  removePinnedWindow,
} from './pinnedWindows';
import { DashboardConfigPanel } from './components/DashboardConfigPanel';
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
  // The windows Tara has pinned to the top (in pin order), and the one currently open in the
  // confirm dialog (a single pending pin). Both ephemeral view state with one owner, like
  // selectedDate — persistence is out of scope (picture it DB-saved).
  const [pinnedWindows, setPinnedWindows] = useState<PinnedWindow[]>([]);
  const [dialogWindow, setDialogWindow] = useState<WindowSelection | null>(null);

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

  // Re-derive scores from the live forecast on every render — the pinned cards and the dialog stay
  // dumb, and a refetch makes the status "firm up" with no card-level logic. A window whose day has
  // rolled off the 10-day horizon scores null and that slot/the dialog simply hide. The dialog
  // previews at the LIVE demo length; each pinned card scores at its own frozen length (in the map).
  const findDay = (date: string) => scored.days.find((day) => day.date === date);
  const dialogDay = dialogWindow && findDay(dialogWindow.date);
  const dialogScore =
    dialogWindow && dialogDay ? scoreNamedWindow(dialogDay, dialogWindow.startHour, scored.demoWindowHours) : null;

  return (
    <Container sx={{ py: { xs: 2, md: 4 } }}>
      <Stack spacing={{ xs: 2, md: 3 }}>
        <DashboardHeader
          site={scored.site}
          marineSite={scored.marineSite}
          marineAvailable={scored.marineAvailable}
        />
        {pinnedWindows.map((window) => {
          const day = findDay(window.date);
          const score = day ? scoreNamedWindow(day, window.startHour, window.lengthHours) : null;
          return (
            <PinnedWindowSlot
              key={pinnedWindowKey(window)}
              date={window.date}
              score={score}
              lengthHours={window.lengthHours}
              onUnpin={() => setPinnedWindows((prev) => removePinnedWindow(prev, window))}
            />
          );
        })}
        <DashboardConfigPanel
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
      </Stack>
      {dialogWindow && dialogScore && (
        <PinConfirmDialog
          open
          date={dialogWindow.date}
          score={dialogScore}
          demoWindowHours={scored.demoWindowHours}
          onConfirm={() => {
            // Freeze the current demo length into the pin so it stays independent of later config.
            const pinned = { ...dialogWindow, lengthHours: scored.demoWindowHours };
            setPinnedWindows((prev) => addPinnedWindow(prev, pinned));
            setDialogWindow(null);
          }}
          onClose={() => setDialogWindow(null)}
        />
      )}
    </Container>
  );
}
