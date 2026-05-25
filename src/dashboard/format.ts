// Presentational formatting — the ONE place the UI turns the data layer's real-number, domain-unit
// values into display strings, so formatting can't drift component to component.

import { Factor } from '../scoring/status';
import { FACTOR_DECIMALS } from '../scoring/quantize';

// Shown when a reading is missing (null) — "we have no number to show".
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

// Parse the "YYYY-MM-DD" key WITHOUT a UTC instant: `new Date("2026-05-24")` is UTC midnight and
// can roll back a day in a western timezone. Local Y/M/D components keep the weekday correct.
export function formatDayLabel(dateKey: string): DayLabel {
  const [year, month, day] = dateKey.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  // A malformed key → Invalid Date → degrade to a neutral placeholder rather than render "undefined".
  if (Number.isNaN(d.getTime())) {
    return { dow: MISSING_DISPLAY, weekday: MISSING_DISPLAY, dayNum: 0, month: MISSING_DISPLAY };
  }
  return { dow: DOW[d.getDay()], weekday: WEEKDAY[d.getDay()], dayNum: day, month: MONTH[month - 1] };
}

// Clock hour/minute read straight off the offset-aware ISO string — no Date, no DST surprises.
function clockParts(iso: string): { hour: number; minute: number } {
  return { hour: Number(iso.slice(11, 13)), minute: Number(iso.slice(14, 16)) };
}

function meridiem(hour: number): { h12: number; ap: 'AM' | 'PM' } {
  const ap = hour < 12 ? 'AM' : 'PM';
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return { h12, ap };
}

// "6 AM", "7 PM" — compact, for the hourly rows. Empty ISO → dash, not "12 AM" from Number('').
export function formatHourLabel(iso: string): string {
  if (!iso) return MISSING_DISPLAY;
  const { hour } = clockParts(iso);
  if (!Number.isFinite(hour)) return MISSING_DISPLAY; // malformed-but-nonempty ISO → dash, not "NaN AM"
  const { h12, ap } = meridiem(hour);
  return `${h12} ${ap}`;
}

// "6:13 AM" — precise, for the daylight line's sunrise/sunset times.
export function formatClockTime(iso: string): string {
  if (!iso) return MISSING_DISPLAY;
  const { hour, minute } = clockParts(iso);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return MISSING_DISPLAY;
  const { h12, ap } = meridiem(hour);
  return `${h12}:${String(minute).padStart(2, '0')} ${ap}`;
}

// "6 AM", "8 PM" — a bare clock hour from an integer 0–23, for the window bounds and picker.
export function formatHourOfDay(hour: number): string {
  if (!Number.isFinite(hour)) return MISSING_DISPLAY; // a NaN bound → dash, never "NaN AM"
  const { h12, ap } = meridiem(hour);
  return `${h12} ${ap}`;
}

// Compact factor names for the small cells (the hourly table header uses full words).
export const FACTOR_LABEL: Record<Factor, string> = {
  [Factor.Wind]: 'Wind',
  [Factor.Wave]: 'Wave',
  [Factor.Precipitation]: 'Rain',
  [Factor.Visibility]: 'Vis',
};

// Visibility flattens out at the top of the API's range, so anything at/above this reads as "15+"
// rather than implying false precision.
const VISIBILITY_DISPLAY_CAP_MILES = 15;

// Unit suffixes appended to factor values for display.
const KNOTS = 'kn';
const FEET = 'ft';
const INCHES = 'in';
const MILES = 'mi';

// Stringify one factor reading, unit appended. PURE STRINGIFIER: the value is already quantized by
// scoring (quantize.ts) and the tier computed from it, so this must NOT round across a threshold or
// the label could contradict the colour. Display vocabulary: "0 in" for no rain, a "<0.01 in" floor
// so tiny rain never reads as dry, a "15+ mi" visibility ceiling, and "—" for a missing reading.
export function formatFactorValue(factor: Factor, value: number | null): string {
  // null or non-finite (bad data) both collapse to the missing marker — never "NaN kn".
  if (value === null || !Number.isFinite(value)) return MISSING_DISPLAY;

  switch (factor) {
    case Factor.Wind:
      return `${value.toFixed(FACTOR_DECIMALS[Factor.Wind])} ${KNOTS}`;
    case Factor.Wave:
      return `${value.toFixed(FACTOR_DECIMALS[Factor.Wave])} ${FEET}`;
    case Factor.Precipitation:
      if (value === 0) return `0 ${INCHES}`;
      return value < 0.01 ? `<0.01 ${INCHES}` : `${value.toFixed(FACTOR_DECIMALS[Factor.Precipitation])} ${INCHES}`;
    case Factor.Visibility:
      return value >= VISIBILITY_DISPLAY_CAP_MILES
        ? `${VISIBILITY_DISPLAY_CAP_MILES}+ ${MILES}`
        : `${value.toFixed(FACTOR_DECIMALS[Factor.Visibility])} ${MILES}`;
  }
}
