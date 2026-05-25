// The dashboard's single data entry point: reads the combined forecast from RTK Query and runs the
// (pure) scoring pass, memoised so expand/collapse never re-scores. Components depend on the
// render-ready `ScoredForecast` shape, not the query/scoring plumbing.

import { useEffect, useMemo } from 'react';
import { useGetCombinedForecastQuery } from '../../forecast/forecastApi';
import { classifyForecastError } from '../../forecast/errorKind';
import type { ForecastErrorKind } from '../../forecast/errorKind';
import { scoreForecast } from '../../scoring/scoring';
import type { ScoredForecast, ScoringOptions } from '../../scoring/scoring';

export interface UseScoredForecast {
  scored: ScoredForecast | undefined;
  isLoading: boolean; // first load (no data yet)
  isFetching: boolean; // also covers a re-fetch over existing data (e.g. Retry) — show progress, not the stale error
  isError: boolean;
  // The failure reduced to a UI-actionable kind (errorKind.ts), not the raw RTK shape. Meaningful
  // only when `isError`.
  errorKind: ForecastErrorKind;
  refetch: () => void;
}

// `options` carries the dashboard-wide knobs (available window + demo length). Pass nothing and
// scoring falls back to the product defaults, which the control then seeds from.
export function useScoredForecast(options?: ScoringOptions): UseScoredForecast {
  const { data, isLoading, isFetching, isError, error, refetch } = useGetCombinedForecastQuery();
  const errorKind = classifyForecastError(error);
  // `unknown` is the one bucket with no tailored guidance — surface the raw error so it isn't lost.
  useEffect(() => {
    if (error !== undefined && errorKind === 'unknown') {
      console.error('Unclassified forecast error:', error);
    }
  }, [error, errorKind]);
  const demoWindowHours = options?.demoWindowHours;
  const startHour = options?.availableWindow?.startHour;
  const endHour = options?.availableWindow?.endHour;
  // Depend on the primitive knob values (not the `options` object identity) so re-scoring happens on
  // a real refetch or knob change, not every render from a fresh object literal.
  const scored = useMemo(
    () =>
      data
        ? scoreForecast(
            data,
            startHour !== undefined && endHour !== undefined
              ? { demoWindowHours, availableWindow: { startHour, endHour } }
              : { demoWindowHours },
          )
        : undefined,
    [data, demoWindowHours, startHour, endHour],
  );
  return { scored, isLoading, isFetching, isError, errorKind, refetch };
}
