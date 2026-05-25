// The pin-a-window flow as one hook: the list of windows Tara has pinned to the top, the single
// pending pin awaiting confirmation, and the four transitions between them (request → confirm /
// cancel, plus unpin). Lifted out of Dashboard.tsx so the page stays a thin composer and this
// state machine is unit-testable on its own. The pure list ops live in pinnedWindows.ts; this hook
// only owns the React state and wires the dialog step to them.

import { useState } from 'react';
import {
  type WindowSelection,
  type PinnedWindow,
  addPinnedWindow,
  removePinnedWindow,
} from '../pinnedWindows';

export interface UsePinnedWindows {
  pinnedWindows: PinnedWindow[]; // pinned windows in pin order
  pendingPin: WindowSelection | null; // the window currently in the confirm dialog (null = closed)
  requestPin: (date: string, startHour: number) => void; // open the confirm dialog for a pick
  confirmPin: (demoWindowHours: number) => void; // commit the pending pin at the given (frozen) length
  cancelPin: () => void; // dismiss the confirm dialog without pinning
  unpin: (window: PinnedWindow) => void; // remove a pinned window by content identity
}

export function usePinnedWindows(): UsePinnedWindows {
  const [pinnedWindows, setPinnedWindows] = useState<PinnedWindow[]>([]);
  const [pendingPin, setPendingPin] = useState<WindowSelection | null>(null);

  return {
    pinnedWindows,
    pendingPin,
    requestPin: (date, startHour) => setPendingPin({ date, startHour }),
    confirmPin: (demoWindowHours) => {
      if (pendingPin === null) return;
      // Freeze the current demo length into the pin so it stays independent of later config changes.
      setPinnedWindows((prev) => addPinnedWindow(prev, { ...pendingPin, lengthHours: demoWindowHours }));
      setPendingPin(null);
    },
    cancelPin: () => setPendingPin(null),
    unpin: (window) => setPinnedWindows((prev) => removePinnedWindow(prev, window)),
  };
}
