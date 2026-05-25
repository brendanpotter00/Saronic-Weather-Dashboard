import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePinnedWindows } from './usePinnedWindows';

const PIN_A = { date: '2026-05-24', startHour: 8, lengthHours: 6 };
const PIN_B = { date: '2026-05-25', startHour: 9, lengthHours: 4 };

// The hook now hydrates from localStorage on mount, so each test starts from a clean store.
beforeEach(() => localStorage.clear());

describe('usePinnedWindows', () => {
  it('starts empty with no pending pin', () => {
    const { result } = renderHook(() => usePinnedWindows());
    expect(result.current.pinnedWindows).toEqual([]);
    expect(result.current.pendingPin).toBeNull();
  });

  it('requestPin opens the dialog with the length frozen in; cancelPin closes it without pinning', () => {
    const { result } = renderHook(() => usePinnedWindows());
    act(() => result.current.requestPin('2026-05-24', 8, 6));
    expect(result.current.pendingPin).toEqual(PIN_A);
    act(() => result.current.cancelPin());
    expect(result.current.pendingPin).toBeNull();
    expect(result.current.pinnedWindows).toEqual([]);
  });

  it('confirmPin commits the pending pin (length frozen at request) and clears it', () => {
    const { result } = renderHook(() => usePinnedWindows());
    act(() => result.current.requestPin('2026-05-24', 8, 6));
    act(() => result.current.confirmPin());
    expect(result.current.pinnedWindows).toEqual([PIN_A]);
    expect(result.current.pendingPin).toBeNull();
  });

  it('confirmPin is a no-op when nothing is pending', () => {
    const { result } = renderHook(() => usePinnedWindows());
    act(() => result.current.confirmPin());
    expect(result.current.pinnedWindows).toEqual([]);
  });

  it('does not duplicate an identical pin', () => {
    const { result } = renderHook(() => usePinnedWindows());
    act(() => result.current.requestPin('2026-05-24', 8, 6));
    act(() => result.current.confirmPin());
    act(() => result.current.requestPin('2026-05-24', 8, 6));
    act(() => result.current.confirmPin());
    expect(result.current.pinnedWindows).toHaveLength(1);
  });

  it('adds a second pin for the same day at a different start hour (start hour is part of identity)', () => {
    const { result } = renderHook(() => usePinnedWindows());
    act(() => result.current.requestPin('2026-05-24', 8, 6));
    act(() => result.current.confirmPin());
    act(() => result.current.requestPin('2026-05-24', 14, 6));
    act(() => result.current.confirmPin());
    expect(result.current.pinnedWindows).toEqual([
      { date: '2026-05-24', startHour: 8, lengthHours: 6 },
      { date: '2026-05-24', startHour: 14, lengthHours: 6 },
    ]);
  });

  it('keeps each pin in pin order and unpins by content identity', () => {
    const { result } = renderHook(() => usePinnedWindows());
    act(() => result.current.requestPin('2026-05-24', 8, 6));
    act(() => result.current.confirmPin());
    act(() => result.current.requestPin('2026-05-25', 9, 4));
    act(() => result.current.confirmPin());
    expect(result.current.pinnedWindows).toEqual([PIN_A, PIN_B]);

    act(() => result.current.unpin(PIN_A));
    expect(result.current.pinnedWindows).toEqual([PIN_B]);
  });

  it('hydrates its initial list from localStorage on mount', () => {
    localStorage.setItem('saronic.pinnedWindows.v1', JSON.stringify([PIN_A, PIN_B]));
    const { result } = renderHook(() => usePinnedWindows());
    expect(result.current.pinnedWindows).toEqual([PIN_A, PIN_B]);
  });

  it('persists a confirmed pin so a fresh mount restores it', () => {
    const first = renderHook(() => usePinnedWindows());
    act(() => first.result.current.requestPin('2026-05-24', 8, 6));
    act(() => first.result.current.confirmPin());

    const next = renderHook(() => usePinnedWindows());
    expect(next.result.current.pinnedWindows).toEqual([PIN_A]);
  });

  it('persists an unpin so a fresh mount stays empty', () => {
    localStorage.setItem('saronic.pinnedWindows.v1', JSON.stringify([PIN_A]));
    const first = renderHook(() => usePinnedWindows());
    act(() => first.result.current.unpin(PIN_A));

    const next = renderHook(() => usePinnedWindows());
    expect(next.result.current.pinnedWindows).toEqual([]);
  });
});
