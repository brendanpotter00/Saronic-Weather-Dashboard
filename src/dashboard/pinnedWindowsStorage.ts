// Persists Tara's pinned demo windows across reloads. Pins are her own decisions (not provider
// data, which the RTK Query cache deliberately keeps session-only), so they belong in localStorage:
// a morning hard-reload should bring them back. Kept as pure load/save functions next to
// pinnedWindows.ts — same concern, same folder — so the hook stays a thin owner and all the
// serialization + validation is unit-testable on its own.
//
// Both functions are best-effort: storage can be unavailable or throw (Safari private mode, quota,
// a disabled-storage policy), and the stored JSON can be stale or hand-edited. Neither case may
// break the app — a bad read yields an empty list and a failed write is a no-op. Corrupt or
// dropped data logs a console.warn in dev (so a serialization regression surfaces while building)
// and stays fully silent in production.

import { type PinnedWindow, addPinnedWindow } from './pinnedWindows';

// Versioned so a future change to the PinnedWindow shape can bump the suffix and ignore old data
// rather than try to read it. Named here, not inlined, per the no-magic-strings convention.
const STORAGE_KEY = 'saronic.pinnedWindows.v1';

// Dev-only diagnostic. Production stays silent: a best-effort persistence hiccup isn't worth paging
// on, and there's no telemetry sink to send it to. Mirrors the import.meta.env.DEV gating used
// across the data layer (forecastApi.ts, useScoredForecast.ts).
function warnInDev(message: string, detail?: unknown): void {
  if (!import.meta.env.DEV) return;
  if (detail === undefined) console.warn(message);
  else console.warn(message, detail);
}

// A stored entry is only trusted if it has the exact PinnedWindow shape — a runtime guard at the
// storage trust boundary, since the data could be stale from an older version or hand-edited.
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
//
// The whole body is wrapped so the never-throw contract is structural, not incidental: this runs in
// a useState lazy initializer (see usePinnedWindows.ts), so an escaped throw would crash the
// dashboard render — the exact opposite of "best-effort". Reaching corrupt data under our own
// versioned key is "shouldn't happen", so those branches warn in dev; storage simply being
// unavailable is expected and stays silent.
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
    // JSON.parse threw, or a downstream op threw unexpectedly. Either way our own key holds
    // corrupt data — reset to empty rather than take down render.
    warnInDev('Discarding unreadable pinned-windows storage.', error);
    return [];
  }
}

// Overwrite the saved pins with the current list. Best-effort: a storage failure is swallowed (it
// only costs persistence, never the running app) — silent in production, logged via warnInDev.
export function savePinnedWindows(windows: PinnedWindow[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(windows));
  } catch (error) {
    warnInDev('Could not persist pinned windows to localStorage.', error);
  }
}
