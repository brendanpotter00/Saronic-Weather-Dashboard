// Constants for talking to Open-Meteo: hosts, request variables, and unit flags.
// Pure declarative data — the request builders that consume these live in
// weatherApi.ts (their only caller).

// Two APIs, two hosts. Their responses are joined by the hourly time[] arrays.
export const FORECAST_BASE_URL = 'https://api.open-meteo.com/v1/forecast';
export const MARINE_BASE_URL = 'https://marine-api.open-meteo.com/v1/marine';

// timezone keeps time[] local to the site (without it the API returns UTC);
// for multi-city this would move onto each Site.
export const TIMEZONE = 'America/Chicago';

// Only the variables the go/no-go read consumes — not every field the API
// offers. is_day stays because it drives the daylight filter (demos are daytime).
export const FORECAST_HOURLY = ['wind_speed_10m', 'precipitation', 'visibility', 'is_day'] as const;
export const FORECAST_DAILY = ['sunrise', 'sunset', 'daylight_duration'] as const;
export const MARINE_HOURLY = ['wave_height'] as const;

// Unit flags. We request wind in knots (Tara's threshold unit) and marine wave
// height in feet. We deliberately do NOT send precipitation_unit=inch: on the
// forecast API it also flips visibility to feet (an unwanted side effect), so we
// keep API defaults (precip mm, visibility m) and convert both in normalize.ts.
export const WIND_SPEED_UNIT = 'kn';
export const LENGTH_UNIT = 'imperial'; // marine wave height in feet
