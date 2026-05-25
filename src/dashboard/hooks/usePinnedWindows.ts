// The pin-a-window flow as one hook: the pinned list, the single pending pin awaiting confirmation,
// and the transitions between them (request → confirm/cancel, plus unpin). The pure list ops live
// in pinnedWindows.ts; this hook owns the React state and persistence. Pins hydrate from
// localStorage on mount and save on every change; the pending pin is transient and not persisted.

import { useEffect, useState } from 'react';
import { type PinnedWindow, addPinnedWindow, removePinnedWindow } from '../pinnedWindows';
import { loadPinnedWindows, savePinnedWindows } from '../pinnedWindowsStorage';

export interface UsePinnedWindows {
  pinnedWindows: PinnedWindow[];
  pendingPin: PinnedWindow | null; // the window in the confirm dialog, length already frozen (null = closed)
  requestPin: (date: string, startHour: number, lengthHours: number) => void; // open the dialog, freezing the live length
  confirmPin: () => void;
  cancelPin: () => void;
  unpin: (window: PinnedWindow) => void;
}

export function usePinnedWindows(): UsePinnedWindows {
  // Lazy initializer: read localStorage only on first render.
  const [pinnedWindows, setPinnedWindows] = useState<PinnedWindow[]>(loadPinnedWindows);
  const [pendingPin, setPendingPin] = useState<PinnedWindow | null>(null);

  useEffect(() => savePinnedWindows(pinnedWindows), [pinnedWindows]);

  return {
    pinnedWindows,
    pendingPin,
    // Freeze the live demo length at request time, so the dialog preview and confirmPin can't drift.
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
