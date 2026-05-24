import { describe, it, expect } from 'vitest';
import { buildCombinedForecast } from './combineForecasts';
import type { ForecastResponse, MarineResponse } from './responseTypes';

// Two days of forecast hours with a mix of day/night so the daylight filter is
// exercised. Parallel arrays, faithful to the API shape (precip mm, visibility m).
const forecast: ForecastResponse = {
  latitude: 30.37,
  longitude: -89.1,
  utc_offset_seconds: -18000,
  timezone: 'America/Chicago',
  hourly: {
    time: [
      '2026-05-23T05:00', // night  -> filtered
      '2026-05-23T06:00', // day    -> no marine match (wave null)
      '2026-05-23T07:00', // day    -> wave 2.0
      '2026-05-24T06:00', // day    -> wave 3.0
      '2026-05-24T07:00', // night  -> filtered
    ],
    wind_speed_10m: [8, 9, 10, 11, 12],
    precipitation: [0, 0, 0.2, 0, 0],
    visibility: [20000, 21000, 22000, 23000, 24000],
    is_day: [0, 1, 1, 1, 0],
  },
  daily: {
    time: ['2026-05-23', '2026-05-24'],
    sunrise: ['2026-05-23T05:57', '2026-05-24T05:56'],
    sunset: ['2026-05-23T19:55', '2026-05-24T19:56'],
    daylight_duration: [50280, 50400],
  },
};

// Marine is intentionally MISALIGNED with the forecast: different ordering,
// missing 2026-05-23T06:00, and indices that do not line up with the forecast
// arrays. A correct join must match on the ISO timestamp, not the array index.
const marine: MarineResponse = {
  latitude: 30.29,
  longitude: -89.12,
  utc_offset_seconds: -18000,
  timezone: 'America/Chicago',
  hourly: {
    time: ['2026-05-24T06:00', '2026-05-23T07:00', '2026-05-23T05:00'],
    wave_height: [3.0, 2.0, 9.9],
  },
};

describe('buildCombinedForecast', () => {
  it('keeps only daylight hours and standardizes timestamps to offset-aware ISO', () => {
    const result = buildCombinedForecast(forecast, marine);
    const allHours = result.days.flatMap((d) => d.hours);
    expect(allHours.map((h) => h.time)).toEqual([
      '2026-05-23T06:00:00-05:00',
      '2026-05-23T07:00:00-05:00',
      '2026-05-24T06:00:00-05:00',
    ]);
  });

  it('joins wave height by timestamp, not by array index', () => {
    const result = buildCombinedForecast(forecast, marine);
    const allHours = result.days.flatMap((d) => d.hours);
    const byTime = Object.fromEntries(allHours.map((h) => [h.time, h.waveHeightFt]));
    expect(byTime['2026-05-23T07:00:00-05:00']).toBe(2.0); // forecast idx 2, marine idx 1
    expect(byTime['2026-05-24T06:00:00-05:00']).toBe(3.0); // forecast idx 3, marine idx 0
  });

  it('falls back to null when a daylight hour has no marine match', () => {
    const result = buildCombinedForecast(forecast, marine);
    const day1 = result.days.find((d) => d.date === '2026-05-23')!;
    const sixAm = day1.hours.find((h) => h.time === '2026-05-23T06:00:00-05:00')!;
    expect(sixAm.waveHeightFt).toBeNull();
  });

  it('converts visibility to miles and precipitation to inches', () => {
    const result = buildCombinedForecast(forecast, marine);
    const sevenAm = result.days[0].hours.find((h) => h.time === '2026-05-23T07:00:00-05:00')!;
    expect(sevenAm.visibilityMiles).toBeCloseTo(22000 / 1609.344, 5);
    expect(sevenAm.precipitationIn).toBeCloseTo(0.2 / 25.4, 6);
  });

  it('groups hours into ordered days driven by daily.time, with metadata', () => {
    const result = buildCombinedForecast(forecast, marine);
    expect(result.days.map((d) => d.date)).toEqual(['2026-05-23', '2026-05-24']);
    expect(result.days[0].hours).toHaveLength(2);
    expect(result.days[1].hours).toHaveLength(1);
    expect(result.days[0].sunriseTime).toBe('2026-05-23T05:57:00-05:00');
    expect(result.marineAvailable).toBe(true);
    expect(result.marineSite).toEqual({ latitude: 30.29, longitude: -89.12 });
  });

  it('degrades gracefully when marine is null', () => {
    const result = buildCombinedForecast(forecast, null);
    const allHours = result.days.flatMap((d) => d.hours);
    expect(result.marineAvailable).toBe(false);
    expect(result.marineSite).toBeNull();
    expect(allHours).toHaveLength(3); // daylight hours still present
    expect(allHours.every((h) => h.waveHeightFt === null)).toBe(true);
    // Non-marine factors stay intact.
    expect(allHours[0].windSpeedKn).toBe(9);
    expect(allHours[0].visibilityMiles).toBeCloseTo(21000 / 1609.344, 5);
    expect(allHours.every((h) => h.complete === false)).toBe(true); // missing waves -> no GO
  });

  it('flags an hour incomplete when a factor is missing (fail-safe no-go)', () => {
    const result = buildCombinedForecast(forecast, marine);
    const day1 = result.days.find((d) => d.date === '2026-05-23')!;
    const sixAm = day1.hours.find((h) => h.time === '2026-05-23T06:00:00-05:00')!;
    expect(sixAm.waveHeightFt).toBeNull();
    expect(sixAm.complete).toBe(false); // missing wave -> cannot be a GO
    const sevenAm = day1.hours.find((h) => h.time === '2026-05-23T07:00:00-05:00')!;
    expect(sevenAm.complete).toBe(true); // all four factors present
  });

  it('carries null factors through instead of coercing a missing value to a passing read', () => {
    const withNulls: ForecastResponse = {
      ...forecast,
      hourly: {
        time: ['2026-05-23T06:00'],
        wind_speed_10m: [null],
        precipitation: [null],
        visibility: [null],
        is_day: [1],
      },
      daily: {
        time: ['2026-05-23'],
        sunrise: ['2026-05-23T05:57'],
        sunset: ['2026-05-23T19:55'],
        daylight_duration: [50280],
      },
    };
    const hour = buildCombinedForecast(withNulls, null).days[0].hours[0];
    expect(hour.windSpeedKn).toBeNull();
    expect(hour.precipitationIn).toBeNull(); // NOT 0 — a 0 would read as "no rain" = GO
    expect(hour.visibilityMiles).toBeNull();
    expect(hour.complete).toBe(false);
  });
});
