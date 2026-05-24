import { describe, it, expect } from 'vitest';
import {
  formatFactorValue,
  formatDayLabel,
  formatHourLabel,
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

  it('wind rounds to a whole knot with unit appended', () => {
    expect(formatFactorValue(Factor.Wind, 18.4)).toBe('18 kn');
    expect(formatFactorValue(Factor.Wind, 14.6)).toBe('15 kn');
  });

  it('wave keeps one decimal foot with unit appended', () => {
    expect(formatFactorValue(Factor.Wave, 2)).toBe('2.0 ft');
    expect(formatFactorValue(Factor.Wave, 2.34)).toBe('2.3 ft');
  });

  it('precipitation: clean "0 in" for no rain, and real-but-tiny rain never rounds away', () => {
    expect(formatFactorValue(Factor.Precipitation, 0)).toBe('0 in');
    expect(formatFactorValue(Factor.Precipitation, 0.004)).toBe('<0.01 in'); // would be "0.00" — the wrong signal
    expect(formatFactorValue(Factor.Precipitation, 0.04)).toBe('0.04 in');
  });

  it('visibility caps at the sensor ceiling and rounds otherwise, unit appended', () => {
    expect(formatFactorValue(Factor.Visibility, 16)).toBe('15+ mi');
    expect(formatFactorValue(Factor.Visibility, 15)).toBe('15+ mi');
    expect(formatFactorValue(Factor.Visibility, 7.2)).toBe('7 mi');
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
  });

  it('formatClockTime keeps minutes for sunrise/sunset', () => {
    expect(formatClockTime('2026-05-23T06:13:00-05:00')).toBe('6:13 AM');
    expect(formatClockTime('2026-05-23T19:42:00-05:00')).toBe('7:42 PM');
  });
});
