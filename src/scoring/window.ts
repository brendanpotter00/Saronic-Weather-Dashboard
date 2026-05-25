// The "available time window" — the dashboard-wide band of clock hours a demo may run in. It is
// CONFIG, not data: one range applied to all 10 days (lifted out of any single day), defaulting
// to the daylight the forecast actually covers. Scoring clips the demo-length scan to this
// window — a day is a candidate only if a contiguous demo-length block fits INSIDE it — and tags
// each hour in/out so the UI can dim out-of-window hours. It lives in the scoring layer because
// it shapes the go/no-go scan; the UI only reads the echoed window and the per-hour flag.

import type { DayForecast } from '../model';
import { Factor, Status } from './status';
import { type Tier, STATUS_TO_TIER, TIER_TO_STATUS, TIER_GO, TIER_NOGO, worstTier } from './tiers';
import type { ScoredDay, ScoredFactor, ScoredHour } from './scoring';

// Inclusive clock-hour bounds in the site's local time, e.g. { startHour: 6, endHour: 20 } is
// 6 AM through 8 PM. Whole hours: the forecast is hourly and demos are scheduled on the hour.
export interface AvailableWindow {
  startHour: number; // earliest hour a demo may occupy (inclusive)
  endHour: number; // latest hour a demo may still be running (inclusive)
}

// The precise daylight span across the 10 days: the EARLIEST sunrise and the LATEST sunset by
// clock time-of-day (not calendar order). This is the exact context the rounded window derives
// from — the UI shows these real times so "6 AM" isn't mistaken for the actual sunrise.
export interface DaylightEnvelope {
  sunriseTime: string | null; // ISO 8601 with site offset (null if no day reported it)
  sunsetTime: string | null;
}

// Fallback when not a single day reports sunrise/sunset — never clip in the dark, just show
// everything and let the per-hour status speak.
export const FULL_DAY_WINDOW: AvailableWindow = { startHour: 0, endHour: 23 };

// The clock hour is baked into the offset-aware ISO string ("...T06:00:00-05:00" = 06:00
// site-local), so read it straight from the characters — same approach as format.ts: no Date,
// no re-applied offset, no DST surprises. Kept here rather than imported from the UI's format.ts
// so the scoring layer never depends on the presentation layer. Exported so `scoreHour` can stamp
// each ScoredHour with its hour-of-day, sparing components any timestamp parsing.
export function clockHour(iso: string): number {
  return Number(iso.slice(11, 13));
}

// Is this hour inside the available window? Both bounds inclusive — an hour at exactly endHour
// still counts. Used both to clip the candidacy scan and to tag hours for dimming.
export function isHourInWindow(iso: string, window: AvailableWindow): boolean {
  const hour = clockHour(iso);
  return hour >= window.startHour && hour <= window.endHour;
}

// Earliest sunrise / latest sunset across the days, compared by clock time-of-day ("HH:MM:SS" is
// lexicographically ordered) rather than calendar order — so "earliest" means earliest in the
// morning, on whichever day. Days missing the time are skipped.
export function daylightEnvelope(days: DayForecast[]): DaylightEnvelope {
  const sunrises = days.map((day) => day.sunriseTime).filter((time): time is string => time !== null);
  const sunsets = days.map((day) => day.sunsetTime).filter((time): time is string => time !== null);
  const timeOfDay = (iso: string): string => iso.slice(11, 19);
  return {
    sunriseTime: sunrises.length ? sunrises.reduce((earliest, t) => (timeOfDay(t) < timeOfDay(earliest) ? t : earliest)) : null,
    sunsetTime: sunsets.length ? sunsets.reduce((latest, t) => (timeOfDay(t) > timeOfDay(latest) ? t : latest)) : null,
  };
}

// The dashboard-wide default: the span of actual daylight HOURS the forecast provides, unioned
// across all days (earliest first hour → latest last hour). Derived from the hours we really have
// — the data layer already dropped night via is_day — NOT from rounding sunrise/sunset, which
// would invent an edge hour (a 5 AM before a 5:54 sunrise) that has no reading. So the default
// clips nothing real and the picker can never offer an empty hour. Empty forecast → whole clock.
export function defaultAvailableWindow(days: DayForecast[]): AvailableWindow {
  const hours = days.flatMap((day) => day.hours.map((hour) => clockHour(hour.time)));
  if (hours.length === 0) return FULL_DAY_WINDOW;
  return { startHour: Math.min(...hours), endHour: Math.max(...hours) };
}

// Confine a chosen window to the daylight bounds before scoring echoes it back. A window Tara
// picked can outlive the data it was picked against: a later refetch may roll the 10-day horizon
// forward so the earliest/latest daylight HOUR shifts, leaving her stored window reaching past the
// new bounds. Clamping here (not in the UI) means the control always receives an in-range window
// and never renders a Select value outside its own options.
export function clampWindow(window: AvailableWindow, bounds: AvailableWindow): AvailableWindow {
  const startHour = Math.max(window.startHour, bounds.startHour);
  const endHour = Math.min(window.endHour, bounds.endHour);
  // Clamping inverts the window (start >= end) only when the stored choice now sits entirely
  // outside the new bounds — there's no real overlap to keep, so fall back to the full bounds, a
  // valid non-empty range the scan and the picker can both consume.
  return startHour < endHour ? { startHour, endHour } : bounds;
}

