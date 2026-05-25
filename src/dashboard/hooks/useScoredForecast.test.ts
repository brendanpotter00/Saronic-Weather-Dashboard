import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

// Mock only the RTK Query seam — the real scoreForecast and classifyForecastError run, so this
// test covers the integration between two already-unit-tested pure layers (data → scoring) plus
// the loading/error/memo wiring the hook owns.
const { mockUseGetCombinedForecastQuery } = vi.hoisted(() => ({
  mockUseGetCombinedForecastQuery: vi.fn(),
}));
vi.mock('../../forecast/forecastApi', () => ({
  useGetCombinedForecastQuery: mockUseGetCombinedForecastQuery,
}));

import { useScoredForecast } from './useScoredForecast';
import { Status } from '../../scoring/status';
import type { CombinedForecast, CombinedHour, DayForecast } from '../../model';

// A small but real combined forecast (what the data layer emits): one complete day, daylight 07–18.
const GO_FACTORS: Omit<CombinedHour, 'time'> = {
  windSpeedKn: 5,
  waveHeightFt: 1,
  precipitationIn: 0,
  visibilityMiles: 12,
  complete: true,
};
const iso = (hourOfDay: number): string => `2026-05-23T${String(hourOfDay).padStart(2, '0')}:00:00-05:00`;
const DAY: DayForecast = {
  date: '2026-05-23',
  sunriseTime: iso(6),
  sunsetTime: iso(19),
  daylightDurationSeconds: 46800,
  hours: Array.from({ length: 12 }, (_, i) => ({ time: iso(7 + i), ...GO_FACTORS })),
  complete: true,
};
const FORECAST: CombinedForecast = {
  site: { latitude: 30.37, longitude: -89.1 },
  marineSite: { latitude: 30.29, longitude: -89.12 },
  timezone: 'America/Chicago',
  days: [DAY],
  marineAvailable: true,
};

const refetch = vi.fn();
const QUERY_BASE = { isLoading: false, isFetching: false, isError: false, error: undefined, refetch };

beforeEach(() => {
  mockUseGetCombinedForecastQuery.mockReset();
  refetch.mockReset();
});

describe('useScoredForecast', () => {
  it('returns no scored tree while the query is loading (no data yet)', () => {
    mockUseGetCombinedForecastQuery.mockReturnValue({ ...QUERY_BASE, data: undefined, isLoading: true, isFetching: true });
    const { result } = renderHook(() => useScoredForecast());
    expect(result.current.scored).toBeUndefined();
    expect(result.current.isLoading).toBe(true);
    expect(result.current.errorKind).toBe('unknown'); // inert on the loading/happy path
  });

  it('scores the forecast once data lands, defaulting to the widest daylight window', () => {
    mockUseGetCombinedForecastQuery.mockReturnValue({ ...QUERY_BASE, data: FORECAST });
    const { result } = renderHook(() => useScoredForecast());
    expect(result.current.scored?.days).toHaveLength(1);
    expect(result.current.scored?.days[0].badge).toBe(Status.Go);
    expect(result.current.scored?.availableWindow).toEqual({ startHour: 7, endHour: 18 });
    expect(result.current.scored?.demoWindowHours).toBe(6);
  });

  it('threads an explicit window into scoring (clamped to daylight); omitting it falls back to the daylight bounds', () => {
    mockUseGetCombinedForecastQuery.mockReturnValue({ ...QUERY_BASE, data: FORECAST });
    const withWindow = renderHook(() =>
      useScoredForecast({ demoWindowHours: 4, availableWindow: { startHour: 9, endHour: 12 } }),
    );
    expect(withWindow.result.current.scored?.availableWindow).toEqual({ startHour: 9, endHour: 12 });
    expect(withWindow.result.current.scored?.demoWindowHours).toBe(4);

    const noWindow = renderHook(() => useScoredForecast({ demoWindowHours: 4 }));
    expect(noWindow.result.current.scored?.availableWindow).toEqual({ startHour: 7, endHour: 18 });
  });

  it('memoises on the primitive knobs, not the options object identity (a fresh literal does not re-score)', () => {
    mockUseGetCombinedForecastQuery.mockReturnValue({ ...QUERY_BASE, data: FORECAST });
    const { result, rerender } = renderHook(({ opts }) => useScoredForecast(opts), {
      initialProps: { opts: { demoWindowHours: 6, availableWindow: { startHour: 9, endHour: 12 } } },
    });
    const first = result.current.scored;
    // Re-render with a brand-new object literal carrying identical values: if the memo depended on
    // `options` identity (the bug the hook's comment warns against) this would re-score.
    rerender({ opts: { demoWindowHours: 6, availableWindow: { startHour: 9, endHour: 12 } } });
    expect(result.current.scored).toBe(first); // same reference → scoring did not re-run
  });

  it('surfaces the RTK error already reduced to a UI-actionable kind (429 → rateLimited)', () => {
    mockUseGetCombinedForecastQuery.mockReturnValue({ ...QUERY_BASE, data: undefined, isError: true, error: { status: 429, data: {} } });
    const { result } = renderHook(() => useScoredForecast());
    expect(result.current.isError).toBe(true);
    expect(result.current.errorKind).toBe('rateLimited');
  });
});
