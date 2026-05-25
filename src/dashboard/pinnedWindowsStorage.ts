// Persists the operator's pinned windows across reloads. Pins are user decisions (not provider
// data, which the RTK Query cache keeps session-only), so they belong in localStorage. Both
// functions are best-effort: a bad read yields an empty list and a failed write is a no-op, so a
// storage failure (private mode, quota) never breaks the app. Corrupt data warns in dev only.

import { type PinnedWindow, addPinnedWindow } from './pinnedWindows';

// Versioned so a future shape change can bump the suffix and ignore old data.
const STORAGE_KEY = 'saronic.pinnedWindows.v1';

// Dev-only diagnostic; production stays silent (a best-effort persistence hiccup isn't worth it).
function warnInDev(message: string, detail?: unknown): void {
  if (!import.meta.env.DEV) return;
  if (detail === undefined) console.warn(message);
  else console.warn(message, detail);
}

// Runtime guard at the storage trust boundary: the data could be stale from an older version or
// hand-edited, so trust an entry only if it has the exact PinnedWindow shape.
function isPinnedWindow(value: unknown): value is PinnedWindow {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.date === 'string' &&
    typeof candidate.startHour === 'number' &&
    typeof candidate.lengthHours === 'number'
  );
}

// Read the pins saved by a previous session. Returns [] for the empty case and every failure mode.
// Survivors fold through addPinnedWindow so the restored list obeys the same dedupe invariant.
// Never throws: it runs in a useState lazy initializer, where an escaped throw would crash render.
export function loadPinnedWindows(): PinnedWindow[] {
  let raw: string | null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return []; // storage unavailable (private mode / disabled policy) — expected, stay silent
  }
  if (raw === null) return [];

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      warnInDev('Discarding pinned-windows storage: stored value is not an array.', parsed);
      return [];
    }
    const valid = parsed.filter(isPinnedWindow);
    if (valid.length < parsed.length) {
      const dropped = parsed.length - valid.length;
      warnInDev(`Dropped ${dropped} malformed pinned-window ${dropped === 1 ? 'entry' : 'entries'} from storage.`);
    }
    return valid.reduce<PinnedWindow[]>(addPinnedWindow, []);
  } catch (error) {
    // Corrupt data under our own key — reset to empty rather than take down render.
    warnInDev('Discarding unreadable pinned-windows storage.', error);
    return [];
  }
}

// Overwrite the saved pins. Best-effort: a storage failure is swallowed (costs persistence, not the app).
export function savePinnedWindows(windows: PinnedWindow[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(windows));
  } catch (error) {
    warnInDev('Could not persist pinned windows to localStorage.', error);
  }
}
