// Types for the weather data layer: faithful shapes for the two raw Open-Meteo
// responses (only the fields we request), plus the combined model the UI consumes.

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

// ----- Combined model the UI consumes -----
// One fused, daylight-only hour in the domain's units; only the 4 go/no-go factors.
// A factor is `null` when the API had no reading — the data layer treats a missing
// factor as fail-safe NO-GO (it must never read as a GO), surfaced via `complete`.
export interface CombinedHour {
  time: string; // ISO 8601 with site UTC offset, e.g. "2026-05-23T06:00:00-05:00"
  windSpeedKn: number | null; // knots (null = no reading = no-go)
  waveHeightFt: number | null; // feet (null = marine unavailable / no matching hour = no-go)
  precipitationIn: number | null; // inches (null = no reading = no-go)
  visibilityMiles: number | null; // miles, from meters (null = no reading = no-go)
  complete: boolean; // true only when all 4 factors are present; an incomplete hour can never be a GO
}

export interface DayForecast {
  date: string; // calendar day key "YYYY-MM-DD" (a day label, not an instant)
  sunriseTime: string | null; // ISO 8601 with site UTC offset (null if the API omitted it)
  sunsetTime: string | null; // ISO 8601 with site UTC offset (null if the API omitted it)
  daylightDurationSeconds: number | null; // seconds (null if the API omitted it)
  hours: CombinedHour[]; // daylight-only, chronological
  complete: boolean; // true only when the day has the metadata to evaluate a daylight window (sunrise/sunset/duration) AND ≥1 daylight hour; an incomplete day can never yield a valid window
}

export interface CombinedForecast {
  site: { latitude: number; longitude: number }; // resolved forecast cell
  marineSite: { latitude: number; longitude: number } | null; // resolved marine cell (different grid — surfaced, not hidden)
  timezone: string;
  days: DayForecast[]; // 10, ordered by daily.time
  marineAvailable: boolean; // false if the marine fetch failed (graceful degradation)
}
