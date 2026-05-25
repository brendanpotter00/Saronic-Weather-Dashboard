// The operator's pinned demo windows, plus the pure add/remove operations. A pinned window's
// IDENTITY is its content: same day + start hour + frozen length = the same window. That drives
// the dedupe rule, the React key, and the unpin target — so no generated IDs are needed.

// A pick from the hourly table: the day and the block's start clock-hour.
export interface WindowSelection {
  date: string;
  startHour: number;
}

// A pinned window FREEZES the demo length it was pinned at, so later changes to the dashboard-wide
// demo length don't reshape it. It still re-scores against each refetch — only the length is fixed.
export interface PinnedWindow extends WindowSelection {
  lengthHours: number;
}

// Content identity as a string (React key + dedupe/remove equality). `|` separator because `date`
// already contains `-`.
export function pinnedWindowKey(window: PinnedWindow): string {
  return `${window.date}|${window.startHour}|${window.lengthHours}`;
}

// Drop the matching window (by content identity); a no-op if it isn't pinned. Returns a new array.
export function removePinnedWindow(list: PinnedWindow[], target: PinnedWindow): PinnedWindow[] {
  return list.filter((window) => pinnedWindowKey(window) !== pinnedWindowKey(target));
}

// Append `next` in pin order, unless an identical window is already pinned (a no-op). Returns a NEW
// array on change, the SAME reference on no-op (React immutability).
export function addPinnedWindow(list: PinnedWindow[], next: PinnedWindow): PinnedWindow[] {
  const nextKey = pinnedWindowKey(next);
  if (list.some((window) => pinnedWindowKey(window) === nextKey)) return list;
  return [...list, next];
}
