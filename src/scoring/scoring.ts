// Scoring orchestration: walks the normalized forecast and emits the render-ready tree the UI binds
// to. It consumes the shared domain model (`../model`) and emits Status values + the limiting
// factor so the UI stays presentational — it never re-derives a threshold or computes a worst-of-N.

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
import { quantizeReading } from './quantize';

export interface ScoredFactor {
  status: Status;
  value: number | null; // the source reading echoed for display (null = no reading)
}

export interface ScoredHour {
  time: string;
  clockHour: number; // hour-of-day 0–23; the currency of window selection/pinning
  wind: ScoredFactor;
  wave: ScoredFactor;
  precipitation: ScoredFactor;
  visibility: ScoredFactor;
  status: Status; // worst of the 4 factors; an incomplete hour is always NoGo
  limitingFactors: Factor[]; // factor(s) that produced `status` ([] when GO)
  complete: boolean;
  isInWindow: boolean; // inside the available window — drives dimming and the candidacy scan
}

export interface ScoredDay {
  date: string;
  hours: ScoredHour[];
  badge: Status; // best ACHIEVABLE status across contiguous demo-length windows; NoGo if none
  isCandidate: boolean; // badge !== NoGo — some in-bounds demo-length window exists
  complete: boolean;
}

// Several fields are echoed back so the UI controls read the effective scan inputs as data.
export interface ScoredForecast {
  site: CombinedForecast['site'];
  marineSite: CombinedForecast['marineSite'];
  timezone: string;
  marineAvailable: boolean; // drives the "wave data unavailable" banner
  demoWindowHours: number; // effective demo length, echoed for the control
  availableWindow: AvailableWindow; // effective window, echoed for the control
  daylightBounds: AvailableWindow; // widest daylight coverage — hard min/max the window control clamps to
  daylightEnvelope: DaylightEnvelope; // earliest sunrise / latest sunset, the control's context line
  days: ScoredDay[];
}

// Dashboard-wide knobs the scan honors. Both optional — omit them and scoring falls back to the
// product defaults, so callers/tests that don't care about the window stay unchanged.
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
  // Quantize ONCE, then tier AND store that same number — so the colour (tier) and the label
  // (value) can't disagree at a threshold boundary. See quantize.ts.
  const windValue = quantizeReading(Factor.Wind, hour.windSpeedKn);
  const waveValue = quantizeReading(Factor.Wave, hour.waveHeightFt);
  const precipitationValue = quantizeReading(Factor.Precipitation, hour.precipitationIn);
  const visibilityValue = quantizeReading(Factor.Visibility, hour.visibilityMiles);

  const wind: FactorReading = { factor: Factor.Wind, tier: windTier(windValue), value: windValue };
  const wave: FactorReading = { factor: Factor.Wave, tier: waveTier(waveValue), value: waveValue };
  const precipitation: FactorReading = { factor: Factor.Precipitation, tier: precipitationTier(precipitationValue), value: precipitationValue };
  const visibility: FactorReading = { factor: Factor.Visibility, tier: visibilityTier(visibilityValue), value: visibilityValue };
  const readings = [wind, wave, precipitation, visibility];

  // Fail-safe: an incomplete hour can never clear. Gate on `complete` (computed in the data layer)
  // and floor to NO-GO.
  const tier: Tier = hour.complete ? worstTier(readings.map((reading) => reading.tier)) : TIER_NOGO;

  return {
    time: hour.time,
    clockHour: clockHour(hour.time),
    wind: toScoredFactor(wind),
    wave: toScoredFactor(wave),
    precipitation: toScoredFactor(precipitation),
    visibility: toScoredFactor(visibility),
    status: TIER_TO_STATUS[tier],
    // The factor(s) sitting at the rolled-up tier; empty when GO.
    limitingFactors:
      tier === TIER_GO ? [] : readings.filter((reading) => reading.tier === tier).map((reading) => reading.factor),
    complete: hour.complete,
    isInWindow,
  };
}

// Best status achievable by ANY contiguous demo-length window — without naming the window (out of
// scope). Lowest (best) tier over every valid window, or NO-GO if none. Callers pass the in-window
// hours, so "contiguous run" is scoped to the available window.
function bestAchievableTier(hours: ScoredHour[], demoWindowHours: number): Tier {
  if (hours.length < demoWindowHours) return TIER_NOGO;

  // Offset-aware ISO timestamps parse to true instants, so consecutive clock-hours differ by exactly
  // ONE_HOUR_MS. A gap / dropped hour / DST jump is a non-1h step that breaks the run — contiguity
  // is judged by time, never array adjacency.
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
  // Tag every hour in/out of the window (no window → all in), keeping every hour for the drill-down.
  const hours = day.hours.map((hour) =>
    scoreHour(hour, availableWindow ? isHourInWindow(hour.time, availableWindow) : true),
  );
  // The scan runs ONLY inside the available window. An incomplete day can't host a defensible
  // window — short-circuit to NO-GO without scanning.
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
  // Resolve the effective knobs once and thread them down: an explicit choice wins, else the
  // product defaults.
  const demoWindowHours = options.demoWindowHours ?? DEMO_WINDOW_HOURS;
  const daylightBounds = defaultAvailableWindow(forecast.days);
  // An explicit window is clamped to the daylight bounds (a stored choice can outrun a refetch);
  // with none, default to full daylight coverage.
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
