// The pinned-windows region at the top of the dashboard: the stack of demo windows Tara has
// pinned, plus the confirm dialog that commits a new one. It re-derives each card's score (and the
// pending pin's) from the live forecast on every render via scoreNamedWindow, so the cards and
// dialog stay dumb and "firm up" as the forecast refetches — no card-level logic. Renders nothing
// when nothing is pinned and no pin is pending, so the top of the page has no layout shift.

import type { ScoredDay } from '../../scoring/scoring';
import { scoreNamedWindow } from '../../scoring/window';
import { type PinnedWindow, pinnedWindowKey } from '../pinnedWindows';
import { PinnedWindowSlot } from '../components/PinnedWindowSlot';
import { PinConfirmDialog } from '../components/PinConfirmDialog';

interface PinnedWindowsSectionProps {
  days: ScoredDay[]; // the live scored days the pinned windows re-score against
  pinnedWindows: PinnedWindow[];
  pendingPin: PinnedWindow | null; // the pick awaiting confirmation, length already frozen (null = dialog closed)
  onConfirmPin: () => void;
  onCancelPin: () => void;
  onUnpin: (window: PinnedWindow) => void;
}

export function PinnedWindowsSection({
  days,
  pinnedWindows,
  pendingPin,
  onConfirmPin,
  onCancelPin,
  onUnpin,
}: PinnedWindowsSectionProps) {
  // A window whose day has rolled off the 10-day horizon scores null — its card simply hides.
  const findDay = (date: string) => days.find((day) => day.date === date);

  const pendingDay = pendingPin && findDay(pendingPin.date);
  // Both the dialog preview and each pinned card score at the window's own frozen length.
  const pendingScore =
    pendingPin && pendingDay ? scoreNamedWindow(pendingDay, pendingPin.startHour, pendingPin.lengthHours) : null;

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
          lengthHours={pendingPin.lengthHours}
          onConfirm={onConfirmPin}
          onClose={onCancelPin}
        />
      )}
    </>
  );
}
