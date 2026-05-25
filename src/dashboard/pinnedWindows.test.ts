import { describe, it, expect } from 'vitest';
import { type PinnedWindow, pinnedWindowKey, addPinnedWindow, removePinnedWindow } from './pinnedWindows';

const win = (date: string, startHour: number, lengthHours: number): PinnedWindow => ({
  date,
  startHour,
  lengthHours,
});

describe('pinnedWindowKey', () => {
  it('builds a content-identity string from date, start, and length', () => {
    expect(pinnedWindowKey(win('2026-05-24', 8, 6))).toBe('2026-05-24|8|6');
  });

  it('differs when any single field differs', () => {
    const base = pinnedWindowKey(win('2026-05-24', 8, 6));
    expect(pinnedWindowKey(win('2026-05-25', 8, 6))).not.toBe(base);
    expect(pinnedWindowKey(win('2026-05-24', 9, 6))).not.toBe(base);
    expect(pinnedWindowKey(win('2026-05-24', 8, 4))).not.toBe(base);
  });
});

describe('addPinnedWindow', () => {
  it('appends a new window in pin order', () => {
    const a = win('2026-05-24', 8, 6);
    const b = win('2026-05-25', 9, 6);
    expect(addPinnedWindow([a], b)).toEqual([a, b]);
  });

  it('dedupes by content — re-pinning an identical window returns the same array reference', () => {
    const list = [win('2026-05-24', 8, 6)];
    // A distinct object with identical content must still be treated as already pinned.
    const result = addPinnedWindow(list, win('2026-05-24', 8, 6));
    expect(result).toBe(list);
  });

  it('does not mutate the input array', () => {
    const list = [win('2026-05-24', 8, 6)];
    addPinnedWindow(list, win('2026-05-25', 9, 6));
    expect(list).toHaveLength(1);
  });
});

describe('removePinnedWindow', () => {
  it('drops the matching window by content and keeps the rest', () => {
    const a = win('2026-05-24', 8, 6);
    const b = win('2026-05-25', 9, 6);
    expect(removePinnedWindow([a, b], win('2026-05-24', 8, 6))).toEqual([b]);
  });

  it('is a no-op when the target is not pinned', () => {
    const list = [win('2026-05-24', 8, 6)];
    expect(removePinnedWindow(list, win('2026-05-30', 8, 6))).toEqual(list);
  });
});
