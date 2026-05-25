import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { FetchBaseQueryError } from '@reduxjs/toolkit/query/react';
import { CACHE_TTL_SECONDS, FORECAST_DAYS } from '../config/app';
import { DEFAULT_SITE } from '../config/sites';
import type { Site } from '../config/sites';
import {
  FORECAST_BASE_URL,
  MARINE_BASE_URL,
  FORECAST_HOURLY,
  FORECAST_DAILY,
  MARINE_HOURLY,
  TIMEZONE,
  WIND_SPEED_UNIT,
  LENGTH_UNIT,
} from './openMeteoConstants';
import type { ForecastResponse, MarineResponse } from './responseTypes';
import type { CombinedForecast } from '../model';
import { buildCombinedForecast } from './combineForecasts';
import { simulatedForecastResult, simulateMarineDown } from './simulate'; // DEV-only error-state harness

function forecastUrl(site: Site): string {
  const params = new URLSearchParams({
    latitude: String(site.latitude),
    longitude: String(site.longitude),
    hourly: FORECAST_HOURLY.join(','),
    daily: FORECAST_DAILY.join(','),
    wind_speed_unit: WIND_SPEED_UNIT, // knots; precip/visibility kept at API defaults
    timezone: TIMEZONE,
    forecast_days: String(FORECAST_DAYS),
  });
  return `${FORECAST_BASE_URL}?${params.toString()}`;
}

function marineUrl(site: Site): string {
  const params = new URLSearchParams({
    latitude: String(site.latitude),
    longitude: String(site.longitude),
    hourly: MARINE_HOURLY.join(','),
    length_unit: LENGTH_UNIT, // wave heights in feet
    timezone: TIMEZONE,
    forecast_days: String(FORECAST_DAYS),
  });
  return `${MARINE_BASE_URL}?${params.toString()}`;
}

// Open-Meteo can answer HTTP 200 with a body that isn't the forecast we expect, and fetchBaseQuery
// only flags non-2xx — so guard the shape before the `as` cast, or buildCombinedForecast throws on
// a deep deref instead of erroring cleanly. The guard must cover EVERY field the consumer touches
// (not just `time`): a missing `is_day`/`sunrise`/timezone/lat/lon would each pass a `time`-only
// check and then throw (or silently produce wrong offsets) deeper in buildCombinedForecast.
function isForecastResponse(data: unknown): data is ForecastResponse {
  const d = data as ForecastResponse | null;
  return (
    !!d &&
    typeof d.timezone === 'string' &&
    d.timezone.length > 0 &&
    typeof d.latitude === 'number' &&
    typeof d.longitude === 'number' &&
    Array.isArray(d.hourly?.time) &&
    Array.isArray(d.hourly?.is_day) &&
    Array.isArray(d.hourly?.wind_speed_10m) &&
    Array.isArray(d.hourly?.precipitation) &&
    Array.isArray(d.hourly?.visibility) &&
    Array.isArray(d.daily?.time) &&
    Array.isArray(d.daily?.sunrise) &&
    Array.isArray(d.daily?.sunset) &&
    Array.isArray(d.daily?.daylight_duration)
  );
}

// The complete set of fields buildCombinedForecast touches on a marine response.
function isMarineResponse(data: unknown): data is MarineResponse {
  const d = data as MarineResponse | null;
  return (
    !!d &&
    typeof d.latitude === 'number' &&
    typeof d.longitude === 'number' &&
    Array.isArray(d.hourly?.time) &&
    Array.isArray(d.hourly?.wave_height)
  );
}

export const forecastApi = createApi({
  reducerPath: 'forecastApi',
  // Placeholder baseUrl: queryFn passes absolute URLs on two hosts that override this. We keep
  // fetchBaseQuery for its normalized error shape.
  baseQuery: fetchBaseQuery({ baseUrl: '/' }),
  // On (re)mount, refetch only if cached data is older than the TTL; otherwise serve the in-memory
  // cache and don't re-hit the rate-limited free tier.
  refetchOnMountOrArgChange: CACHE_TTL_SECONDS,
  endpoints: (build) => ({
    // One endpoint fires both upstream fetches in parallel and joins them, so the UI gets a single
    // model, loading/error state, and cache. No-arg: a single fixed site, read from DEFAULT_SITE.
    getCombinedForecast: build.query<CombinedForecast, void>({
      keepUnusedDataFor: CACHE_TTL_SECONDS, // retain ~10 min after last subscriber unmounts
      async queryFn(_arg, _api, _extra, baseQuery) {
        // DEV-only ?simulate= harness, gated on import.meta.env.DEV so the whole module dead-code-
        // eliminates from a production build (not merely no-ops at runtime).
        if (import.meta.env.DEV) {
          const simulated = simulatedForecastResult();
          if (simulated) return simulated;
        }

        const site = DEFAULT_SITE;

        const [forecastRes, marineRes] = await Promise.all([
          baseQuery(forecastUrl(site)),
          baseQuery(marineUrl(site)),
        ]);

        // Forecast is the backbone — without it there is no dashboard at all.
        if (forecastRes.error) {
          return { error: forecastRes.error as FetchBaseQueryError };
        }
        if (!isForecastResponse(forecastRes.data)) {
          return {
            error: {
              status: 'CUSTOM_ERROR',
              error: 'Forecast response missing hourly/daily arrays',
            } as FetchBaseQueryError,
          };
        }

        // Marine degrades gracefully: on a fetch error OR an unexpected body, fall back to null
        // waves so wind/precip/visibility still render.
        const marineForcedDown = import.meta.env.DEV && simulateMarineDown();
        const marine =
          marineForcedDown || marineRes.error || !isMarineResponse(marineRes.data)
            ? null
            : (marineRes.data as MarineResponse);
        const forecast = forecastRes.data as ForecastResponse;

        // Defense-in-depth: any unexpected shape past the structural guard (e.g. an invalid-but-
        // nonempty timezone that throws inside Intl.DateTimeFormat) must degrade to a clean error —
        // RTK Query's queryFn must return {data}|{error}, never throw.
        try {
          return { data: buildCombinedForecast(forecast, marine) };
        } catch (err) {
          // Genuinely unanticipated throw past the guard — log it (you'd want the stack) before
          // collapsing to the clean error.
          console.error('Failed to build forecast from response:', err);
          return {
            error: {
              status: 'CUSTOM_ERROR',
              error: 'Failed to build forecast from response',
            } as FetchBaseQueryError,
          };
        }
      },
    }),
  }),
});

export const { useGetCombinedForecastQuery } = forecastApi;
