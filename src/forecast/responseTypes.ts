// Faithful shapes for the two raw Open-Meteo responses (only the fields we request).
// These are provider-specific and live with the data layer. The combined, normalized
// domain model the rest of the app consumes lives in `src/model.ts`.

// ----- Raw Forecast API response (api.open-meteo.com/v1/forecast) -----
// Parallel arrays: hourly.time[i] aligns index-for-index with every hourly.*[i].
export interface ForecastHourly {
  time: string[]; // ISO local, e.g. "2026-05-23T00:00"
  wind_speed_10m: (number | null)[]; // kn — null when the API has no reading for an hour
  precipitation: (number | null)[]; // mm — null when the API has no reading for an hour
  visibility: (number | null)[]; // METERS (raw — convert m -> mi); null when no reading
  is_day: number[]; // 1 day / 0 night
}

export interface ForecastDaily {
  time: string[]; // 10 date strings "2026-05-23"
  sunrise: string[]; // ISO local
  sunset: string[]; // ISO local
  daylight_duration: number[]; // seconds
}

export interface ForecastResponse {
  latitude: number; // resolved grid cell (snapped)
  longitude: number;
  utc_offset_seconds: number;
  timezone: string;
  hourly: ForecastHourly;
  daily: ForecastDaily;
}

// ----- Raw Marine API response (marine-api.open-meteo.com/v1/marine) -----
export interface MarineHourly {
  time: string[]; // same hourly cadence as Forecast, but a different grid cell
  wave_height: (number | null)[]; // ft (length_unit=imperial); null when no reading
}

export interface MarineResponse {
  latitude: number; // marine grid cell — differs from forecast cell, expected
  longitude: number;
  utc_offset_seconds: number;
  timezone: string;
  hourly: MarineHourly;
}
