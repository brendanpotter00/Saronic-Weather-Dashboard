import { describe, it, expect } from 'vitest';
import { scoreForecast, scoreDay, scoreHour } from './scoring';
import type { ScoredFactor, ScoredHour } from './scoring';
import { defaultAvailableWindow, daylightEnvelope } from './window';
import { Status, Factor } from './status';
import { formatFactorValue } from '../dashboard/format';
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

// The value scoring stores is the SAME number that drives the tier, quantized to display
// resolution (see quantize.ts). These pin the two behaviours that fixed the reported bug.
describe('scoreHour — colour and label come from one quantized number', () => {
  it('the reported bug: a 9.88 mi visibility shows "9.8 mi" AND scores Caution (never a green "10 mi")', () => {
    const scored = scoreHour(mkHour(11, { visibilityMiles: 15900 / 1609.344 })); // live May-24 11:00 reading
    expect(scored.visibility.status).toBe(Status.Caution);
    expect(formatFactorValue(Factor.Visibility, scored.visibility.value)).toBe('9.8 mi');
  });

  it('conservative shift: a 14.96 kn wind rounds UP to "15.0 kn" and scores Caution, not a green "15 kn"', () => {
    const scored = scoreHour(mkHour(7, { windSpeedKn: 14.96 }));
    expect(scored.wind.status).toBe(Status.Caution);
    expect(formatFactorValue(Factor.Wind, scored.wind.value)).toBe('15.0 kn');
  });
});

