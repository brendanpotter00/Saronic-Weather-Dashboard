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
// The guard must cover EVERY field the consumer touches, not just `time`: a body with
// `hourly.time` present but `is_day`/`sunrise`/etc. absent would still pass a `time`-only
// check and then throw on `h.is_day[i]` / `d.sunrise[i]` deep inside buildCombinedForecast.
// `timezone` is included because buildCombinedForecast feeds it into Intl.DateTimeFormat
// to resolve each hour's UTC offset: a missing/empty zone would throw a RangeError (or,
// if merely absent, silently default to the browser zone -> wrong offsets on every hour)
// instead of the clean CUSTOM_ERROR this guard exists to produce.
function isForecastResponse(data: unknown): data is ForecastResponse {
  const d = data as ForecastResponse | null;
  return (
    !!d &&
    typeof d.timezone === 'string' &&
    d.timezone.length > 0 &&
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

// Marine only ever indexes hourly.time + hourly.wave_height, so those two arrays are
// the complete set of fields the consumer touches.
function isMarineResponse(data: unknown): data is MarineResponse {
  const d = data as MarineResponse | null;
  return !!d && Array.isArray(d.hourly?.time) && Array.isArray(d.hourly?.wave_height);
}

export const forecastApi = createApi({
  reducerPath: 'forecastApi',
  // Placeholder baseUrl: the queryFn passes absolute URLs on two different
  // hosts, which override this. We keep fetchBaseQuery for its normalized error
  // shape and to reuse RTK's fetch handling.
  baseQuery: fetchBaseQuery({ baseUrl: '/' }),
  // On (re)mount, refetch only if the cached data is older than the TTL. Within the
  // window, serve the in-memory cache and don't re-hit the rate-limited free tier.
  refetchOnMountOrArgChange: CACHE_TTL_SECONDS,
  endpoints: (build) => ({
    // One endpoint fires BOTH upstream fetches in parallel and joins them, so
    // the UI gets a single model, a single loading/error state, and one cache.
    // No-arg: there's a single fixed site (multi-city is out of scope), so the
    // endpoint reads DEFAULT_SITE directly and the cache needs no custom key.
    getCombinedForecast: build.query<CombinedForecast, void>({
      keepUnusedDataFor: CACHE_TTL_SECONDS, // retain ~10 min after last subscriber unmounts
      async queryFn(_arg, _api, _extra, baseQuery) {
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

        // Marine degrades gracefully: on a fetch error OR an unexpected body, fall
        // back to null waves so wind/precip/visibility still render.
        const marine =
          marineRes.error || !isMarineResponse(marineRes.data)
            ? null
            : (marineRes.data as MarineResponse);
        const forecast = forecastRes.data as ForecastResponse;

        // Defense-in-depth: any unexpected shape that slips past the structural guard
        // above (e.g. an invalid-but-nonempty timezone string like "Not/AZone" that
        // throws a RangeError inside Intl.DateTimeFormat) must degrade to a clean error,
        // not an uncaught throw — RTK Query's queryFn contract is to return
        // {data}|{error}, never throw (a throw rejects the query promise).
        try {
          return { data: buildCombinedForecast(forecast, marine) };
        } catch {
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
