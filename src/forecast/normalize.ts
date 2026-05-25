// Normalize raw Open-Meteo values into the domain's canonical units and one ISO timestamp format.

export const METERS_PER_MILE = 1609.344;
export const MILLIMETERS_PER_INCH = 25.4;
export const SECONDS_PER_HOUR = 3600;
export const SECONDS_PER_MINUTE = 60;

// Open-Meteo hourly/daily local time strings come at minute precision ("...T06:00").
const MINUTE_PRECISION_LENGTH = 16;

/**
 * The fail-safe guard for every go/no-go factor: usable only when finite, else `null`.
 * Returning `null` (never a coerced 0) is the point — a fabricated reading could read as a
 * passing GO, the exact wrong-greenlight this tool exists to prevent.
 */
export function finiteOrNull(value: number | null | undefined): number | null {
  // `typeof === 'number'` (not `!= null`) rejects a stray string/boolean instead of coercing it;
  // `Number.isFinite` additionally rejects NaN and ±Infinity.
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/** Convert visibility (meters from the API) to miles. `null` for a missing reading (see finiteOrNull). */
export function metersToMiles(meters: number | null | undefined): number | null {
  const value = finiteOrNull(meters);
  return value === null ? null : value / METERS_PER_MILE;
}

/**
 * Convert precipitation (mm from the API) to inches. We convert in code rather than via
 * precipitation_unit=inch, because that param also flips the forecast API's visibility to feet
 * (see openMeteoConstants.ts). `null` for a missing reading; a real 0 mm stays 0 (no rain).
 */
export function millimetersToInches(mm: number | null | undefined): number | null {
  const value = finiteOrNull(mm);
  return value === null ? null : value / MILLIMETERS_PER_INCH;
}

/**
 * Append a known UTC offset to Open-Meteo's offset-less local time string, e.g.
 * "2026-05-23T06:00" -> "2026-05-23T06:00:00-05:00". Without the offset `new Date(raw)` resolves
 * in the browser's timezone and shows the wrong wall-clock for any non-Central user. Prefer
 * `localTimeToSiteIso`, which derives the DST-correct offset; this just stitches on a known one.
 * `null` for a missing time string rather than fabricating "undefined-05:00".
 */
export function toSiteIso(
  localTime: string | null | undefined,
  utcOffsetSeconds: number,
): string | null {
  if (!localTime) return null;
  // Open-Meteo gives minute precision ("...T06:00", length 16); add seconds.
  const withSeconds =
    localTime.length === MINUTE_PRECISION_LENGTH ? `${localTime}:00` : localTime;
  return `${withSeconds}${formatUtcOffset(utcOffsetSeconds)}`;
}

/** Render an offset in seconds as an ISO 8601 offset, e.g. -18000 -> "-05:00". */
export function formatUtcOffset(utcOffsetSeconds: number): string {
  const sign = utcOffsetSeconds < 0 ? '-' : '+';
  const abs = Math.abs(utcOffsetSeconds);
  const hours = String(Math.floor(abs / SECONDS_PER_HOUR)).padStart(2, '0');
  const minutes = String(
    Math.floor((abs % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE),
  ).padStart(2, '0');
  return `${sign}${hours}:${minutes}`;
}

/**
 * The UTC offset (seconds) `timeZone` had at the instant whose local wall-clock equals `localTime`.
 * This is what makes the data layer DST-correct: a single forecast-wide `utc_offset_seconds` would
 * stamp the wrong offset across a CDT/CST transition inside the 10-day window. Method: read the
 * offset for the wall-clock-as-UTC, shift to the true instant, re-read — resolving dates just past
 * a transition. The spring-forward gap / fall-back overlap are inherently ambiguous, but Open-Meteo
 * only emits real local hours and the ambiguous overlap hour is nighttime (filtered before
 * scoring), so a single defensible offset is harmless.
 */
export function offsetSecondsForLocalTime(localTime: string, timeZone: string): number {
  const wallAsUtcMs = Date.parse(`${localTime}Z`);
  const firstGuess = offsetSecondsAtInstant(new Date(wallAsUtcMs), timeZone);
  // True instant ≈ wall - offset; re-read the offset there.
  const trueInstant = new Date(wallAsUtcMs - firstGuess * 1000);
  return offsetSecondsAtInstant(trueInstant, timeZone);
}

/**
 * DST-aware sibling of `toSiteIso`. Short-circuits on a missing time string BEFORE
 * `offsetSecondsForLocalTime`, which would otherwise `Date.parse("undefinedZ") -> NaN` and throw a
 * RangeError inside Intl.DateTimeFormat.
 */
export function localTimeToSiteIso(
  localTime: string | null | undefined,
  timeZone: string,
): string | null {
  if (!localTime) return null;
  return toSiteIso(localTime, offsetSecondsForLocalTime(localTime, timeZone));
}

/** The UTC offset (seconds) of `timeZone` at a known UTC `instant`. */
function offsetSecondsAtInstant(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instant);

  const f: Record<string, number> = {};
  for (const part of parts) if (part.type !== 'literal') f[part.type] = Number(part.value);

  // The zone's wall-clock for this instant, read back as if it were UTC.
  const wallAsUtcMs = Date.UTC(f.year, f.month - 1, f.day, f.hour, f.minute, f.second);
  return Math.round((wallAsUtcMs - instant.getTime()) / 1000);
}
