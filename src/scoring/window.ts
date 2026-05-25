// The "available time window" — the dashboard-wide band of clock hours a demo may run in. CONFIG,
// not data: one range applied to all 10 days, defaulting to the daylight the forecast covers.
// Scoring clips the demo-length scan to it and tags each hour in/out for dimming.

import type { DayForecast } from '../model';
import { Factor, FACTOR_ORDER, Status } from './status';
import { type Tier, STATUS_TO_TIER, TIER_TO_STATUS, TIER_NOGO, worstTier } from './tiers';
import type { ScoredDay, ScoredFactor, ScoredHour } from './scoring';

// Inclusive clock-hour bounds in site-local time, e.g. { startHour: 6, endHour: 20 } = 6 AM–8 PM.
export interface AvailableWindow {
  startHour: number; // inclusive
  endHour: number; // inclusive
}

// Earliest sunrise / latest sunset across the 10 days, by clock time-of-day. Shown as real times
// so "6 AM" isn't mistaken for the actual sunrise.
export interface DaylightEnvelope {
  sunriseTime: string | null; // ISO 8601 with site offset (null if no day reported it)
  sunsetTime: string | null;
}

// Fallback when no day reports sunrise/sunset: show everything, let per-hour status speak.
export const FULL_DAY_WINDOW: AvailableWindow = { startHour: 0, endHour: 23 };

// The clock hour is baked into the offset-aware ISO string ("...T06:00:00-05:00" = 06:00 local), so
// read it straight from the characters — no Date, no re-applied offset, no DST surprises. Kept here
// (not imported from format.ts) so the scoring layer never depends on the presentation layer.
export function clockHour(iso: string): number {
  return Number(iso.slice(11, 13));
}

// Inside the available window? Both bounds inclusive.
export function isHourInWindow(iso: string, window: AvailableWindow): boolean {
  const hour = clockHour(iso);
  return hour >= window.startHour && hour <= window.endHour;
}

// Earliest sunrise / latest sunset, compared by clock time-of-day ("HH:MM:SS" sorts
// lexicographically) not calendar order — "earliest" means earliest in the morning, any day.
export function daylightEnvelope(days: DayForecast[]): DaylightEnvelope {
  const sunrises = days.map((day) => day.sunriseTime).filter((time): time is string => time !== null);
  const sunsets = days.map((day) => day.sunsetTime).filter((time): time is string => time !== null);
  const timeOfDay = (iso: string): string => iso.slice(11, 19);
  return {
    sunriseTime: sunrises.length ? sunrises.reduce((earliest, t) => (timeOfDay(t) < timeOfDay(earliest) ? t : earliest)) : null,
    sunsetTime: sunsets.length ? sunsets.reduce((latest, t) => (timeOfDay(t) > timeOfDay(latest) ? t : latest)) : null,
  };
}

// Default window: the span of actual daylight HOURS, unioned across days. Derived from the hours we
// have (night already dropped) NOT from rounding sunrise/sunset, which would invent an edge hour
// with no reading. Empty forecast → whole clock.
export function defaultAvailableWindow(days: DayForecast[]): AvailableWindow {
  const hours = days.flatMap((day) => day.hours.map((hour) => clockHour(hour.time)));
  if (hours.length === 0) return FULL_DAY_WINDOW;
  return { startHour: Math.min(...hours), endHour: Math.max(...hours) };
}

// Confine a chosen window to the daylight bounds before scoring echoes it back. A window the
// operator picked can outlive its data: a later refetch may roll the horizon forward so the
// daylight HOUR span shifts. Clamping here (not the UI) keeps the control's value in range.
export function clampWindow(window: AvailableWindow, bounds: AvailableWindow): AvailableWindow {
  const startHour = Math.max(window.startHour, bounds.startHour);
  const endHour = Math.min(window.endHour, bounds.endHour);
  // When the stored choice sits entirely outside the new bounds the window inverts (start >= end);
  // fall back to the full bounds, a valid non-empty range.
  return startHour < endHour ? { startHour, endHour } : bounds;
}

// ---- Pinning a named demo window ----
// The dashboard-wide scan deliberately never NAMES a demo block — picking the exact hours is the
// operator's call. Pinning IS that call: the operator points at the middle of a stretch, a
// fixed-length block centers on the hovered hour (centeredWindowStart), and we score THAT block
// (scoreNamedWindow). Both read the already-scored hours, so a pin re-scores on every refetch.

