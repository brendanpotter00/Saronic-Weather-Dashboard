// DEV-only error-state harness. Forces each failure/edge state from the URL (?simulate=...) so
// every error / empty / degraded UI state can be exercised and screenshotted without touching
// code. Gated behind import.meta.env.DEV, so it is inert (tree-shaken dead code) in a production
// build and can never affect what Tara sees. Kept intentionally as a manual QA affordance — the
// automated tests mock the query directly (see forecastApi.test.ts / App.test.tsx) instead.
//
// States: ?simulate=network|offline | 429 | server|forecast-error | malformed | marine-down |
//         empty | throw   (anything else → the real live forecast)
//
// Wired in: forecastApi.ts queryFn (simulatedForecastResult + simulateMarineDown) and
// Dashboard.tsx (maybeThrowForSimulation).

import type { FetchBaseQueryError } from '@reduxjs/toolkit/query/react';
import type { CombinedForecast } from '../model';
import { DEFAULT_SITE } from '../config/sites';
import { TIMEZONE } from './openMeteoConstants';

type SimulatedResult = { data: CombinedForecast } | { error: FetchBaseQueryError };

function simulateParam(): string | null {
  if (!import.meta.env.DEV || typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get('simulate');
}

// A valid-but-empty forecast: a 200 with zero days, to exercise the "no days" empty state.
const EMPTY_FORECAST: CombinedForecast = {
  site: { latitude: DEFAULT_SITE.latitude, longitude: DEFAULT_SITE.longitude },
  marineSite: null,
  timezone: TIMEZONE,
  days: [],
  marineAvailable: true,
};

// Canned queryFn result for the active ?simulate= value, or null to run the real fetch.
// `marine-down` returns null here (the forecast fetch still runs for real) — see simulateMarineDown.
export function simulatedForecastResult(): SimulatedResult | null {
  switch (simulateParam()) {
    case 'network':
    case 'offline':
      return { error: { status: 'FETCH_ERROR', error: 'Simulated network failure' } };
    case '429':
      return { error: { status: 429, data: 'Simulated rate limit' } };
    case 'server':
    case 'forecast-error':
      return { error: { status: 503, data: 'Simulated server error' } };
    case 'malformed':
      return { error: { status: 'CUSTOM_ERROR', error: 'Simulated malformed forecast body' } };
    case 'empty':
      return { data: EMPTY_FORECAST };
    default:
      return null;
  }
}

// True for ?simulate=marine-down: the forecast fetch runs for real but marine is forced
// unavailable, exercising the graceful-degradation warning + all-no-go waves.
export function simulateMarineDown(): boolean {
  return simulateParam() === 'marine-down';
}

// Throws during render for ?simulate=throw, to exercise the ErrorBoundary fallback.
export function maybeThrowForSimulation(): void {
  if (simulateParam() === 'throw') {
    throw new Error('Simulated render crash (?simulate=throw)');
  }
}
