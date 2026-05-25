// The app's shared domain vocabulary — the combined, normalized model every layer reasons in. Raw
// Open-Meteo response shapes live in `forecast/responseTypes.ts`.

// One fused, daylight-only hour. A factor is `null` when the API had no reading — treated as
// fail-safe NO-GO (it must never read as a GO), surfaced via `complete`.
export interface CombinedHour {
  time: string; // ISO 8601 with site UTC offset, e.g. "2026-05-23T06:00:00-05:00"
  windSpeedKn: number | null;
  waveHeightFt: number | null; // null = marine unavailable or no matching hour
  precipitationIn: number | null;
  visibilityMiles: number | null;
  complete: boolean; // true only when all 4 factors are present
}

export interface DayForecast {
  date: string; // calendar day key "YYYY-MM-DD" (a day label, not an instant)
  sunriseTime: string | null; // ISO 8601 with site offset; null if omitted
  sunsetTime: string | null;
  daylightDurationSeconds: number | null;
  hours: CombinedHour[]; // daylight-only, chronological
  complete: boolean; // true only with metadata to evaluate a window (sunrise/sunset/duration) AND ≥1 daylight hour
}

export interface CombinedForecast {
  site: { latitude: number; longitude: number };
  marineSite: { latitude: number; longitude: number } | null; // different grid — surfaced, not hidden
  timezone: string;
  days: DayForecast[]; // ordered by daily.time
  marineAvailable: boolean; // false if the marine fetch failed (graceful degradation)
}
