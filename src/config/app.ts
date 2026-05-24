// App-level product decisions, independent of the weather provider. Changing
// these is a product call (how far to look ahead, how fresh the data must be),
// not an API-contract change — so they live here and are consumed by the API
// layer (weatherApi.ts).

export const FORECAST_DAYS = 10; // 10-day look-ahead (Open-Meteo supports up to 16)
export const CACHE_TTL_SECONDS = 600; // cache weather ~10 min for repeated morning checks
