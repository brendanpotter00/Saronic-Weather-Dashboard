// App-level product decisions, independent of the weather provider. Changing
// these is a product call (how far to look ahead, how fresh the data must be),
// not an API-contract change — so they live here and are consumed by the API
// layer (forecastApi.ts).

export const FORECAST_DAYS = 10; // 10-day look-ahead (Open-Meteo supports up to 16)
export const CACHE_TTL_SECONDS = 600; // cache weather ~10 min for repeated morning checks

// A demo needs this many contiguous daylight hours to count as a runnable window.
// Physically a scoring parameter, but owned here: the reason it changes is a product
// call (Tara's demos got longer), not a change to the go/no-go math.
export const DEMO_WINDOW_HOURS = 6;
