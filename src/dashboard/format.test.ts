import { describe, it, expect } from 'vitest';
import {
  formatFactorValue,
  formatDayLabel,
  formatHourLabel,
  formatHourOfDay,
  formatClockTime,
  MISSING_DISPLAY,
} from './format';
import { Factor } from '../scoring/status';

describe('formatFactorValue', () => {
  it('null reads as the missing marker for every factor', () => {
    for (const factor of Object.values(Factor)) {
      expect(formatFactorValue(factor, null)).toBe(MISSING_DISPLAY);
    }
  });

  // format is now a pure stringifier: it renders at the factor's display precision and does NOT
  // round across a threshold (scoring already quantized the value — see quantize.ts). So a value
  // shown here is rendered verbatim to one decimal for wind, not snapped to a whole knot.
  it('wind renders one decimal knot with unit appended', () => {
    expect(formatFactorValue(Factor.Wind, 18.4)).toBe('18.4 kn');
    expect(formatFactorValue(Factor.Wind, 15)).toBe('15.0 kn');
  });

  it('wave keeps one decimal foot with unit appended', () => {
    expect(formatFactorValue(Factor.Wave, 2)).toBe('2.0 ft');
    expect(formatFactorValue(Factor.Wave, 2.3)).toBe('2.3 ft');
  });

  it('precipitation: clean "0 in" for no rain, and real-but-tiny rain never rounds away', () => {
    expect(formatFactorValue(Factor.Precipitation, 0)).toBe('0 in');
    expect(formatFactorValue(Factor.Precipitation, 0.004)).toBe('<0.01 in'); // would be "0.00" — the wrong signal
    expect(formatFactorValue(Factor.Precipitation, 0.04)).toBe('0.04 in');
  });

  it('visibility caps at the sensor ceiling and renders one decimal otherwise, unit appended', () => {
    expect(formatFactorValue(Factor.Visibility, 16)).toBe('15+ mi');
    expect(formatFactorValue(Factor.Visibility, 15)).toBe('15+ mi');
    expect(formatFactorValue(Factor.Visibility, 9.8)).toBe('9.8 mi'); // the boundary case: never "10 mi"
  });
});

describe('date & time formatting (offset-aware, no UTC drift)', () => {
  it('formatDayLabel parses the calendar key locally; dow is the weekday prefix', () => {
    const label = formatDayLabel('2026-05-24');
    expect(label.dayNum).toBe(24);
    expect(label.month).toBe('May');
    expect(label.dow).toBe(label.weekday.slice(0, 3).toUpperCase());
  });

  it('formatHourLabel reads the site-local clock hour straight from the ISO string', () => {
    expect(formatHourLabel('2026-05-23T06:00:00-05:00')).toBe('6 AM');
    expect(formatHourLabel('2026-05-23T00:00:00-05:00')).toBe('12 AM');
    expect(formatHourLabel('2026-05-23T12:00:00-05:00')).toBe('12 PM');
    expect(formatHourLabel('2026-05-23T19:00:00-05:00')).toBe('7 PM');
    expect(formatHourLabel('')).toBe(MISSING_DISPLAY); // unevaluable window → dash, not a fabricated "12 AM"
  });

  it('formatClockTime keeps minutes for sunrise/sunset', () => {
    expect(formatClockTime('2026-05-23T06:13:00-05:00')).toBe('6:13 AM');
    expect(formatClockTime('2026-05-23T19:42:00-05:00')).toBe('7:42 PM');
  });
});

// Defensive guards: the scoring layer shouldn't emit NaN or malformed keys, but if bad data ever
// reaches a formatter the cell must read as the missing marker, never "NaN kn" / "undefined".
describe('formatting guards against bad values', () => {
  it('a non-finite factor value reads as the missing marker, never "NaN <unit>"', () => {
    expect(formatFactorValue(Factor.Wind, NaN)).toBe(MISSING_DISPLAY);
    expect(formatFactorValue(Factor.Visibility, Infinity)).toBe(MISSING_DISPLAY);
  });

  it('formatDayLabel returns a neutral placeholder for a malformed key, not "undefined"', () => {
    const label = formatDayLabel('not-a-date');
    expect(label.dow).toBe(MISSING_DISPLAY);
    expect(label.weekday).toBe(MISSING_DISPLAY);
    expect(label.month).toBe(MISSING_DISPLAY);
  });

  it('formatHourLabel/formatClockTime degrade to the missing marker for empty or malformed ISO', () => {
    expect(formatClockTime('')).toBe(MISSING_DISPLAY);
    expect(formatHourLabel('2026-05-23TZZ:00')).toBe(MISSING_DISPLAY); // hour slice isn't a number
    expect(formatClockTime('2026-05-23TZZ:ZZ')).toBe(MISSING_DISPLAY);
  });

  it('formatHourOfDay reads as the missing marker for a non-finite hour, never "NaN AM"', () => {
    expect(formatHourOfDay(NaN)).toBe(MISSING_DISPLAY);
  });
});
