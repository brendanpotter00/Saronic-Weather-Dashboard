// The app's shared domain vocabulary — the combined, normalized model every layer
// reasons in. It is provider-agnostic: the data layer (`forecast/`) produces it and
// the business layer (`scoring/`) consumes it, so it lives at the root rather than
// inside either folder. Raw Open-Meteo response shapes live in `forecast/responseTypes.ts`.

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
