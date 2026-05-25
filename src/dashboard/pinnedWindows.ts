// The collection of demo windows Tara has pinned to the top of the dashboard, plus the pure
// operations that add/remove one. Kept out of Dashboard.tsx so the page stays a dumb owner of the
// array and this list logic is unit-testable on its own (mirrors normalize.ts / combineForecasts.ts
// in the data layer).
//
// A pinned window's IDENTITY is its content: two pins with the same day, start hour, and frozen
// length are the same window. That single fact drives everything here — it's the dedupe rule, the
// React key, and the unpin target — so no generated IDs or extra state are needed.

// A previewed pick from the hourly table, scored at the LIVE dashboard demo length.
export interface WindowSelection {
  date: string;
  startHour: number;
}

// A pinned window is its own independent, scheduled window: it FREEZES the demo length it was
// pinned at, so later changes to the dashboard-wide demo length don't reshape it. It still
// re-scores against the latest forecast each refetch — only the length is fixed.
export interface PinnedWindow extends WindowSelection {
  lengthHours: number;
}

// Content identity as a string: stable key for React lists and the equality test for dedupe/remove.
// `|` separates the parts because `date` ("2026-05-26") already contains the only other plausible
// separator, `-`.
export function pinnedWindowKey(window: PinnedWindow): string {
  return `${window.date}|${window.startHour}|${window.lengthHours}`;
}

// Drop the matching window (by content identity); a no-op if it isn't pinned. Returns a new array.
export function removePinnedWindow(list: PinnedWindow[], target: PinnedWindow): PinnedWindow[] {
  return list.filter((window) => pinnedWindowKey(window) !== pinnedWindowKey(target));
}

// Append `next` to the end (pin order), unless an identical window is already pinned — re-pinning
// the same day/start/length is a no-op. Must return a NEW array on change (React state is
// immutable) and the SAME array reference when it's a no-op.
export function addPinnedWindow(list: PinnedWindow[], next: PinnedWindow): PinnedWindow[] {
  const nextKey = pinnedWindowKey(next);
  if (list.some((window) => pinnedWindowKey(window) === nextKey)) return list;
  return [...list, next];
}
