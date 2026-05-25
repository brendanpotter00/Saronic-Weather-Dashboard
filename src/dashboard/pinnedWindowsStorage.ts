// Persists Tara's pinned demo windows across reloads. Pins are her own decisions (not provider
// data, which the RTK Query cache deliberately keeps session-only), so they belong in localStorage:
// a morning hard-reload should bring them back. Kept as pure load/save functions next to
// pinnedWindows.ts — same concern, same folder — so the hook stays a thin owner and all the
// serialization + validation is unit-testable on its own.
//
// Both functions are best-effort: storage can be unavailable or throw (Safari private mode, quota,
// a disabled-storage policy), and the stored JSON can be stale or hand-edited. Neither case may
// break the app — a bad read yields an empty list, a failed write is a silent no-op.

import { type PinnedWindow, addPinnedWindow } from './pinnedWindows';

// Versioned so a future change to the PinnedWindow shape can bump the suffix and ignore old data
// rather than try to read it. Named here, not inlined, per the no-magic-strings convention.
const STORAGE_KEY = 'saronic.pinnedWindows.v1';

// A stored entry is only trusted if it has the exact PinnedWindow shape: the data could be stale
// from an older version or hand-edited in DevTools.
function isPinnedWindow(value: unknown): value is PinnedWindow {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.date === 'string' &&
    typeof candidate.startHour === 'number' &&
    typeof candidate.lengthHours === 'number'
  );
}

// Read the pinned windows saved by a previous session. Returns [] for the common empty case and for
// every failure mode (no key, unreadable storage, unparseable or non-array JSON). Survivors are
// folded through addPinnedWindow so the restored list obeys the same dedupe/identity invariant as
// the in-app list, reusing the one pure op instead of re-deriving it.
export function loadPinnedWindows(): PinnedWindow[] {
  let raw: string | null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return [];
  }
  if (raw === null) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  return parsed.filter(isPinnedWindow).reduce<PinnedWindow[]>(addPinnedWindow, []);
}

// Overwrite the saved pins with the current list. Best-effort: a storage failure is swallowed (it
// only costs persistence, never the running app) and surfaced to the console in dev for visibility.
export function savePinnedWindows(windows: PinnedWindow[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(windows));
  } catch (error) {
    if (import.meta.env.DEV) console.warn('Could not persist pinned windows to localStorage.', error);
  }
}