// ---- Pinning a named demo window (the "pin a chosen window to the top" feature) ----
// The dashboard-wide scan deliberately never NAMES a demo block — picking the exact hours is
// Tara's call. Pinning IS that call: she points at the middle of a stretch, a fixed-length block
// centers on the hovered hour (centeredWindowStart), and we score THAT concrete block
// (scoreNamedWindow). Both read the already-scored hours, so a pinned window re-scores on every
// refetch with no card-level logic — that's how it "firms up each morning."

// Where a fixed-length block sits when the hovered hour is its center. The demo length is fixed,
// so picking a window is only choosing WHERE it sits. Returns the block's START clock-hour, or
// null when the bounds can't host a single block (fewer than `lengthHours` daylight hours).
//
// - Lean LATER: with an even length there's no exact center, so the hovered hour sits
//   floor((lengthHours - 1) / 2) hours into the block (2 before / 3 after for a 6-hour demo).
// - Clamp at dawn/dusk: near the edges the start clamps into
//   [bounds.startHour, bounds.endHour - lengthHours + 1] so the block grabs the earliest/latest
//   valid window instead of spilling past daylight — every row stays pinnable, no dead zones.
export function centeredWindowStart(
  hoveredHour: number,
  lengthHours: number,
  bounds: AvailableWindow,
): number | null {
  // A block needs `lengthHours` consecutive hours; if the bounds can't seat even one, no window.
  if (bounds.endHour - bounds.startHour + 1 < lengthHours) return null;

  // Center on the hovered hour, leaning LATER for even lengths (floor puts fewer hours before it),
  // then clamp into [startHour, endHour - lengthHours + 1] so the block never spills past dawn/dusk.
  const centered = hoveredHour - Math.floor((lengthHours - 1) / 2);
  const latestStart = bounds.endHour - lengthHours + 1;
  return Math.max(bounds.startHour, Math.min(centered, latestStart));
}

// The rolled-up score of one concrete, named demo block — what the pinned card and the confirm
// dialog render. Worst-hour-wins for the status; worst-in-window reading per factor for the cells.
export interface NamedWindowScore {
  startTime: string; // ISO 8601 with site offset — first hour of the block (for display)
  endTime: string; // ISO 8601 with site offset — last hour of the block (for display)
  status: Status; // worst hour in the block; forced no-go when the block can't be fully evaluated
  factors: Record<Factor, ScoredFactor>; // worst-in-window reading per factor
  limitingFactors: Factor[]; // factor(s) sitting at the rolled-up status ([] when GO)
  complete: boolean; // false → missing hours/readings, so `status` is a fail-safe no-go
}

const FACTORS: Factor[] = [Factor.Wind, Factor.Wave, Factor.Precipitation, Factor.Visibility];

const FACTOR_ACCESSOR: Record<Factor, (hour: ScoredHour) => ScoredFactor> = {
  [Factor.Wind]: (hour) => hour.wind,
  [Factor.Wave]: (hour) => hour.wave,
  [Factor.Precipitation]: (hour) => hour.precipitation,
  [Factor.Visibility]: (hour) => hour.visibility,
};

// Higher value = worse for every factor EXCEPT visibility (more miles = better). Used ONLY to
// break ties when two hours share the worst tier, so the card shows the true peak/trough rather
// than an arbitrary equally-rated hour. The go/no-go tier already came from tiers.ts — this never
// re-decides a status, it only picks which equally-rated value to display.
const FACTOR_WORSE_WHEN_HIGHER: Record<Factor, boolean> = {
  [Factor.Wind]: true,
  [Factor.Wave]: true,
  [Factor.Precipitation]: true,
  [Factor.Visibility]: false,
};

// The worse of two readings for one factor: higher tier wins; on a tie, the more extreme value in
// the factor's bad direction (and a real number beats a missing one, so the card shows a value).
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
  // The block is the day's already-scored hours that fall in [startHour, endHour]. Filtering by
  // clock-hour (not array slice) means a gap or a dropped hour simply yields a short block, which
  // the `complete` gate below catches.
  const block = day.hours.filter((hour) => hour.clockHour >= startHour && hour.clockHour <= endHour);

  // Worst-in-window reading per factor: reduce the block in the factor's bad direction. An empty
  // block (the start fell off the forecast) degrades to a missing no-go reading.
  const factors = Object.fromEntries(
    FACTORS.map((factor) => {
      const readings = block.map(FACTOR_ACCESSOR[factor]);
      const worst =
        readings.length === 0
          ? { status: Status.NoGo, value: null }
          : readings.reduce((acc, reading) => worseReading(acc, reading, FACTOR_WORSE_WHEN_HIGHER[factor]));
      return [factor, worst];
    }),
  ) as Record<Factor, ScoredFactor>;

  // Evaluable only when the day is complete AND the block seats the full, gapless, all-complete
  // demo length. Anything less is a fail-safe no-go (consistent with the incomplete-day gate and
  // the marine-down banner) — surfaced via `complete`, never silently treated as clear.
  const complete = day.complete && block.length === lengthHours && block.every((hour) => hour.complete);
  const windowTier: Tier = complete ? worstTier(block.map((hour) => STATUS_TO_TIER[hour.status])) : TIER_NOGO;

  return {
    startTime: block[0]?.time ?? '',
    endTime: block[block.length - 1]?.time ?? '',
    status: TIER_TO_STATUS[windowTier],
    factors,
    limitingFactors:
      windowTier === TIER_GO ? [] : FACTORS.filter((factor) => STATUS_TO_TIER[factors[factor].status] === windowTier),
    complete,
  };
}
