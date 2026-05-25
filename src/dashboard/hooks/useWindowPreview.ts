// Hover-to-preview, click-to-pin selection state for one day's hourly table. The real geometry
// lives in window.ts (centeredWindowStart, scoreNamedWindow); this hook holds the hovered start and
// hands rows the flags they render.

import { useState } from 'react';
import type { Status } from '../../scoring/status';
import type { ScoredDay } from '../../scoring/scoring';
import { centeredWindowStart, scoreNamedWindow } from '../../scoring/window';

export interface UseWindowPreview {
  windowFits: boolean; // false when daylight is shorter than the demo length → no block fits
  selectionStatus: Status | null; // previewed block's rolled-up status (drives the tint); null = nothing previewed
  isInSelection: (clockHour: number) => boolean;
  isSelectionStart: (clockHour: number) => boolean; // draws the top bracket
  isSelectionEnd: (clockHour: number) => boolean; // draws the bottom bracket
  previewHour: (clockHour: number) => void; // hover/focus → preview the block centered here
  clearPreview: () => void;
  selectHour: (clockHour: number) => void; // click/tap → commit (no-op if none fits)
}

export function useWindowPreview(
  day: ScoredDay,
  demoWindowHours: number,
  onCommit: (startHour: number) => void,
): UseWindowPreview {
  // Start clock-hour of the block currently being previewed (null = nothing hovered/focused).
  const [hoverStart, setHoverStart] = useState<number | null>(null);

  // Bounds = the span of hours actually shown, so every visible row is pinnable. A day shorter than
  // the demo length can't host a window.
  const bounds = day.hours.length
    ? { startHour: day.hours[0].clockHour, endHour: day.hours[day.hours.length - 1].clockHour }
    : null;
  const windowFits = bounds !== null && bounds.endHour - bounds.startHour + 1 >= demoWindowHours;

  // The previewed block as one nullable object so start/end/status narrow together (no `!` needed).
  // scoreNamedWindow reads already-scored hours, so recomputing on each hovered start is cheap.
  const preview =
    hoverStart !== null
      ? {
          startHour: hoverStart,
          endHour: hoverStart + demoWindowHours - 1,
          status: scoreNamedWindow(day, hoverStart, demoWindowHours).status,
        }
      : null;

  const resolveStart = (clockHour: number) =>
    bounds ? centeredWindowStart(clockHour, demoWindowHours, bounds) : null;

  return {
    windowFits,
    selectionStatus: preview?.status ?? null,
    isInSelection: (clockHour) =>
      preview !== null && clockHour >= preview.startHour && clockHour <= preview.endHour,
    isSelectionStart: (clockHour) => preview !== null && clockHour === preview.startHour,
    isSelectionEnd: (clockHour) => preview !== null && clockHour === preview.endHour,
    previewHour: (clockHour) => setHoverStart(resolveStart(clockHour)),
    clearPreview: () => setHoverStart(null),
    selectHour: (clockHour) => {
      const start = resolveStart(clockHour);
      if (start !== null) onCommit(start);
    },
  };
}