// The headline regression guard, written as the inverse of the bug report ("a '10 mi' cell was
// orange next to green '10 mi' cells"). Because one quantized number feeds both the tier and the
// label, every distinct label string must map to exactly one status. Sweeping each factor finely
// across all its thresholds would FAIL on the old code (round-then-classify split) and passes now.
describe('label/colour can never contradict — no displayed value appears in two colours', () => {
  const readingFor = (scored: ScoredHour, factor: Factor): ScoredFactor => scored[factor];

  const sweepCases: { factor: Factor; field: keyof CombinedHour; from: number; to: number; step: number }[] = [
    { factor: Factor.Wind, field: 'windSpeedKn', from: 0, to: 30, step: 0.01 },
    { factor: Factor.Wave, field: 'waveHeightFt', from: 0, to: 8, step: 0.01 },
    { factor: Factor.Visibility, field: 'visibilityMiles', from: 0, to: 20, step: 0.01 },
    { factor: Factor.Precipitation, field: 'precipitationIn', from: 0, to: 1, step: 0.005 },
  ];

  for (const { factor, field, from, to, step } of sweepCases) {
    it(`${factor}: every distinct label maps to exactly one status`, () => {
      const labelToStatus = new Map<string, Status>();
      for (let raw = from; raw <= to + 1e-9; raw += step) {
        const v = Number(raw.toFixed(4));
        const reading = readingFor(scoreHour(mkHour(7, { [field]: v } as Partial<CombinedHour>)), factor);
        const label = formatFactorValue(factor, reading.value);
        const seen = labelToStatus.get(label);
        if (seen === undefined) labelToStatus.set(label, reading.status);
        else expect(`${label} -> ${reading.status}`).toBe(`${label} -> ${seen}`);
      }
    });
  }
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

// The dashboard-wide knobs: the available window clips the candidacy scan, the demo length is
// adjustable, and each hour is tagged in/out for dimming.
describe('scoreForecast — available window + adjustable demo length', () => {
  const window = (startHour: number, endHour: number) => ({ startHour, endHour });
  function oneDay(hours: CombinedHour[]): CombinedForecast {
    return {
      site: { latitude: 30.37, longitude: -89.1 },
      marineSite: { latitude: 30.29, longitude: -89.12 },
      timezone: 'America/Chicago',
      days: [mkDay(hours)],
      marineAvailable: true,
    };
  }

  it('tags each hour in/out of the window and echoes the window used', () => {
    const scored = scoreForecast(oneDay(goHours(7, 8)), { availableWindow: window(9, 12) }); // 7..14
    expect(scored.days[0].hours.map((h) => h.isInWindow)).toEqual([
      false, false, true, true, true, true, false, false,
    ]);
    expect(scored.availableWindow).toEqual(window(9, 12));
  });

  it('a window too short for the demo length yields no candidate', () => {
    // GO all day 7–18, but a 4-hour window (9–12) cannot hold a 6-hour block
    const scored = scoreForecast(oneDay(goHours(7, 12)), { availableWindow: window(9, 12), demoWindowHours: 6 });
    expect(scored.days[0].isCandidate).toBe(false);
  });

  it('a shorter demo length fits inside the same window', () => {
    const scored = scoreForecast(oneDay(goHours(7, 12)), { availableWindow: window(9, 12), demoWindowHours: 4 });
    expect(scored.days[0].badge).toBe(Status.Go);
    expect(scored.days[0].isCandidate).toBe(true);
  });

  it('clipping to the window excludes an out-of-window bad patch', () => {
    const hours = goHours(7, 12); // 7..18
    hours[0] = mkHour(7, { waveHeightFt: 5 }); // 7:00 NO-GO, but outside a 9–18 window
    const scored = scoreForecast(oneDay(hours), { availableWindow: window(9, 18), demoWindowHours: 6 });
    expect(scored.days[0].badge).toBe(Status.Go);
  });

  it('confines an explicit window to the daylight bounds it is echoed against', () => {
    // Only 9..12 of daylight exists (daylightBounds = {9, 12}); a window reaching past both ends
    // is clamped, so the control never renders a Select value outside its own options.
    const scored = scoreForecast(oneDay(goHours(9, 4)), { availableWindow: window(6, 20) });
    expect(scored.availableWindow).toEqual(window(9, 12));
  });
});

// defaultAvailableWindow spans the actual daylight HOURS present, so the picker never offers an
// hour with no reading (a 5 AM before a 5:54 sunrise).
describe('defaultAvailableWindow — the actual daylight-hour span across all days', () => {
  it('spans the earliest first hour to the latest last hour across days', () => {
    const days = [
      mkDay(goHours(7, 6)), // 7..12
      mkDay(goHours(6, 5)), // 6..10 → earliest hour 6
      mkDay(goHours(9, 8)), // 9..16 → latest hour 16
    ];
    expect(defaultAvailableWindow(days)).toEqual({ startHour: 6, endHour: 16 });
  });

  it('tracks the hours present, not the rounded sun times (no phantom pre-sunrise hour)', () => {
    // Sunrise is ~05:54, but the daylight hours the data layer kept run 06:00–19:00, so the
    // window starts at 6 (never an empty 5 AM).
    expect(defaultAvailableWindow([mkDay(goHours(6, 14))])).toEqual({ startHour: 6, endHour: 19 });
  });

  it('falls back to the full day when there are no hours', () => {
    expect(defaultAvailableWindow([mkDay([], { complete: false })])).toEqual({ startHour: 0, endHour: 23 });
  });
});

// daylightEnvelope reports the precise sun times (the context line), independent of the hour grid.
describe('daylightEnvelope — earliest sunrise / latest sunset by clock time', () => {
  it('picks the earliest sunrise and the latest sunset across days', () => {
    const days = [
      mkDay(goHours(7, 6), { sunriseTime: '2026-05-23T06:18:00-05:00', sunsetTime: '2026-05-23T19:42:00-05:00' }),
      mkDay(goHours(7, 6), { sunriseTime: '2026-05-24T06:03:00-05:00', sunsetTime: '2026-05-24T19:54:00-05:00' }),
    ];
    expect(daylightEnvelope(days)).toEqual({
      sunriseTime: '2026-05-24T06:03:00-05:00',
      sunsetTime: '2026-05-24T19:54:00-05:00',
    });
  });

  it('is null on both ends when no day reports times', () => {
    const days = [mkDay(goHours(7, 6), { sunriseTime: null, sunsetTime: null })];
    expect(daylightEnvelope(days)).toEqual({ sunriseTime: null, sunsetTime: null });
  });
});
