import { describe, it, expect, vi, afterEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import { forecastApi } from './forecastApi';
import { FORECAST_BASE_URL, MARINE_BASE_URL } from './openMeteoConstants';
import type { ForecastResponse, MarineResponse } from './responseTypes';

// These tests exercise the queryFn's error/degradation branches directly — the part
// the PR title ("fail-safe go/no-go semantics") rests on. They run with NO real network:
// global.fetch is stubbed and the mock branches on which upstream host the request hits.
// Everything is deterministic; the stub is removed after each test so it can't leak.

// A minimal but VALID forecast body: two daylight hours on one day, with the daily
// arrays that drive day order/metadata, plus a real timezone so the Intl offset math
// in buildCombinedForecast resolves. Faithful to the API shape (precip mm, visibility m).
const validForecast: ForecastResponse = {
  latitude: 30.37,
  longitude: -89.1,
  utc_offset_seconds: -18000,
  timezone: 'America/Chicago',
  hourly: {
    time: ['2026-05-23T06:00', '2026-05-23T07:00'],
    wind_speed_10m: [8, 9],
    precipitation: [0, 0],
    visibility: [20000, 21000],
    is_day: [1, 1],
  },
  daily: {
    time: ['2026-05-23'],
    sunrise: ['2026-05-23T05:57'],
    sunset: ['2026-05-23T19:55'],
    daylight_duration: [50280],
  },
};

const validMarine: MarineResponse = {
  latitude: 30.29,
  longitude: -89.12,
  utc_offset_seconds: -18000,
  timezone: 'America/Chicago',
  hourly: {
    time: ['2026-05-23T06:00', '2026-05-23T07:00'],
    wave_height: [1.0, 1.2],
  },
};

// Fresh store per test so cached data from one branch never bleeds into the next.
function makeStore() {
  return configureStore({
    reducer: { [forecastApi.reducerPath]: forecastApi.reducer },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(forecastApi.middleware),
  });
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

// A query error is FetchBaseQueryError | SerializedError; only the former carries a
// `status` discriminant. Narrow to it so assertions can read the CUSTOM_ERROR status
// the data layer emits (a SerializedError here would itself be a failure).
function errorStatus(error: unknown): string | number | undefined {
  return error && typeof error === 'object' && 'status' in error
    ? (error as { status: string | number }).status
    : undefined;
}

// Route the mock by host: each test supplies the response for the forecast vs marine URL.
// fetchBaseQuery hands fetch a Request object (not a string), so read its .url to branch.
function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (input instanceof Request) return input.url;
  return input.toString(); // URL
}

function stubFetch(handlers: {
  forecast: () => Response;
  marine: () => Response;
}) {
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL) => {
      const url = requestUrl(input);
      if (url.startsWith(FORECAST_BASE_URL)) return Promise.resolve(handlers.forecast());
      if (url.startsWith(MARINE_BASE_URL)) return Promise.resolve(handlers.marine());
      throw new Error(`unexpected fetch url in test: ${url}`);
    }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('forecastApi.getCombinedForecast queryFn', () => {
  it('errors (no data) when the forecast fetch fails — forecast is the backbone', async () => {
    stubFetch({
      forecast: () => new Response('', { status: 500 }),
      marine: () => jsonResponse(validMarine),
    });

    const store = makeStore();
    const result = await store.dispatch(forecastApi.endpoints.getCombinedForecast.initiate());

    expect(result.isError).toBe(true);
    expect(result.status).toBe('rejected');
    // The real upstream status propagates (forecastRes.error branch) — NOT remapped to
    // CUSTOM_ERROR, which is reserved for a 200-but-malformed body.
    expect(errorStatus(result.error)).toBe(500);
    expect(result.data).toBeUndefined();
  });

  it('errors with CUSTOM_ERROR when the forecast is HTTP 200 but malformed', async () => {
    // Valid JSON, 200, but missing the hourly/daily arrays the consumer dereferences.
    stubFetch({
      forecast: () => jsonResponse({ timezone: 'America/Chicago' }),
      marine: () => jsonResponse(validMarine),
    });

    const store = makeStore();
    const result = await store.dispatch(forecastApi.endpoints.getCombinedForecast.initiate());

    expect(result.isError).toBe(true);
    expect(result.error).toBeDefined();
    expect(errorStatus(result.error)).toBe('CUSTOM_ERROR');
    expect(result.data).toBeUndefined();
  });

  it('degrades gracefully when marine fails: forecast still renders, waves marked unavailable', async () => {
    stubFetch({
      forecast: () => jsonResponse(validForecast),
      marine: () => new Response('', { status: 500 }),
    });

    const store = makeStore();
    const result = await store.dispatch(forecastApi.endpoints.getCombinedForecast.initiate());

    expect(result.isSuccess).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data?.marineAvailable).toBe(false);
    expect(result.data?.marineSite).toBeNull();
    // Days and daylight hours are still present (forecast carried the dashboard alone).
    expect(result.data?.days).toHaveLength(1);
    expect(result.data?.days[0].hours).toHaveLength(2);
    // Marine missing -> every wave reading is null -> those hours can't be a GO.
    expect(result.data?.days[0].hours.every((h) => h.waveHeightFt === null)).toBe(true);
  });

  it('degrades gracefully when marine returns a malformed 200 body', async () => {
    stubFetch({
      forecast: () => jsonResponse(validForecast),
      marine: () => jsonResponse({ timezone: 'America/Chicago' }), // missing hourly arrays
    });

    const store = makeStore();
    const result = await store.dispatch(forecastApi.endpoints.getCombinedForecast.initiate());

    expect(result.isSuccess).toBe(true);
    expect(result.data?.marineAvailable).toBe(false);
    expect(result.data?.marineSite).toBeNull();
    expect(result.data?.days[0].hours).toHaveLength(2);
  });

  it('fails safe when a forecast hourly array is shorter than time[] (parallel-array mismatch)', async () => {
    // CLAUDE.md warns "don't assume equal array lengths." isForecastResponse only checks
    // Array.isArray, so a 200 body with wind_speed_10m shorter than time[] passes the guard.
    // The missing index must read as a no-go (null factor -> complete:false), never a GO.
    const mismatchedForecast: ForecastResponse = {
      ...validForecast,
      hourly: {
        time: ['2026-05-23T06:00', '2026-05-23T07:00'],
        wind_speed_10m: [8], // SHORTER than time[] — the 07:00 hour has no wind reading
        precipitation: [0, 0],
        visibility: [20000, 21000],
        is_day: [1, 1],
      },
    };
    stubFetch({
      forecast: () => jsonResponse(mismatchedForecast),
      marine: () => jsonResponse(validMarine), // waves present for both hours
    });

    const store = makeStore();
    const result = await store.dispatch(forecastApi.endpoints.getCombinedForecast.initiate());

    expect(result.isSuccess).toBe(true);
    const hours = result.data!.days[0].hours;
    expect(hours).toHaveLength(2);
    expect(hours[0].complete).toBe(true); // 06:00 has all four factors
    expect(hours[1].windSpeedKn).toBeNull(); // 07:00 wind index missing -> finiteOrNull -> null
    expect(hours[1].complete).toBe(false); // missing factor -> cannot be a GO
  });

  it('degrades to CUSTOM_ERROR (not an uncaught throw) for an invalid-but-nonempty timezone', async () => {
    // "Not/AZone" is a nonempty string, so it passes the structural guard, then throws a
    // RangeError inside Intl.DateTimeFormat deep in buildCombinedForecast. The queryFn's
    // try/catch (defense-in-depth) must turn that into a clean error, not a rejected promise.
    const invalidTimezone: ForecastResponse = { ...validForecast, timezone: 'Not/AZone' };
    stubFetch({
      forecast: () => jsonResponse(invalidTimezone),
      marine: () => jsonResponse(validMarine),
    });

    const store = makeStore();
    const result = await store.dispatch(forecastApi.endpoints.getCombinedForecast.initiate());

    expect(result.isError).toBe(true);
    expect(errorStatus(result.error)).toBe('CUSTOM_ERROR');
    expect(result.data).toBeUndefined();
  });
});
