import { describe, it, expect } from 'vitest';
import { scoreForecast, scoreDay, scoreHour } from './scoring';
import { Status, Factor } from './status';
import { DEMO_WINDOW_HOURS } from '../config/app';
import type { CombinedForecast, CombinedHour, DayForecast } from '../model';

// An all-clear hour; tests override one factor at a time to probe a single boundary.
const GO_FACTORS: Omit<CombinedHour, 'time'> = {
  windSpeedKn: 5,
  waveHeightFt: 1,
  precipitationIn: 0,
  visibilityMiles: 12,
  complete: true,
};

// ISO 8601 with the site's fixed Central-Standard offset — what the data layer emits, so
// Date.parse gives a true instant and consecutive clock-hours are exactly 1h apart.
function iso(hourOfDay: number, date = '2026-05-23'): string {
  return `${date}T${String(hourOfDay).padStart(2, '0')}:00:00-05:00`;
}

function mkHour(hourOfDay: number, overrides: Partial<CombinedHour> = {}, date = '2026-05-23'): CombinedHour {
  return { time: iso(hourOfDay, date), ...GO_FACTORS, ...overrides };
}

// A complete day (metadata present + >=1 hour) built from an explicit hour list.
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

function goHours(startHour: number, count: number, date = '2026-05-23'): CombinedHour[] {
  return Array.from({ length: count }, (_, i) => mkHour(startHour + i, {}, date));
}

describe('enum-style vocabulary', () => {
  it('exposes string members', () => {
    expect(Status.Go).toBe('go');
    expect(Status.Caution).toBe('caution');
    expect(Status.NoGo).toBe('no-go');
    expect(Factor.Wind).toBe('wind');
  });
});

describe('scoreHour — factor boundaries (pins the derived caution thresholds)', () => {
  it('wind: < 15 GO, 15–20 CAUTION, > 20 NO-GO', () => {
    expect(scoreHour(mkHour(7, { windSpeedKn: 14.9 })).wind.status).toBe(Status.Go);
    expect(scoreHour(mkHour(7, { windSpeedKn: 15 })).wind.status).toBe(Status.Caution); // exactly the derived 20*0.75
    expect(scoreHour(mkHour(7, { windSpeedKn: 20 })).wind.status).toBe(Status.Caution);
    expect(scoreHour(mkHour(7, { windSpeedKn: 20.1 })).wind.status).toBe(Status.NoGo);
  });

  it('wave: < 2 GO, 2–4 CAUTION, > 4 NO-GO', () => {
    expect(scoreHour(mkHour(7, { waveHeightFt: 1.9 })).wave.status).toBe(Status.Go);
    expect(scoreHour(mkHour(7, { waveHeightFt: 2 })).wave.status).toBe(Status.Caution); // exactly the derived 4*0.5
    expect(scoreHour(mkHour(7, { waveHeightFt: 4 })).wave.status).toBe(Status.Caution);
    expect(scoreHour(mkHour(7, { waveHeightFt: 4.1 })).wave.status).toBe(Status.NoGo);
  });

  it('visibility (inverted): >= 10 GO, 3–10 CAUTION, < 3 NO-GO', () => {
    expect(scoreHour(mkHour(7, { visibilityMiles: 10 })).visibility.status).toBe(Status.Go); // exactly the derived 3/0.3
    expect(scoreHour(mkHour(7, { visibilityMiles: 9.9 })).visibility.status).toBe(Status.Caution);
    expect(scoreHour(mkHour(7, { visibilityMiles: 3 })).visibility.status).toBe(Status.Caution);
    expect(scoreHour(mkHour(7, { visibilityMiles: 2.9 })).visibility.status).toBe(Status.NoGo);
  });

  it('precipitation: only exactly zero is GO; any rain (even a trace) is NO-GO (no caution tier)', () => {
    expect(scoreHour(mkHour(7, { precipitationIn: 0 })).precipitation.status).toBe(Status.Go);
    expect(scoreHour(mkHour(7, { precipitationIn: 0.0001 })).precipitation.status).toBe(Status.NoGo); // boundary pinned at zero
    expect(scoreHour(mkHour(7, { precipitationIn: 0.002 })).precipitation.status).toBe(Status.NoGo);
    expect(scoreHour(mkHour(7, { precipitationIn: 0.01 })).precipitation.status).toBe(Status.NoGo);
  });
});

describe('scoreHour — worst-factor-wins and limiting factors', () => {
  it('rolls up to the worst factor', () => {
    const scored = scoreHour(mkHour(7, { windSpeedKn: 15, waveHeightFt: 5 })); // caution + no-go
    expect(scored.status).toBe(Status.NoGo);
    expect(scored.limitingFactors).toEqual([Factor.Wave]);
  });

  it('names every factor tied at the worst tier', () => {
    const scored = scoreHour(mkHour(7, { windSpeedKn: 16, visibilityMiles: 5 })); // both caution
    expect(scored.status).toBe(Status.Caution);
    expect(scored.limitingFactors).toEqual([Factor.Wind, Factor.Visibility]);
  });

  it('a fully clear hour has no limiting factors', () => {
    expect(scoreHour(mkHour(7)).limitingFactors).toEqual([]);
  });
});

describe('scoreHour — the complete fail-safe gate', () => {
  it('an incomplete hour is NO-GO even when every present factor would clear', () => {
    const scored = scoreHour(mkHour(7, { complete: false }));
    expect(scored.status).toBe(Status.NoGo);
  });

  it('a null factor scores NO-GO and is named limiting', () => {
    const scored = scoreHour(mkHour(7, { waveHeightFt: null, complete: false }));
    expect(scored.wave.status).toBe(Status.NoGo);
    expect(scored.status).toBe(Status.NoGo);
    expect(scored.limitingFactors).toContain(Factor.Wave);
  });
});

