// The hover-to-preview, click-to-pin selection state for one day's hourly table. Hovering or
// focusing an hour previews a fixed-length block centered on it (centeredWindowStart), tinted by
// the block's rolled-up status (scoreNamedWindow); clicking/tapping commits that block. Pulled out
// of DayDetail so the component is mostly markup and this selection math is unit-testable. All the
// real geometry lives in the scoring layer (window.ts) — this hook only holds the hovered start
// and hands rows the flags they render.

import { useState } from 'react';
import type { Status } from '../../scoring/status';
import type { ScoredDay } from '../../scoring/scoring';
import { centeredWindowStart, scoreNamedWindow } from '../../scoring/window';

export interface UseWindowPreview {
  windowFits: boolean; // false when daylight is shorter than the demo length → no block can sit here
  selectionStatus: Status | null; // previewed block's rolled-up status (drives the row tint); null = nothing previewed
  isInSelection: (clockHour: number) => boolean; // is this hour inside the previewed block?
  isSelectionStart: (clockHour: number) => boolean; // first hour of the block (draws the top bracket)
  isSelectionEnd: (clockHour: number) => boolean; // last hour of the block (draws the bottom bracket)
  previewHour: (clockHour: number) => void; // hover/focus a row → preview the block centered on it
  clearPreview: () => void; // pointer left the table → drop the preview
  selectHour: (clockHour: number) => void; // click/tap → commit the centered block (no-op if none fits)
}

export function useWindowPreview(
  day: ScoredDay,
  demoWindowHours: number,
  onCommit: (startHour: number) => void,
): UseWindowPreview {
  // Start clock-hour of the block currently being previewed (null = nothing hovered/focused).
  const [hoverStart, setHoverStart] = useState<number | null>(null);

  // Daylight bounds = the span of hours actually shown, so every visible row is pinnable and the
  // block clamps to dawn/dusk. A day shorter than the demo length can't host a window at all.
  const bounds = day.hours.length
    ? { startHour: day.hours[0].clockHour, endHour: day.hours[day.hours.length - 1].clockHour }
    : null;
  const windowFits = bounds !== null && bounds.endHour - bounds.startHour + 1 >= demoWindowHours;

  // Preview status drives the tint; recomputed only when the hovered start moves. scoreNamedWindow
  // reads the already-scored hours, so this is cheap.
  const preview = hoverStart !== null ? scoreNamedWindow(day, hoverStart, demoWindowHours) : null;
  const selEnd = hoverStart !== null ? hoverStart + demoWindowHours - 1 : null;

  const resolveStart = (clockHour: number) =>
    bounds ? centeredWindowStart(clockHour, demoWindowHours, bounds) : null;

  return {
    windowFits,
    selectionStatus: preview?.status ?? null,
    isInSelection: (clockHour) => hoverStart !== null && clockHour >= hoverStart && clockHour <= selEnd!,
    isSelectionStart: (clockHour) => clockHour === hoverStart,
    isSelectionEnd: (clockHour) => clockHour === selEnd,
    previewHour: (clockHour) => setHoverStart(resolveStart(clockHour)),
    clearPreview: () => setHoverStart(null),
    selectHour: (clockHour) => {
      const start = resolveStart(clockHour);
      if (start !== null) onCommit(start);
    },
  };
}
