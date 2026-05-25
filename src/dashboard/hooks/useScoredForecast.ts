// The dashboard's single data entry point. Reads the combined forecast from RTK Query and
// runs the (pure) scoring pass over it, memoised so expand/collapse never re-scores. Keeping
// this in one hook means components depend on the render-ready `ScoredForecast` shape, not on
// the query plumbing or the scoring function — and a future caller (e.g. a pinned-window
// summary) reuses the same memoised result.

import { useEffect, useMemo } from 'react';
import { useGetCombinedForecastQuery } from '../../forecast/forecastApi';
import { classifyForecastError } from '../../forecast/errorKind';
import type { ForecastErrorKind } from '../../forecast/errorKind';
import { scoreForecast } from '../../scoring/scoring';
import type { ScoredForecast, ScoringOptions } from '../../scoring/scoring';

export interface UseScoredForecast {
  scored: ScoredForecast | undefined;
  // First load (no data yet). `isFetching` also covers a re-fetch over existing data — e.g. the
  // Retry button — so the view can show progress instead of re-flashing the same error.
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  // The failure already reduced to a UI-actionable kind (see errorKind.ts), not the raw RTK
  // error shape — the view maps a kind to copy and never inspects status codes. Only meaningful
  // when `isError`; on the happy path it's the inert `'unknown'`.
  errorKind: ForecastErrorKind;
  refetch: () => void;
}

// `options` carries Tara's dashboard-wide knobs (available window + demo length). Pass nothing
// and scoring falls back to the product defaults (widest daylight coverage, DEMO_WINDOW_HOURS),
// so the first render shows sensible values the control then seeds from.
export function useScoredForecast(options?: ScoringOptions): UseScoredForecast {
  const { data, isLoading, isFetching, isError, error, refetch } = useGetCombinedForecastQuery();
  const errorKind = classifyForecastError(error);
  // An `unknown` kind is the one bucket that's by definition unexpected (a serialized JS error or
  // an unmapped status) and the only one with no tailored guidance — surface the raw error so it
  // isn't lost. Keyed on `error` so it logs once per failure, not on every render.
  useEffect(() => {
    if (error !== undefined && errorKind === 'unknown') {
      console.error('Unclassified forecast error:', error);
    }
  }, [error, errorKind]);
  const demoWindowHours = options?.demoWindowHours;
  const startHour = options?.availableWindow?.startHour;
  const endHour = options?.availableWindow?.endHour;
  // RTK Query holds a stable `data` reference while the cache is warm. Depend on the primitive
  // knob values (not the `options` object identity) so re-scoring happens on a real refetch or a
  // real knob change, not on every render from a fresh object literal.
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