describe('scoreDay — badge from the best achievable demo-length window', () => {
  it('a clear 6-hour run is a GO candidate', () => {
    const day = scoreDay(mkDay(goHours(7, 6)));
    expect(day.badge).toBe(Status.Go);
    expect(day.isCandidate).toBe(true);
  });

  it("the day badge is the window's worst hour (one caution hour -> caution)", () => {
    const hours = goHours(7, 6);
    hours[3] = mkHour(10, { windSpeedKn: 16 }); // caution
    const day = scoreDay(mkDay(hours));
    expect(day.badge).toBe(Status.Caution);
    expect(day.isCandidate).toBe(true);
  });

  it('fewer than 6 daylight hours cannot host a window', () => {
    const day = scoreDay(mkDay(goHours(7, 5)));
    expect(day.badge).toBe(Status.NoGo);
    expect(day.isCandidate).toBe(false);
  });

  it('an incomplete day short-circuits to NO-GO despite a clear 6-hour run', () => {
    const day = scoreDay(mkDay(goHours(7, 6), { complete: false }));
    expect(day.badge).toBe(Status.NoGo);
    expect(day.isCandidate).toBe(false);
    expect(day.hours).toHaveLength(6); // hours are still scored for the drill-down
  });
});

describe('scoreDay — contiguity by timestamp, not array index', () => {
  it('a dropped middle hour breaks the run (5 + gap + 5 is not a candidate)', () => {
    const day = scoreDay(mkDay([...goHours(7, 5), ...goHours(13, 5)])); // 12:00 missing
    expect(day.isCandidate).toBe(false);
  });

  it('a clean 6-hour run after a gap still qualifies', () => {
    const day = scoreDay(mkDay([...goHours(7, 2), ...goHours(11, 6)])); // gap at 9–10, then 11–16
    expect(day.badge).toBe(Status.Go);
    expect(day.isCandidate).toBe(true);
  });

  it('one incomplete hour poisons windows it sits in, but a separate clean run clears', () => {
    const hours = goHours(7, 12);
    hours[2] = mkHour(9, { complete: false }); // every window over 7–12 includes this hour
    const day = scoreDay(mkDay(hours));
    expect(day.badge).toBe(Status.Go); // windows starting at 13:00+ avoid the bad hour
    expect(day.isCandidate).toBe(true);
  });

  it('one incomplete hour in a lone 6-hour run kills the day', () => {
    const hours = goHours(7, 6);
    hours[2] = mkHour(9, { complete: false });
    expect(scoreDay(mkDay(hours)).isCandidate).toBe(false);
  });
});

describe('scoreDay — daylight-window pass-through (the "possible window" vs the demo window)', () => {
  it('echoes sunrise/sunset/daylight duration straight through from the source day', () => {
    const day = scoreDay(
      mkDay(goHours(7, 6), {
        sunriseTime: iso(6),
        sunsetTime: iso(19),
        daylightDurationSeconds: 46800,
      }),
    );
    expect(day.sunriseTime).toBe(iso(6));
    expect(day.sunsetTime).toBe(iso(19));
    expect(day.daylightDurationSeconds).toBe(46800);
  });

  it('echoes the demo-window requirement (DEMO_WINDOW_HOURS) so the UI need not import config', () => {
    expect(scoreDay(mkDay(goHours(7, 6))).demoWindowHours).toBe(DEMO_WINDOW_HOURS);
  });

  it('passes a null daylight span through unchanged (incomplete metadata)', () => {
    const day = scoreDay(
      mkDay(goHours(7, 6), { sunriseTime: null, sunsetTime: null, daylightDurationSeconds: null }),
    );
    expect(day.sunriseTime).toBeNull();
    expect(day.sunsetTime).toBeNull();
    expect(day.daylightDurationSeconds).toBeNull();
  });
});

describe('scoreForecast — whole-tree enrichment and marine-down fail-safe', () => {
  it('passes timezone and marineAvailable through', () => {
    const forecast: CombinedForecast = {
      site: { latitude: 30.37, longitude: -89.1 },
      marineSite: { latitude: 30.29, longitude: -89.12 },
      timezone: 'America/Chicago',
      days: [mkDay(goHours(7, 6))],
      marineAvailable: true,
    };
    const scored = scoreForecast(forecast);
    expect(scored.timezone).toBe('America/Chicago');
    expect(scored.marineAvailable).toBe(true);
    expect(scored.site).toEqual({ latitude: 30.37, longitude: -89.1 });
    expect(scored.marineSite).toEqual({ latitude: 30.29, longitude: -89.12 });
    expect(scored.days[0].badge).toBe(Status.Go);
  });

  it('marine down: every wave null -> incomplete hours -> every day NO-GO, flag preserved', () => {
    const downHours = goHours(7, 6).map((h) => ({ ...h, waveHeightFt: null, complete: false }));
    const forecast: CombinedForecast = {
      site: { latitude: 30.37, longitude: -89.1 },
      marineSite: null,
      timezone: 'America/Chicago',
      days: [mkDay(downHours), mkDay(downHours)],
      marineAvailable: false,
    };
    const scored = scoreForecast(forecast);
    expect(scored.marineAvailable).toBe(false);
    expect(scored.marineSite).toBeNull(); // surfaced even when marine is down
    expect(scored.site).toEqual({ latitude: 30.37, longitude: -89.1 });
    expect(scored.days.every((d) => d.badge === Status.NoGo && !d.isCandidate)).toBe(true);
  });
});
