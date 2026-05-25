// The pin-a-window flow as one hook: the list of windows Tara has pinned to the top, the single
// pending pin awaiting confirmation, and the four transitions between them (request → confirm /
// cancel, plus unpin). Lifted out of Dashboard.tsx so the page stays a thin composer and this
// state machine is unit-testable on its own. The pure list ops live in pinnedWindows.ts; this hook
// only owns the React state and wires the dialog step to them.
//
// Pins persist across reloads (pinnedWindowsStorage.ts): the list hydrates from localStorage on
// mount and saves on every change. Only the committed list persists — the pending pin is transient
// dialog state and is intentionally left out.

import { useEffect, useState } from 'react';
import { type PinnedWindow, addPinnedWindow, removePinnedWindow } from '../pinnedWindows';
import { loadPinnedWindows, savePinnedWindows } from '../pinnedWindowsStorage';

export interface UsePinnedWindows {
  pinnedWindows: PinnedWindow[]; // pinned windows in pin order
  pendingPin: PinnedWindow | null; // the window in the confirm dialog, length already frozen (null = closed)
  requestPin: (date: string, startHour: number, lengthHours: number) => void; // open the dialog, freezing the live length
  confirmPin: () => void; // commit the pending pin exactly as previewed
  cancelPin: () => void; // dismiss the confirm dialog without pinning
  unpin: (window: PinnedWindow) => void; // remove a pinned window by content identity
}

export function usePinnedWindows(): UsePinnedWindows {
  // Hydrate once from a prior session; the lazy initializer reads localStorage only on first render.
  const [pinnedWindows, setPinnedWindows] = useState<PinnedWindow[]>(loadPinnedWindows);
  const [pendingPin, setPendingPin] = useState<PinnedWindow | null>(null);

  // Mirror every change back to localStorage so the next reload restores the same list.
  useEffect(() => savePinnedWindows(pinnedWindows), [pinnedWindows]);

  return {
    pinnedWindows,
    pendingPin,
    // Freeze the live demo length into the pending pin at request time, so the length the dialog
    // previews and the length confirmPin commits are one and the same — they can't drift apart.
    requestPin: (date, startHour, lengthHours) => setPendingPin({ date, startHour, lengthHours }),
    confirmPin: () => {
      if (pendingPin === null) return;
      setPinnedWindows((prev) => addPinnedWindow(prev, pendingPin));
      setPendingPin(null);
    },
    cancelPin: () => setPendingPin(null),
    unpin: (window) => setPinnedWindows((prev) => removePinnedWindow(prev, window)),
  };
}
