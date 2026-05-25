// Builders for the render-ready scored shapes the UI components consume, so each component test
// can spin up a realistic ScoredHour / ScoredDay / NamedWindowScore in one line and override just
// the field under test. Kept in src/test (excluded from coverage) so they're test scaffolding, not
// shipped code. Defaults describe an all-clear daylight hour with offset-aware timestamps, matching
// what the scoring layer emits.

import { Status, Factor } from '../scoring/status';
import type { ScoredFactor, ScoredHour, ScoredDay } from '../scoring/scoring';
import type { NamedWindowScore } from '../scoring/window';

export const SITE_OFFSET = '-05:00'; // America/Chicago (CDT), matching the data layer's stamps

export function scoredFactor(status: Status = Status.Go, value: number | null = 5): ScoredFactor {
  return { status, value };
}

// A clear daylight hour at `date` + `clockHour`. Override any field for a worse/incomplete reading.
export function scoredHour(date: string, clockHour: number, overrides: Partial<ScoredHour> = {}): ScoredHour {
  const hh = String(clockHour).padStart(2, '0');
  return {
    time: `${date}T${hh}:00:00${SITE_OFFSET}`,
    clockHour,
    wind: scoredFactor(Status.Go, 6),
    wave: scoredFactor(Status.Go, 1),
    precipitation: scoredFactor(Status.Go, 0),
    visibility: scoredFactor(Status.Go, 12),
    status: Status.Go,
    limitingFactors: [],
    complete: true,
    isInWindow: true,
    ...overrides,
  };
}

// A clear day of `hourCount` daylight hours starting at `startHour` (default 6 AM–5 PM).
export function scoredDay(date: string, overrides: Partial<ScoredDay> = {}): ScoredDay {
  return {
    date,
    hours: Array.from({ length: 12 }, (_, i) => scoredHour(date, 6 + i)),
    badge: Status.Go,
    isCandidate: true,
    complete: true,
    ...overrides,
  };
}

export function namedWindowScore(overrides: Partial<NamedWindowScore> = {}): NamedWindowScore {
  return {
    startTime: `2026-05-24T08:00:00${SITE_OFFSET}`,
    endTime: `2026-05-24T13:00:00${SITE_OFFSET}`,
    status: Status.Go,
    factors: {
      [Factor.Wind]: scoredFactor(Status.Go, 6),
      [Factor.Wave]: scoredFactor(Status.Go, 1),
      [Factor.Precipitation]: scoredFactor(Status.Go, 0),
      [Factor.Visibility]: scoredFactor(Status.Go, 12),
    },
    complete: true,
    ...overrides,
  };
}