// Where a fixed-length block sits when the hovered hour is its center. Returns the block's START
// clock-hour, or null when the bounds can't host one block. Leans LATER for even lengths (no exact
// center) and clamps at dawn/dusk so every row stays pinnable with no dead zones.
export function centeredWindowStart(
  hoveredHour: number,
  lengthHours: number,
  bounds: AvailableWindow,
): number | null {
  // A block needs `lengthHours` consecutive hours; if the bounds can't seat one, no window.
  if (bounds.endHour - bounds.startHour + 1 < lengthHours) return null;

  // Center on the hovered hour (lean later for even lengths), then clamp so it never spills past dawn/dusk.
  const centered = hoveredHour - Math.floor((lengthHours - 1) / 2);
  const latestStart = bounds.endHour - lengthHours + 1;
  return Math.max(bounds.startHour, Math.min(centered, latestStart));
}

// The rolled-up score of one named demo block — what the pinned card and confirm dialog render.
export interface NamedWindowScore {
  startTime: string; // first hour of the block (ISO 8601 with site offset)
  endTime: string; // last hour of the block
  status: Status; // worst hour in the block; forced no-go when it can't be fully evaluated
  factors: Record<Factor, ScoredFactor>; // worst-in-window reading per factor
  complete: boolean; // false → missing hours/readings, so `status` is a fail-safe no-go
}

const FACTOR_ACCESSOR: Record<Factor, (hour: ScoredHour) => ScoredFactor> = {
  [Factor.Wind]: (hour) => hour.wind,
  [Factor.Wave]: (hour) => hour.wave,
  [Factor.Precipitation]: (hour) => hour.precipitation,
  [Factor.Visibility]: (hour) => hour.visibility,
};

// Higher value = worse for every factor EXCEPT visibility. Used ONLY to break ties when two hours
// share the worst tier, so the card shows the true peak/trough — never re-decides a status.
const FACTOR_WORSE_WHEN_HIGHER: Record<Factor, boolean> = {
  [Factor.Wind]: true,
  [Factor.Wave]: true,
  [Factor.Precipitation]: true,
  [Factor.Visibility]: false,
};

// The worse of two readings: higher tier wins; on a tie, the more extreme value (and a real number
// beats a missing one).
function worseReading(a: ScoredFactor, b: ScoredFactor, worseWhenHigher: boolean): ScoredFactor {
  const tierA = STATUS_TO_TIER[a.status];
  const tierB = STATUS_TO_TIER[b.status];
  if (tierA !== tierB) return tierA > tierB ? a : b;
  if (a.value === null) return b;
  if (b.value === null) return a;
  return (a.value > b.value) === worseWhenHigher ? a : b;
}

export function scoreNamedWindow(day: ScoredDay, startHour: number, lengthHours: number): NamedWindowScore {
  const endHour = startHour + lengthHours - 1;
  // The block: the day's already-scored hours in [startHour, endHour]. Filtering by clock-hour (not
  // array slice) means a gap yields a short block, caught by the `complete` gate below.
  const block = day.hours.filter((hour) => hour.clockHour >= startHour && hour.clockHour <= endHour);

  // Worst-in-window reading per factor. An empty block degrades to a missing no-go reading.
  const factors = Object.fromEntries(
    FACTOR_ORDER.map((factor) => {
      const readings = block.map(FACTOR_ACCESSOR[factor]);
      const worst =
        readings.length === 0
          ? { status: Status.NoGo, value: null }
          : readings.reduce((acc, reading) => worseReading(acc, reading, FACTOR_WORSE_WHEN_HIGHER[factor]));
      return [factor, worst];
    }),
  ) as Record<Factor, ScoredFactor>;

  // Evaluable only when the day is complete AND the block seats the full, gapless, all-complete
  // demo length. Anything less is a fail-safe no-go, surfaced via `complete`.
  const complete = day.complete && block.length === lengthHours && block.every((hour) => hour.complete);
  const windowTier: Tier = complete ? worstTier(block.map((hour) => STATUS_TO_TIER[hour.status])) : TIER_NOGO;

  return {
    startTime: block[0]?.time ?? '',
    endTime: block[block.length - 1]?.time ?? '',
    status: TIER_TO_STATUS[windowTier],
    factors,
    complete,
  };
}
