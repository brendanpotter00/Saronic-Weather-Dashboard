import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { type PinnedWindow } from './pinnedWindows';
import { loadPinnedWindows, savePinnedWindows } from './pinnedWindowsStorage';

const STORAGE_KEY = 'saronic.pinnedWindows.v1';

const win = (date: string, startHour: number, lengthHours: number): PinnedWindow => ({
  date,
  startHour,
  lengthHours,
});

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe('savePinnedWindows / loadPinnedWindows', () => {
  it('round-trips the saved list', () => {
    const list = [win('2026-05-24', 8, 6), win('2026-05-25', 9, 4)];
    savePinnedWindows(list);
    expect(loadPinnedWindows()).toEqual(list);
  });

  it('returns [] when nothing has been saved', () => {
    expect(loadPinnedWindows()).toEqual([]);
  });
});

describe('loadPinnedWindows — bad data is tolerated', () => {
  it('returns [] for unparseable JSON', () => {
    localStorage.setItem(STORAGE_KEY, '{ not json');
    expect(loadPinnedWindows()).toEqual([]);
  });

  it('returns [] when the stored value is valid JSON but not an array', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ date: '2026-05-24' }));
    expect(loadPinnedWindows()).toEqual([]);
  });

  it('drops entries that are not the PinnedWindow shape', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        win('2026-05-24', 8, 6), // kept
        { date: '2026-05-25', startHour: '9', lengthHours: 4 }, // startHour wrong type
        { date: '2026-05-26', startHour: 9 }, // missing lengthHours
        null,
        'nope',
      ]),
    );
    expect(loadPinnedWindows()).toEqual([win('2026-05-24', 8, 6)]);
  });

  it('collapses duplicate entries via the same dedupe rule as the in-app list', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([win('2026-05-24', 8, 6), win('2026-05-24', 8, 6)]));
    expect(loadPinnedWindows()).toEqual([win('2026-05-24', 8, 6)]);
  });

  it('returns [] when reading storage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage disabled');
    });
    expect(loadPinnedWindows()).toEqual([]);
  });
});

describe('savePinnedWindows — write failures never throw', () => {
  it('swallows a setItem failure (e.g. quota exceeded)', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });
    expect(() => savePinnedWindows([win('2026-05-24', 8, 6)])).not.toThrow();
  });
});

describe('loadPinnedWindows — dev diagnostics', () => {
  // Vitest runs with import.meta.env.DEV truthy, so the warn paths are live here.
  it('warns when stored data is corrupt (unparseable or wrong shape) but still returns []', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    localStorage.setItem(STORAGE_KEY, '{ not json');
    expect(loadPinnedWindows()).toEqual([]);

    localStorage.setItem(STORAGE_KEY, JSON.stringify({ not: 'an array' }));
    expect(loadPinnedWindows()).toEqual([]);

    localStorage.setItem(STORAGE_KEY, JSON.stringify([win('2026-05-24', 8, 6), { bogus: true }]));
    expect(loadPinnedWindows()).toEqual([win('2026-05-24', 8, 6)]);

    expect(warn).toHaveBeenCalledTimes(3);
  });

  it('stays silent when storage is simply unavailable (expected, not corrupt)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage disabled');
    });
    expect(loadPinnedWindows()).toEqual([]);
    expect(warn).not.toHaveBeenCalled();
  });
});
