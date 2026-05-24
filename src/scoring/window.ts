// The "available time window" — the dashboard-wide band of clock hours a demo may run in. It is
// CONFIG, not data: one range applied to all 10 days (lifted out of any single day), defaulting
// to the daylight the forecast actually covers. Scoring clips the demo-length scan to this
// window — a day is a candidate only if a contiguous demo-length block fits INSIDE it — and tags
// each hour in/out so the UI can dim out-of-window hours. It lives in the scoring layer because
// it shapes the go/no-go scan; the UI only reads the echoed window and the per-hour flag.

import type { DayForecast } from '../model';

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
// so the scoring layer never depends on the presentation layer.
function clockHour(iso: string): number {
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
