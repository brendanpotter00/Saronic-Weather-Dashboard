// The dashboard's single data entry point. Reads the combined forecast from RTK Query and
// runs the (pure) scoring pass over it, memoised so expand/collapse never re-scores. Keeping
// this in one hook means components depend on the render-ready `ScoredForecast` shape, not on
// the query plumbing or the scoring function — and a future caller (e.g. a pinned-window
// summary) reuses the same memoised result.

import { useMemo } from 'react';
import { useGetCombinedForecastQuery } from '../../forecast/forecastApi';
import { scoreForecast } from '../../scoring/scoring';
import type { ScoredForecast, ScoringOptions } from '../../scoring/scoring';

export interface UseScoredForecast {
  scored: ScoredForecast | undefined;
  isLoading: boolean;
  error: unknown;
}

// `options` carries Tara's dashboard-wide knobs (available window + demo length). Pass nothing
// and scoring falls back to the product defaults (widest daylight coverage, DEMO_WINDOW_HOURS),
// so the first render shows sensible values the control then seeds from.
export function useScoredForecast(options?: ScoringOptions): UseScoredForecast {
  const { data, isLoading, error } = useGetCombinedForecastQuery();
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
  return { scored, isLoading, error };
}
