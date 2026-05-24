// Normalize raw Open-Meteo values into the domain's canonical units and a single
// timestamp format, so every consumer (scoring, UI) reasons in the same terms.
// Pure functions — no React/RTK — so they're trivially unit-testable.

export const METERS_PER_MILE = 1609.344;
export const MILLIMETERS_PER_INCH = 25.4;

// Open-Meteo hourly/daily local time strings come at minute precision ("...T06:00").
const MINUTE_PRECISION_LENGTH = 16;

/**
 * Open-Meteo returns visibility in meters; Tara's thresholds are in miles.
 * Returns `null` for a missing reading (null/undefined/NaN) rather than coercing to
 * 0 — a fabricated "0 miles" is both a lie and (coincidentally) a no-go, so the
 * absence would be invisible. Null is carried through and treated as fail-safe no-go.
 */
export function metersToMiles(meters: number | null | undefined): number | null {
  if (meters == null || Number.isNaN(meters)) return null;
  return meters / METERS_PER_MILE;
}

/**
 * Open-Meteo returns precipitation in mm by default. We convert in code rather
 * than via precipitation_unit=inch, because that param also flips the forecast
 * API's visibility to feet — an unwanted side effect. See openMeteoConstants.ts.
 * Returns `null` for a missing reading: `null / 25.4 === 0` in JS would otherwise
 * read as "no rain" = a GO, the exact wrong-greenlight this tool exists to prevent.
 */
export function millimetersToInches(mm: number | null | undefined): number | null {
  if (mm == null || Number.isNaN(mm)) return null;
  return mm / MILLIMETERS_PER_INCH;
}

/**
 * Format Open-Meteo's local time string (e.g. "2026-05-23T06:00") as a full ISO 8601
 * timestamp WITH a given UTC offset (e.g. "2026-05-23T06:00:00-05:00").
 *
 * Why: the raw string has no offset, so `new Date(raw)` would resolve in the
 * browser's timezone and show the wrong wall-clock time for any non-Central user.
 * Prefer `localTimeToSiteIso` at call sites — it derives the *correct* offset for the
 * date (DST-aware); this primitive just stitches a known offset on.
 */
export function toSiteIso(localTime: string, utcOffsetSeconds: number): string {
  // Open-Meteo gives minute precision ("...T06:00", length 16); add seconds.
  const withSeconds =
    localTime.length === MINUTE_PRECISION_LENGTH ? `${localTime}:00` : localTime;
  return `${withSeconds}${formatUtcOffset(utcOffsetSeconds)}`;
}

/** Render an offset in seconds as an ISO 8601 offset, e.g. -18000 -> "-05:00". */
export function formatUtcOffset(utcOffsetSeconds: number): string {
  const sign = utcOffsetSeconds < 0 ? '-' : '+';
  const abs = Math.abs(utcOffsetSeconds);
  const hours = String(Math.floor(abs / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((abs % 3600) / 60)).padStart(2, '0');
  return `${sign}${hours}:${minutes}`;
}

/**
 * The UTC offset (in seconds) that `timeZone` was at on the instant whose local
 * wall-clock in that zone equals `localTime`. This is what makes the data layer
 * DST-correct: a single forecast-wide `utc_offset_seconds` would stamp the wrong
 * offset on the far side of a CDT/CST transition within a 10-day window.
 *
 * Method: interpret the wall-clock as UTC to get a first-guess instant, read the
 * zone's offset there, then shift to the true instant and re-read — this resolves
 * dates that sit just past a transition. The spring-forward gap (a wall time that
 * never existed) and fall-back overlap (a wall time that happens twice) are
 * inherently ambiguous; Open-Meteo only emits real local hours, and this returns a
 * single defensible offset for them.
 */
export function offsetSecondsForLocalTime(localTime: string, timeZone: string): number {
  const wallAsUtcMs = Date.parse(`${localTime}Z`);
  const firstGuess = offsetSecondsAtInstant(new Date(wallAsUtcMs), timeZone);
  // True instant ≈ wall - offset; re-read the offset there.
  const trueInstant = new Date(wallAsUtcMs - firstGuess * 1000);
  return offsetSecondsAtInstant(trueInstant, timeZone);
}

/** DST-aware sibling of `toSiteIso`: appends the offset correct for this date. */
export function localTimeToSiteIso(localTime: string, timeZone: string): string {
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
