// The pinned-windows region at the top of the dashboard: the stack of demo windows Tara has
// pinned, plus the confirm dialog that commits a new one. It re-derives each card's score (and the
// pending pin's) from the live forecast on every render via scoreNamedWindow, so the cards and
// dialog stay dumb and "firm up" as the forecast refetches — no card-level logic. Renders nothing
// when nothing is pinned and no pin is pending, so the top of the page has no layout shift.

import type { ScoredDay } from '../../scoring/scoring';
import { scoreNamedWindow } from '../../scoring/window';
import { type PinnedWindow, type WindowSelection, pinnedWindowKey } from '../pinnedWindows';
import { PinnedWindowSlot } from '../components/PinnedWindowSlot';
import { PinConfirmDialog } from '../components/PinConfirmDialog';

interface PinnedWindowsSectionProps {
  days: ScoredDay[]; // the live scored days the pinned windows re-score against
  demoWindowHours: number; // live effective demo length: the dialog previews at it; a pin freezes it
  pinnedWindows: PinnedWindow[];
  pendingPin: WindowSelection | null; // the pick awaiting confirmation (null = dialog closed)
  onConfirmPin: (demoWindowHours: number) => void;
  onCancelPin: () => void;
  onUnpin: (window: PinnedWindow) => void;
}

export function PinnedWindowsSection({
  days,
  demoWindowHours,
  pinnedWindows,
  pendingPin,
  onConfirmPin,
  onCancelPin,
  onUnpin,
}: PinnedWindowsSectionProps) {
  // A window whose day has rolled off the 10-day horizon scores null — its card simply hides.
  const findDay = (date: string) => days.find((day) => day.date === date);

  const pendingDay = pendingPin && findDay(pendingPin.date);
  // The dialog previews at the LIVE demo length; each pinned card scores at its own frozen length.
  const pendingScore =
    pendingPin && pendingDay ? scoreNamedWindow(pendingDay, pendingPin.startHour, demoWindowHours) : null;

  return (
    <>
      {pinnedWindows.map((window) => {
        const day = findDay(window.date);
        const score = day ? scoreNamedWindow(day, window.startHour, window.lengthHours) : null;
        return (
          <PinnedWindowSlot
            key={pinnedWindowKey(window)}
            date={window.date}
            score={score}
            lengthHours={window.lengthHours}
            onUnpin={() => onUnpin(window)}
          />
        );
      })}
      {pendingPin && pendingScore && (
        <PinConfirmDialog
          open
          date={pendingPin.date}
          score={pendingScore}
          demoWindowHours={demoWindowHours}
          onConfirm={() => onConfirmPin(demoWindowHours)}
          onClose={onCancelPin}
        />
      )}
    </>
  );
}
