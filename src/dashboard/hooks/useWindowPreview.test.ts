import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { Status } from '../../scoring/status';
import { useWindowPreview } from './useWindowPreview';
import { scoredDay } from '../../test/fixtures';

// The fixture day runs 6 AM–5 PM (clock hours 6..17); a 6-hour demo leans later and clamps.
const day = scoredDay('2026-05-24');
const shortDay = scoredDay('2026-05-24', { hours: scoredDay('2026-05-24').hours.slice(0, 3) }); // 6–8 AM
// Same all-clear day but the 10 AM hour is no-go — it falls inside the block centered on 10 AM.
const dayWithNoGoMidday = scoredDay('2026-05-24', {
  hours: scoredDay('2026-05-24').hours.map((hour) =>
    hour.clockHour === 10 ? { ...hour, status: Status.NoGo } : hour,
  ),
});

describe('useWindowPreview', () => {
  it('windowFits is true when daylight is at least the demo length', () => {
    const { result } = renderHook(() => useWindowPreview(day, 6, vi.fn()));
    expect(result.current.windowFits).toBe(true);
  });

  it('windowFits is false when daylight is shorter than the demo length', () => {
    const { result } = renderHook(() => useWindowPreview(shortDay, 6, vi.fn()));
    expect(result.current.windowFits).toBe(false);
  });

  it('previewHour centers a clamped block on the hovered hour and flags its rows', () => {
    const { result } = renderHook(() => useWindowPreview(day, 6, vi.fn()));
    expect(result.current.selectionStatus).toBeNull();

    act(() => result.current.previewHour(10)); // → 8 AM–1 PM
    expect(result.current.selectionStatus).toBe('go'); // all-clear day
    expect(result.current.isSelectionStart(8)).toBe(true);
    expect(result.current.isSelectionEnd(13)).toBe(true);
    expect(result.current.isInSelection(8)).toBe(true);
    expect(result.current.isInSelection(13)).toBe(true);
    expect(result.current.isInSelection(7)).toBe(false);
    expect(result.current.isInSelection(14)).toBe(false);
  });

  it('tints the previewed block with its worst hour (a no-go hour inside it makes the block no-go)', () => {
    const { result } = renderHook(() => useWindowPreview(dayWithNoGoMidday, 6, vi.fn()));
    act(() => result.current.previewHour(10)); // → 8 AM–1 PM, which contains the 10 AM no-go hour
    expect(result.current.selectionStatus).toBe(Status.NoGo);
  });

  it('keeps selection flags inert when no window fits (previewHour is a no-op)', () => {
    const { result } = renderHook(() => useWindowPreview(shortDay, 6, vi.fn()));
    act(() => result.current.previewHour(6)); // nothing can center in a sub-demo-length day
    expect(result.current.selectionStatus).toBeNull();
    expect(result.current.isInSelection(6)).toBe(false);
    expect(result.current.isSelectionStart(6)).toBe(false);
    expect(result.current.isSelectionEnd(6)).toBe(false);
  });

  it('clearPreview drops the preview', () => {
    const { result } = renderHook(() => useWindowPreview(day, 6, vi.fn()));
    act(() => result.current.previewHour(10));
    expect(result.current.selectionStatus).toBe('go');
    act(() => result.current.clearPreview());
    expect(result.current.selectionStatus).toBeNull();
    expect(result.current.isInSelection(8)).toBe(false);
  });

  it('selectHour commits the centered block start, clamping at dawn and dusk', () => {
    const onCommit = vi.fn();
    const { result } = renderHook(() => useWindowPreview(day, 6, onCommit));
    act(() => result.current.selectHour(10)); // centered → starts at 8
    expect(onCommit).toHaveBeenLastCalledWith(8);
    act(() => result.current.selectHour(6)); // dawn → earliest window starts at 6
    expect(onCommit).toHaveBeenLastCalledWith(6);
    act(() => result.current.selectHour(17)); // dusk → latest window starts at 12
    expect(onCommit).toHaveBeenLastCalledWith(12);
  });

  it('selectHour does not commit when no window fits', () => {
    const onCommit = vi.fn();
    const { result } = renderHook(() => useWindowPreview(shortDay, 6, onCommit));
    act(() => result.current.selectHour(6));
    expect(onCommit).not.toHaveBeenCalled();
  });
});
