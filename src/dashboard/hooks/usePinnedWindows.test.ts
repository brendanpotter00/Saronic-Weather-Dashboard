import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePinnedWindows } from './usePinnedWindows';

const PIN_A = { date: '2026-05-24', startHour: 8, lengthHours: 6 };
const PIN_B = { date: '2026-05-25', startHour: 9, lengthHours: 4 };

describe('usePinnedWindows', () => {
  it('starts empty with no pending pin', () => {
    const { result } = renderHook(() => usePinnedWindows());
    expect(result.current.pinnedWindows).toEqual([]);
    expect(result.current.pendingPin).toBeNull();
  });

  it('requestPin opens the dialog for the pick; cancelPin closes it without pinning', () => {
    const { result } = renderHook(() => usePinnedWindows());
    act(() => result.current.requestPin('2026-05-24', 8));
    expect(result.current.pendingPin).toEqual({ date: '2026-05-24', startHour: 8 });
    act(() => result.current.cancelPin());
    expect(result.current.pendingPin).toBeNull();
    expect(result.current.pinnedWindows).toEqual([]);
  });

  it('confirmPin freezes the demo length into the pin and clears the pending pin', () => {
    const { result } = renderHook(() => usePinnedWindows());
    act(() => result.current.requestPin('2026-05-24', 8));
    act(() => result.current.confirmPin(6));
    expect(result.current.pinnedWindows).toEqual([PIN_A]);
    expect(result.current.pendingPin).toBeNull();
  });

  it('confirmPin is a no-op when nothing is pending', () => {
    const { result } = renderHook(() => usePinnedWindows());
    act(() => result.current.confirmPin(6));
    expect(result.current.pinnedWindows).toEqual([]);
  });

  it('does not duplicate an identical pin', () => {
    const { result } = renderHook(() => usePinnedWindows());
    act(() => result.current.requestPin('2026-05-24', 8));
    act(() => result.current.confirmPin(6));
    act(() => result.current.requestPin('2026-05-24', 8));
    act(() => result.current.confirmPin(6));
    expect(result.current.pinnedWindows).toHaveLength(1);
  });

  it('keeps each pin in pin order and unpins by content identity', () => {
    const { result } = renderHook(() => usePinnedWindows());
    act(() => result.current.requestPin('2026-05-24', 8));
    act(() => result.current.confirmPin(6));
    act(() => result.current.requestPin('2026-05-25', 9));
    act(() => result.current.confirmPin(4));
    expect(result.current.pinnedWindows).toEqual([PIN_A, PIN_B]);

    act(() => result.current.unpin(PIN_A));
    expect(result.current.pinnedWindows).toEqual([PIN_B]);
  });
});
