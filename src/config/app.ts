// App-level product decisions, independent of the weather provider. Consumed by the API layer.

export const FORECAST_DAYS = 10; // 10-day look-ahead (Open-Meteo supports up to 16)
export const CACHE_TTL_SECONDS = 600; // cache weather ~10 min for repeated morning checks

// A demo needs this many contiguous daylight hours to count as a runnable window. DEFAULT; the
// dashboard can adjust it. Owned here because the reason it changes is a product call, not the
// go/no-go math.
export const DEMO_WINDOW_HOURS = 6;

// Bounds the adjustable demo-length picker. The ceiling just bounds the option list — it is NOT
// clamped to the window, so an over-long demo is selectable and simply scores zero candidates.
export const DEMO_MIN_HOURS = 1;
export const DEMO_MAX_HOURS = 12;
