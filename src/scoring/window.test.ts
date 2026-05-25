import { describe, it, expect } from 'vitest';
import { centeredWindowStart, scoreNamedWindow } from './window';
import { scoreDay } from './scoring';
import { Status, Factor } from './status';
import type { CombinedHour, DayForecast } from '../model';

// ---- Fixtures (mirror scoring.test.ts: an all-clear hour, overridden one factor at a time) ----
const GO_FACTORS: Omit<CombinedHour, 'time'> = {
  windSpeedKn: 5,
  waveHeightFt: 1,
  precipitationIn: 0,
  visibilityMiles: 12,
  complete: true,
};

function iso(hourOfDay: number, date = '2026-05-23'): string {
  return `${date}T${String(hourOfDay).padStart(2, '0')}:00:00-05:00`;
}

function mkHour(hourOfDay: number, overrides: Partial<CombinedHour> = {}): CombinedHour {
  return { time: iso(hourOfDay), ...GO_FACTORS, ...overrides };
}

function mkDay(hours: CombinedHour[], overrides: Partial<DayForecast> = {}): DayForecast {
  return {
    date: '2026-05-23',
    sunriseTime: iso(6),
    sunsetTime: iso(19),
    daylightDurationSeconds: 46800,
    hours,
    complete: hours.length > 0,
    ...overrides,
  };
}

function goHours(startHour: number, count: number): CombinedHour[] {
  return Array.from({ length: count }, (_, i) => mkHour(startHour + i));
}

// centeredWindowStart works on plain clock-hour integers — no fixture needed.
describe('centeredWindowStart — center the fixed-length block on the hovered hour', () => {
  const bounds = { startHour: 6, endHour: 19 };

  it('centers leaning later (even length: 2 hours before the hovered hour for a 6h demo)', () => {
    expect(centeredWindowStart(10, 6, bounds)).toBe(8); // 10 - floor(5/2) = 8 → block 8..13
  });

  it('centers evenly for an odd length (2 before, 2 after)', () => {
    expect(centeredWindowStart(10, 5, bounds)).toBe(8); // 10 - floor(4/2) = 8 → block 8..12
  });

  it('clamps at dawn — early hovers grab the earliest window instead of spilling before sunrise', () => {
    expect(centeredWindowStart(6, 6, bounds)).toBe(6); // 6 - 2 = 4, clamped up to startHour 6
    expect(centeredWindowStart(7, 6, bounds)).toBe(6); // 7 - 2 = 5, clamped up to 6
  });

  it('clamps at dusk — late hovers grab the latest window that still fits', () => {
    expect(centeredWindowStart(19, 6, bounds)).toBe(14); // last start = 19 - 6 + 1 = 14
    expect(centeredWindowStart(18, 6, bounds)).toBe(14); // 18 - 2 = 16, clamped down to 14
  });

  it('returns null only when the bounds cannot host a single block', () => {
    expect(centeredWindowStart(10, 6, { startHour: 8, endHour: 12 })).toBeNull(); // span 5 < 6
  });

  it('handles a window that exactly fills the bounds', () => {
    expect(centeredWindowStart(10, 6, { startHour: 8, endHour: 13 })).toBe(8); // span 6 == 6
  });
});

describe('scoreNamedWindow — roll a concrete block up to one status + worst-in-window readings', () => {
  it('an all-clear block is GO with no limiting factors and the right ISO span', () => {
    const day = scoreDay(mkDay(goHours(7, 8)));
    const score = scoreNamedWindow(day, 8, 6); // block 8..13
    expect(score.status).toBe(Status.Go);
    expect(score.complete).toBe(true);
    expect(score.limitingFactors).toEqual([]);
    expect(score.startTime).toBe(iso(8));
    expect(score.endTime).toBe(iso(13));
  });

  it("takes the block's worst hour (one caution hour -> caution), naming the limiting factor", () => {
    const hours = goHours(7, 8);
    hours[3] = mkHour(10, { windSpeedKn: 16 }); // caution, inside an 8..13 block
    const day = scoreDay(mkDay(hours));
    const score = scoreNamedWindow(day, 8, 6);
    expect(score.status).toBe(Status.Caution);
    expect(score.limitingFactors).toEqual([Factor.Wind]);
  });

  it('a no-go hour anywhere in the block kills it', () => {
    const hours = goHours(7, 8);
    hours[4] = mkHour(11, { waveHeightFt: 5 }); // no-go
    const day = scoreDay(mkDay(hours));
    const score = scoreNamedWindow(day, 8, 6);
    expect(score.status).toBe(Status.NoGo);
    expect(score.limitingFactors).toContain(Factor.Wave);
  });

  it('reports the worst VALUE per factor, not just the worst tier (peak wind, lowest visibility)', () => {
    const hours = [
      mkHour(8, { windSpeedKn: 8, visibilityMiles: 12 }),
      mkHour(9, { windSpeedKn: 14, visibilityMiles: 10 }), // peak wind (still GO), lowest vis (still GO)
      mkHour(10, { windSpeedKn: 9, visibilityMiles: 15 }),
    ];
    const score = scoreNamedWindow(scoreDay(mkDay(hours)), 8, 3);
    expect(score.status).toBe(Status.Go); // all readings clear
    expect(score.factors[Factor.Wind].value).toBe(14);
    expect(score.factors[Factor.Visibility].value).toBe(10);
  });

  it('a block that spans a gap is incomplete -> fail-safe no-go', () => {
    // Hours 8 and 9 exist, 10 is missing → a 8..13 block has only 2 of 6 hours.
    const day = scoreDay(mkDay([mkHour(8), mkHour(9), mkHour(13), mkHour(14)]));
    const score = scoreNamedWindow(day, 8, 6);
    expect(score.complete).toBe(false);
    expect(score.status).toBe(Status.NoGo);
  });

  it('an incomplete hour inside the block forces no-go via the complete gate', () => {
    const hours = goHours(8, 6);
    hours[2] = mkHour(10, { complete: false });
    const score = scoreNamedWindow(scoreDay(mkDay(hours)), 8, 6);
    expect(score.complete).toBe(false);
    expect(score.status).toBe(Status.NoGo);
  });

  it('re-scores from the live forecast: the same block flips GO -> NO-GO when a reading worsens', () => {
    const calm = scoreNamedWindow(scoreDay(mkDay(goHours(8, 6))), 8, 6);
    expect(calm.status).toBe(Status.Go);

    const windy = goHours(8, 6);
    windy[3] = mkHour(11, { windSpeedKn: 25 }); // a later refetch shows wind building past the limit
    const rescored = scoreNamedWindow(scoreDay(mkDay(windy)), 8, 6);
    expect(rescored.status).toBe(Status.NoGo);
  });
});
