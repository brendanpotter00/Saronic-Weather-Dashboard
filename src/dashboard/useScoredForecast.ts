// The dashboard's single data entry point. Reads the combined forecast from RTK Query and
// runs the (pure) scoring pass over it, memoised so expand/collapse never re-scores. Keeping
// this in one hook means components depend on the render-ready `ScoredForecast` shape, not on
// the query plumbing or the scoring function — and a future caller (e.g. a pinned-window
// summary) reuses the same memoised result.

import { useMemo } from 'react';
import { useGetCombinedForecastQuery } from '../forecast/forecastApi';
import { scoreForecast } from '../scoring/scoring';
import type { ScoredForecast } from '../scoring/scoring';

export interface UseScoredForecast {
  scored: ScoredForecast | undefined;
  isLoading: boolean;
  error: unknown;
}

export function useScoredForecast(): UseScoredForecast {
  const { data, isLoading, error } = useGetCombinedForecastQuery();
  // RTK Query holds a stable `data` reference while the cache is warm, so this recomputes
  // only on a real refetch, not on every render.
  const scored = useMemo(() => (data ? scoreForecast(data) : undefined), [data]);
  return { scored, isLoading, error };
}
