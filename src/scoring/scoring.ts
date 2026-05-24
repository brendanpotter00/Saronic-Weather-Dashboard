// Scoring orchestration: walks the normalized forecast and emits the render-ready tree the UI
// binds to. This is the business-policy layer — it changes when Tara's RULES change, not when
// the API changes — so it lives apart from the data layer (`forecast/`) and consumes only the
// shared domain model (`../model`). It emits Status values (and the limiting factor) so the UI
// stays presentational: it never re-derives a threshold or computes a worst-of-N.
//
// The pieces this composes live in sibling files by reason-to-change: public vocabulary in
// `status.ts`, threshold numbers in `thresholds.ts`, tier mechanics in `tiers.ts`. This file
// owns only the enrichment shape and the window algorithm.

import { DEMO_WINDOW_HOURS } from '../config/app';
import type { CombinedForecast, CombinedHour, DayForecast } from '../model';
import { Status, Factor } from './status';
import {
  type Tier,
  TIER_GO,
  TIER_NOGO,
  TIER_TO_STATUS,
  STATUS_TO_TIER,
  worstTier,
  windTier,
  waveTier,
  precipitationTier,
  visibilityTier,
} from './tiers';

// ---- Render-ready result shapes (what the UI consumes) ----
export interface ScoredFactor {
  status: Status;
  value: number | null; // echo of the source reading (null = no reading), for display
}

export interface ScoredHour {
  time: string; // pass-through ISO 8601 with site offset
  wind: ScoredFactor;
  wave: ScoredFactor;
  precipitation: ScoredFactor;
  visibility: ScoredFactor;
  status: Status; // worst of the 4 factors; an incomplete hour is always NoGo
  limitingFactors: Factor[]; // factor(s) that produced `status` ([] when GO)
  complete: boolean; // pass-through from CombinedHour
}

export interface ScoredDay {
  date: string; // pass-through "YYYY-MM-DD"
  hours: ScoredHour[]; // all daylight hours, scored (feeds the hourly drill-down)
  badge: Status; // best ACHIEVABLE status across contiguous demo-length windows; NoGo if none
  isCandidate: boolean; // badge !== NoGo — i.e. some in-bounds demo-length window exists
  complete: boolean; // pass-through from DayForecast
}

export interface ScoredForecast {
  timezone: string; // pass-through
  marineAvailable: boolean; // pass-through -> drives the UI "wave data unavailable" banner
  days: ScoredDay[];
}

// One clock-hour as an epoch-ms delta — the step between consecutive daylight hours.
const ONE_HOUR_MS = 60 * 60 * 1000;

interface FactorReading {
  factor: Factor;
  tier: Tier;
  value: number | null;
}

function toScoredFactor(reading: FactorReading): ScoredFactor {
  return { status: TIER_TO_STATUS[reading.tier], value: reading.value };
}

export function scoreHour(hour: CombinedHour): ScoredHour {
  const wind: FactorReading = { factor: Factor.Wind, tier: windTier(hour.windSpeedKn), value: hour.windSpeedKn };
  const wave: FactorReading = { factor: Factor.Wave, tier: waveTier(hour.waveHeightFt), value: hour.waveHeightFt };
  const precipitation: FactorReading = { factor: Factor.Precipitation, tier: precipitationTier(hour.precipitationIn), value: hour.precipitationIn };
  const visibility: FactorReading = { factor: Factor.Visibility, tier: visibilityTier(hour.visibilityMiles), value: hour.visibilityMiles };
  const readings = [wind, wave, precipitation, visibility];

  // Fail-safe: an incomplete hour (missing any factor) can never clear, regardless of the
  // factors that ARE present. Gate on `complete` (computed in the data layer) instead of
  // re-deriving the null checks, and floor to NO-GO defensively.
  const tier: Tier = hour.complete ? worstTier(readings.map((reading) => reading.tier)) : TIER_NOGO;

  return {
    time: hour.time,
    wind: toScoredFactor(wind),
    wave: toScoredFactor(wave),
    precipitation: toScoredFactor(precipitation),
    visibility: toScoredFactor(visibility),
    status: TIER_TO_STATUS[tier],
    // What's holding the hour back: the factor(s) sitting at the rolled-up tier. Empty when
    // GO — nothing is limiting a clear hour.
    limitingFactors:
      tier === TIER_GO ? [] : readings.filter((reading) => reading.tier === tier).map((reading) => reading.factor),
    complete: hour.complete,
  };
}

// Best status achievable by ANY contiguous demo-length daylight window — without naming the
// window (choosing one is out of scope). Returns the lowest (best) tier over every valid
// window, or NO-GO if no contiguous run of DEMO_WINDOW_HOURS exists.
function bestAchievableTier(hours: ScoredHour[]): Tier {
  if (hours.length < DEMO_WINDOW_HOURS) return TIER_NOGO;

  // Offset-aware ISO timestamps parse to true instants, so consecutive clock-hours differ by
  // exactly ONE_HOUR_MS. A gap, a dropped hour, or a DST jump shows up as a non-1h step and
  // correctly breaks the run — contiguity is judged by time, never by array adjacency.
  const tiers = hours.map((hour) => STATUS_TO_TIER[hour.status]);
  const epochMs = hours.map((hour) => Date.parse(hour.time));

  let best: Tier = TIER_NOGO;
  let runStart = 0; // index where the current contiguous-hour run began
  for (let i = 0; i < hours.length; i++) {
    if (i > 0 && (!Number.isFinite(epochMs[i]) || epochMs[i] - epochMs[i - 1] !== ONE_HOUR_MS)) {
      runStart = i; // contiguity broke — start a fresh run here
    }
    if (i - runStart + 1 >= DEMO_WINDOW_HOURS) {
      const windowTier = worstTier(tiers.slice(i - DEMO_WINDOW_HOURS + 1, i + 1));
      if (windowTier < best) best = windowTier;
      if (best === TIER_GO) return TIER_GO; // nothing beats an all-clear window
    }
  }
  return best;
}

export function scoreDay(day: DayForecast): ScoredDay {
  const hours = day.hours.map(scoreHour);
  // An incomplete day (missing sunrise/sunset/duration, or no daylight hours) can't host a
  // defensible window — short-circuit to NO-GO without scanning.
  const badgeTier: Tier = day.complete ? bestAchievableTier(hours) : TIER_NOGO;
  const badge = TIER_TO_STATUS[badgeTier];
  return {
    date: day.date,
    hours,
    badge,
    isCandidate: badge !== Status.NoGo,
    complete: day.complete,
  };
}

export function scoreForecast(forecast: CombinedForecast): ScoredForecast {
  return {
    timezone: forecast.timezone,
    marineAvailable: forecast.marineAvailable,
    days: forecast.days.map(scoreDay),
  };
}
