// Constants for talking to Open-Meteo: hosts, request variables, and unit flags.

// Two APIs, two hosts. Their responses are joined by the hourly time[] arrays.
export const FORECAST_BASE_URL = 'https://api.open-meteo.com/v1/forecast';
export const MARINE_BASE_URL = 'https://marine-api.open-meteo.com/v1/marine';

// timezone keeps time[] local to the site (without it the API returns UTC).
export const TIMEZONE = 'America/Chicago';

// Only the variables the go/no-go read consumes. is_day drives the daylight filter (demos are daytime).
export const FORECAST_HOURLY = ['wind_speed_10m', 'precipitation', 'visibility', 'is_day'] as const;

// Open-Meteo encodes is_day as 1=day / 0=night; the data layer keeps only daylight hours.
export const IS_DAYLIGHT = 1;
export const FORECAST_DAILY = ['sunrise', 'sunset', 'daylight_duration'] as const;
export const MARINE_HOURLY = ['wave_height'] as const;

// Unit flags. We request wind in knots (the operator's threshold unit) and marine wave height in
// feet. We deliberately do NOT send precipitation_unit=inch: on the forecast API it also flips
// visibility to feet, so we keep API defaults (precip mm, visibility m) and convert in normalize.ts.
export const WIND_SPEED_UNIT = 'kn';
export const LENGTH_UNIT = 'imperial'; // marine wave height in feet
