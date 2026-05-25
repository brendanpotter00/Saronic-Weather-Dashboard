// Faithful shapes for the two raw Open-Meteo responses (only the fields we request); the
// normalized domain model lives in `src/model.ts`. Units are annotated because the raw provider
// field names don't carry them.

// Parallel arrays: hourly.time[i] aligns index-for-index with every hourly.*[i].
export interface ForecastHourly {
  time: string[]; // ISO local, e.g. "2026-05-23T00:00"
  wind_speed_10m: (number | null)[]; // kn; null = no reading
  precipitation: (number | null)[]; // mm; null = no reading
  visibility: (number | null)[]; // meters (raw — convert to miles); null = no reading
  is_day: number[]; // 1 day / 0 night
}

export interface ForecastDaily {
  time: string[]; // date strings "2026-05-23"
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

export interface MarineHourly {
  time: string[]; // same hourly cadence as Forecast, but a different grid cell
  wave_height: (number | null)[]; // ft (length_unit=imperial); null = no reading
}

export interface MarineResponse {
  latitude: number; // marine grid cell — differs from forecast cell, expected
  longitude: number;
  utc_offset_seconds: number;
  timezone: string;
  hourly: MarineHourly;
}
