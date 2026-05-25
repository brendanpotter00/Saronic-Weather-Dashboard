// Presentational formatting — the ONE place the UI turns the data layer's real-number,
// domain-unit values into display strings. This is deliberately NOT in the data/scoring
// layers: those keep values as real numbers with the unit in the field name (the project's
// "never bake units into a string" rule), so comparisons stay numeric. Turning 18 into
// "18 kn", 0 into "none", or null into "—" is pure display vocabulary and lives here, used by
// every cell so the formatting can't drift component to component.

import { Factor } from '../scoring/status';

// Shown when a reading is missing (null). A no-reading factor scored NO-GO upstream; here it's
// just "we have no number to show".
export const MISSING_DISPLAY = '—';

const DOW = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const WEEKDAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export interface DayLabel {
  dow: string; // "SAT"
  weekday: string; // "Saturday"
  dayNum: number; // 24
  month: string; // "May"
}

// Parse the "YYYY-MM-DD" calendar key into its parts WITHOUT constructing a UTC instant:
// `new Date("2026-05-24")` is parsed as UTC midnight and can roll back a day in a western
// timezone. Building from local Y/M/D components keeps the weekday correct everywhere.
export function formatDayLabel(dateKey: string): DayLabel {
  const [year, month, day] = dateKey.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return { dow: DOW[d.getDay()], weekday: WEEKDAY[d.getDay()], dayNum: day, month: MONTH[month - 1] };
}

// The clock hour is already baked into the offset-aware ISO string (e.g. "...T06:00:00-05:00"
// is 06:00 site-local), so read it straight from the characters — no Date, no re-applying an
// offset, no DST surprises.
function clockParts(iso: string): { hour: number; minute: number } {
  return { hour: Number(iso.slice(11, 13)), minute: Number(iso.slice(14, 16)) };
}

function meridiem(hour: number): { h12: number; ap: 'AM' | 'PM' } {
  const ap = hour < 12 ? 'AM' : 'PM';
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return { h12, ap };
}

// "6 AM", "7 PM" — compact, for the hourly rows. An empty ISO (an unevaluable window's blank
// start/end time) degrades to the missing dash rather than fabricating "12 AM" from Number('').
export function formatHourLabel(iso: string): string {
  if (!iso) return MISSING_DISPLAY;
  const { h12, ap } = meridiem(clockParts(iso).hour);
  return `${h12} ${ap}`;
}

// "6:13 AM" — precise, for the exact sunrise/sunset times in the window control's daylight line.
export function formatClockTime(iso: string): string {
  const { hour, minute } = clockParts(iso);
  const { h12, ap } = meridiem(hour);
  return `${h12}:${String(minute).padStart(2, '0')} ${ap}`;
}

// "6 AM", "8 PM" — a bare clock hour from an integer 0–23, for the available-window bounds and
// its picker (no ISO string, no minutes).
export function formatHourOfDay(hour: number): string {
  const { h12, ap } = meridiem(hour);
  return `${h12} ${ap}`;
}

// Compact factor names for the pinned card / confirm dialog's four small readings. The hourly
// table uses full words in its header ("Wind Speed"); these short forms fit a 64px cell.
export const FACTOR_LABEL: Record<Factor, string> = {
  [Factor.Wind]: 'Wind',
  [Factor.Wave]: 'Wave',
  [Factor.Precipitation]: 'Rain',
  [Factor.Visibility]: 'Vis',
};

// Visibility flattens out at the top of the API's range, so anything at/above this reads as a
// ceiling ("15+") rather than a noisy exact mile count that implies false precision.
const VISIBILITY_DISPLAY_CAP_MILES = 15;

// Unit suffixes appended to factor values for display (the table header carries only the name).
const KNOTS = 'kn';
const FEET = 'ft';
const INCHES = 'in';
const MILES = 'mi';

// Turn one factor reading into its cell string, with the unit appended to the number (the table
// header carries only the factor name now). Rounding is per factor: wind & visibility are whole
// numbers; wave is small so it keeps one decimal; rain is sub-inch so it keeps two — except a
// clean "0 in" for no rain, and a "<0.01 in" floor so real-but-tiny rain never rounds away to
// look dry (the exact wrong signal for a no-go factor). Visibility caps at the sensor ceiling
// ("15+ mi") rather than implying false precision. A missing reading (null) is a unit-less "—",
// distinct from a measured zero.
export function formatFactorValue(factor: Factor, value: number | null): string {
  if (value === null) return MISSING_DISPLAY;

  switch (factor) {
    case Factor.Wind:
      return `${Math.round(value)} ${KNOTS}`;
    case Factor.Wave:
      return `${value.toFixed(1)} ${FEET}`;
    case Factor.Precipitation:
      if (value === 0) return `0 ${INCHES}`;
      return value < 0.01 ? `<0.01 ${INCHES}` : `${value.toFixed(2)} ${INCHES}`;
    case Factor.Visibility:
      return value >= VISIBILITY_DISPLAY_CAP_MILES ? `${VISIBILITY_DISPLAY_CAP_MILES}+ ${MILES}` : `${Math.round(value)} ${MILES}`;
  }
}
