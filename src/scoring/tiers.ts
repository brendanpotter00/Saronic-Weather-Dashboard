// The severity-tier machinery: how a single reading becomes a tier, how tiers map to/from the
// public Status, and how a set of tiers combines (worst wins). This changes when the BANDING
// logic changes — separate from the threshold numbers (`thresholds.ts`) and the public
// vocabulary (`status.ts`).

import { Status } from './status';
import {
  WIND_NOGO_KN,
  WIND_CAUTION_KN,
  WAVE_NOGO_FT,
  WAVE_CAUTION_FT,
  VISIBILITY_NOGO_MILES,
  VISIBILITY_GO_MILES,
  PRECIP_TRACE_IN,
} from './thresholds';

// Internal severity scale: worst-factor-wins is a max over these tiers. Kept numeric (not the
// string Status) so ordering is a plain `>` comparison.
export const TIER_GO = 0;
export const TIER_CAUTION = 1;
export const TIER_NOGO = 2;
export type Tier = 0 | 1 | 2;

export const TIER_TO_STATUS: Record<Tier, Status> = {
  [TIER_GO]: Status.Go,
  [TIER_CAUTION]: Status.Caution,
  [TIER_NOGO]: Status.NoGo,
};
export const STATUS_TO_TIER: Record<Status, Tier> = {
  [Status.Go]: TIER_GO,
  [Status.Caution]: TIER_CAUTION,
  [Status.NoGo]: TIER_NOGO,
};

// ---- Per-factor tiers (null = no reading = fail-safe no-go) ----
export function windTier(windSpeedKn: number | null): Tier {
  if (windSpeedKn === null) return TIER_NOGO;
  if (windSpeedKn > WIND_NOGO_KN) return TIER_NOGO;
  if (windSpeedKn >= WIND_CAUTION_KN) return TIER_CAUTION;
  return TIER_GO;
}

export function waveTier(waveHeightFt: number | null): Tier {
  if (waveHeightFt === null) return TIER_NOGO;
  if (waveHeightFt > WAVE_NOGO_FT) return TIER_NOGO;
  if (waveHeightFt >= WAVE_CAUTION_FT) return TIER_CAUTION;
  return TIER_GO;
}

export function precipitationTier(precipitationIn: number | null): Tier {
  if (precipitationIn === null) return TIER_NOGO;
  return precipitationIn > PRECIP_TRACE_IN ? TIER_NOGO : TIER_GO; // no caution tier
}

export function visibilityTier(visibilityMiles: number | null): Tier {
  if (visibilityMiles === null) return TIER_NOGO;
  // Inverted vs wind/wave: the low extreme is the danger, so the strict comparison sits at
  // the floor and the upper boundary is inclusive of the go ideal.
  if (visibilityMiles < VISIBILITY_NOGO_MILES) return TIER_NOGO;
  if (visibilityMiles < VISIBILITY_GO_MILES) return TIER_CAUTION;
  return TIER_GO;
}

// Worst-factor-wins: the highest (worst) tier in the set. reduce (not Math.max) keeps the
// result typed as Tier and avoids spread on a possibly-empty array.
export function worstTier(tiers: Tier[]): Tier {
  return tiers.reduce<Tier>((worst, tier) => (tier > worst ? tier : worst), TIER_GO);
}
