import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { FetchBaseQueryError } from '@reduxjs/toolkit/query/react';
import { CACHE_TTL_SECONDS, FORECAST_DAYS } from '../../config/app';
import { DEFAULT_SITE } from '../../config/sites';
import type { Site } from '../../config/sites';
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
import type { ForecastResponse, MarineResponse, CombinedForecast } from './types';
import { buildCombinedForecast } from './combineForecasts';

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

// Open-Meteo can answer HTTP 200 with a body that isn't the forecast we expect
// (an error-as-200, a partial response). fetchBaseQuery only flags non-2xx, so we
// guard the shape before the `as` cast — otherwise buildCombinedForecast dereferences
// `.hourly`/`.daily` and the whole query throws instead of erroring/degrading cleanly.
function isForecastResponse(data: unknown): data is ForecastResponse {
  const d = data as ForecastResponse | null;
  return !!d && Array.isArray(d.hourly?.time) && Array.isArray(d.daily?.time);
}

function isMarineResponse(data: unknown): data is MarineResponse {
  const d = data as MarineResponse | null;
  return !!d && Array.isArray(d.hourly?.time) && Array.isArray(d.hourly?.wave_height);
}

export const weatherApi = createApi({
  reducerPath: 'weatherApi',
  // Placeholder baseUrl: the queryFn passes absolute URLs on two different
  // hosts, which override this. We keep fetchBaseQuery for its normalized error
  // shape and to reuse RTK's fetch handling.
  baseQuery: fetchBaseQuery({ baseUrl: '/' }),
  // On (re)mount — including a fresh page load rehydrated from localStorage (see
  // app/store.ts) — refetch only if the cached data is older than the TTL. Within
  // the window, serve the cache and don't re-hit the rate-limited free tier.
  refetchOnMountOrArgChange: CACHE_TTL_SECONDS,
  endpoints: (build) => ({
    // One endpoint fires BOTH upstream fetches in parallel and joins them, so
    // the UI gets a single model, a single loading/error state, and one cache.
    getCombinedForecast: build.query<CombinedForecast, Site | void>({
      keepUnusedDataFor: CACHE_TTL_SECONDS, // retain ~10 min after last subscriber unmounts
      // The arg is `Site | void` but the fetched site is `arg ?? DEFAULT_SITE`. Key the
      // cache on the resolved site id so a no-arg call and an explicit-DEFAULT_SITE call
      // share one entry (and one set of API hits) instead of fragmenting the cache.
      serializeQueryArgs: ({ queryArgs }) => (queryArgs ?? DEFAULT_SITE).id,
      async queryFn(arg, _api, _extra, baseQuery) {
        const site = arg ?? DEFAULT_SITE;

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

        // Marine degrades gracefully: on a fetch error OR an unexpected body, fall
        // back to null waves so wind/precip/visibility still render.
        const marine =
          marineRes.error || !isMarineResponse(marineRes.data)
            ? null
            : (marineRes.data as MarineResponse);
        const forecast = forecastRes.data as ForecastResponse;

        return { data: buildCombinedForecast(forecast, marine) };
      },
    }),
  }),
});

export const { useGetCombinedForecastQuery } = weatherApi;
