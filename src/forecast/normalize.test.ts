import { describe, it, expect } from 'vitest';
import {
  metersToMiles,
  millimetersToInches,
  toSiteIso,
  formatUtcOffset,
  offsetSecondsForLocalTime,
  localTimeToSiteIso,
} from './normalize';

describe('formatUtcOffset', () => {
  it('formats negative offsets (west of UTC)', () => {
    expect(formatUtcOffset(-18000)).toBe('-05:00'); // US Central (standard time)
  });
  it('formats positive half-hour offsets', () => {
    expect(formatUtcOffset(19800)).toBe('+05:30'); // India
  });
  it('formats UTC as +00:00', () => {
    expect(formatUtcOffset(0)).toBe('+00:00');
  });
});

describe('toSiteIso', () => {
  it('appends seconds and the site offset to a minute-precision local time', () => {
    expect(toSiteIso('2026-05-23T06:00', -18000)).toBe('2026-05-23T06:00:00-05:00');
  });
});

describe('metersToMiles', () => {
  it('converts meters to miles', () => {
    expect(metersToMiles(1609.344)).toBeCloseTo(1, 10);
    expect(metersToMiles(16093.44)).toBeCloseTo(10, 6);
  });
  it('returns null for a missing reading (never a fabricated 0)', () => {
    expect(metersToMiles(null)).toBeNull();
    expect(metersToMiles(undefined)).toBeNull();
    expect(metersToMiles(NaN)).toBeNull();
  });
});

describe('millimetersToInches', () => {
  it('converts millimeters to inches', () => {
    expect(millimetersToInches(25.4)).toBeCloseTo(1, 10);
    expect(millimetersToInches(0)).toBe(0); // a real 0 mm reading stays 0 (no rain)
  });
  it('returns null for a missing reading (a 0 would falsely read as "no rain")', () => {
    expect(millimetersToInches(null)).toBeNull();
    expect(millimetersToInches(undefined)).toBeNull();
    expect(millimetersToInches(NaN)).toBeNull();
  });
});

describe('offsetSecondsForLocalTime (DST-aware)', () => {
  it('resolves Central Daylight Time for summer dates', () => {
    expect(offsetSecondsForLocalTime('2026-07-01T12:00', 'America/Chicago')).toBe(-18000);
  });
  it('resolves Central Standard Time for winter dates', () => {
    expect(offsetSecondsForLocalTime('2026-01-01T12:00', 'America/Chicago')).toBe(-21600);
  });
});

describe('localTimeToSiteIso', () => {
  it('appends the offset correct for the date, not a fixed forecast-wide one', () => {
    expect(localTimeToSiteIso('2026-07-01T06:00', 'America/Chicago')).toBe(
      '2026-07-01T06:00:00-05:00',
    );
    expect(localTimeToSiteIso('2026-01-01T06:00', 'America/Chicago')).toBe(
      '2026-01-01T06:00:00-06:00',
    );
  });
});
