// Scoring orchestration: walks the normalized forecast and emits the render-ready tree the UI
// binds to. This is the business-policy layer — it changes when Tara's RULES change, not when
// the API changes — so it lives apart from the data layer (`forecast/`) and consumes only the
// shared domain model (`../model`). It emits Status values (and the limiting factor) so the UI
// stays presentational: it never re-derives a threshold or computes a worst-of-N.
//
// The pieces this composes live in sibling files by reason-to-change: public vocabulary in
// `status.ts`, threshold numbers in `weatherThresholds.ts`, tier mechanics in `tiers.ts`. This file
// owns only the enrichment shape and the window algorithm.

import { DEMO_WINDOW_HOURS } from '../config/app';
import type { CombinedForecast, CombinedHour, DayForecast } from '../model';
import {
  type AvailableWindow,
  type DaylightEnvelope,
  clampWindow,
  clockHour,
  daylightEnvelope,
  defaultAvailableWindow,
  isHourInWindow,
} from './window';
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
  clockHour: number; // hour-of-day 0–23 read from `time` — the currency of window selection/pinning
  wind: ScoredFactor;
  wave: ScoredFactor;
  precipitation: ScoredFactor;
  visibility: ScoredFactor;
  status: Status; // worst of the 4 factors; an incomplete hour is always NoGo
  limitingFactors: Factor[]; // factor(s) that produced `status` ([] when GO)
  complete: boolean; // pass-through from CombinedHour
  isInWindow: boolean; // inside the dashboard's available window — drives dimming AND the candidacy scan
}

export interface ScoredDay {
  date: string; // pass-through "YYYY-MM-DD"
  hours: ScoredHour[]; // all daylight hours, scored (feeds the hourly drill-down)
  badge: Status; // best ACHIEVABLE status across contiguous demo-length windows; NoGo if none
  isCandidate: boolean; // badge !== NoGo — i.e. some in-bounds demo-length window exists
  complete: boolean; // pass-through from DayForecast
}

export interface ScoredForecast {
  site: CombinedForecast['site']; // pass-through: resolved forecast grid cell
  marineSite: CombinedForecast['marineSite']; // pass-through: resolved marine cell (different grid — surfaced, not hidden)
  timezone: string; // pass-through
  marineAvailable: boolean; // pass-through -> drives the UI "wave data unavailable" banner
  demoWindowHours: number; // effective demo length the scan used, echoed for the control
  availableWindow: AvailableWindow; // the effective dashboard-wide window the scan used, echoed so the UI control reads it as data
  daylightBounds: AvailableWindow; // widest daylight coverage — the hard min/max the window control clamps to (independent of the current window)
  daylightEnvelope: DaylightEnvelope; // precise earliest sunrise / latest sunset, shown as the window control's context line
  days: ScoredDay[];
}

// Dashboard-wide knobs the scan honors. Both optional: omit them and scoring falls back to the
// product defaults (DEMO_WINDOW_HOURS, widest daylight coverage), so callers/tests that don't
// care about the window stay unchanged.
export interface ScoringOptions {
  demoWindowHours?: number; // contiguous in-window hours a demo needs
  availableWindow?: AvailableWindow; // clock-hour band the candidacy scan is clipped to
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

export function scoreHour(hour: CombinedHour, isInWindow = true): ScoredHour {
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
    clockHour: clockHour(hour.time),
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
    isInWindow,
  };
}

// Best status achievable by ANY contiguous demo-length window — without naming the window
// (choosing one is out of scope). Returns the lowest (best) tier over every valid window, or
// NO-GO if no contiguous run of `demoWindowHours` exists. Callers pass the in-window hours, so
// "contiguous run" is automatically scoped to the available window.
function bestAchievableTier(hours: ScoredHour[], demoWindowHours: number): Tier {
  if (hours.length < demoWindowHours) return TIER_NOGO;

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
    if (i - runStart + 1 >= demoWindowHours) {
      const windowTier = worstTier(tiers.slice(i - demoWindowHours + 1, i + 1));
      if (windowTier < best) best = windowTier;
      if (best === TIER_GO) return TIER_GO; // nothing beats an all-clear window
    }
  }
  return best;
}

export function scoreDay(
  day: DayForecast,
  demoWindowHours: number = DEMO_WINDOW_HOURS,
  availableWindow?: AvailableWindow,
): ScoredDay {
  // Tag every hour in/out of the window (no window set → all in), keeping every hour for the
  // drill-down. The UI dims the out-of-window ones; here they just don't count toward a window.
  const hours = day.hours.map((hour) =>
    scoreHour(hour, availableWindow ? isHourInWindow(hour.time, availableWindow) : true),
  );
  // The demo-length scan runs ONLY inside the available window: a day is a candidate only if a
  // contiguous demo-length block fits within it. An incomplete day (missing metadata or no
  // daylight hours) can't host a defensible window — short-circuit to NO-GO without scanning.
  const scanHours = availableWindow ? hours.filter((hour) => hour.isInWindow) : hours;
  const badgeTier: Tier = day.complete ? bestAchievableTier(scanHours, demoWindowHours) : TIER_NOGO;
  const badge = TIER_TO_STATUS[badgeTier];
  return {
    date: day.date,
    hours,
    badge,
    isCandidate: badge !== Status.NoGo,
    complete: day.complete,
  };
}

export function scoreForecast(forecast: CombinedForecast, options: ScoringOptions = {}): ScoredForecast {
  // Resolve the effective knobs once and thread them down: an explicit choice wins, otherwise
  // the product defaults (and the widest-coverage window derived from the days' daylight).
  const demoWindowHours = options.demoWindowHours ?? DEMO_WINDOW_HOURS;
  const daylightBounds = defaultAvailableWindow(forecast.days);
  // An explicit window is confined to the daylight bounds (a stored choice can outrun a refetch);
  // with no explicit window we default to the full daylight coverage.
  const availableWindow = options.availableWindow
    ? clampWindow(options.availableWindow, daylightBounds)
    : daylightBounds;
  return {
    site: forecast.site,
    marineSite: forecast.marineSite,
    timezone: forecast.timezone,
    marineAvailable: forecast.marineAvailable,
    demoWindowHours,
    availableWindow,
    daylightBounds,
    daylightEnvelope: daylightEnvelope(forecast.days),
    days: forecast.days.map((day) => scoreDay(day, demoWindowHours, availableWindow)),
  };
}
