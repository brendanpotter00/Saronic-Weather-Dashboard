// The go/caution/no-go threshold bands, as numbers — the single place they live. The tier logic
// that consumes them is in `tiers.ts`.
//
// Pattern: the hard no-go limit (or, for visibility, the go ideal) is the one anchor per factor;
// the other boundary is DERIVED from it via a fraction — move an anchor and its band moves with it.

// Wind/wave anchor on the no-go ceiling, deriving the caution boundary DOWN from it.
export const WIND_NOGO_KN = 20;
export const WIND_CAUTION_FRACTION = 0.75;
export const WIND_CAUTION_KN = WIND_NOGO_KN * WIND_CAUTION_FRACTION; // 15 — at/above = caution

export const WAVE_NOGO_FT = 4;
export const WAVE_CAUTION_FRACTION = 0.5;
export const WAVE_CAUTION_FT = WAVE_NOGO_FT * WAVE_CAUTION_FRACTION; // 2 — at/above = caution

// Visibility is inverted (more miles = better): anchors on the no-go FLOOR and derives the go
// ideal UP from it.
export const VISIBILITY_NOGO_MILES = 3; // below this = no-go (the anchor)
export const VISIBILITY_CAUTION_FRACTION = 0.5;
export const VISIBILITY_GO_MILES =
  VISIBILITY_NOGO_MILES / VISIBILITY_CAUTION_FRACTION; // 6 — at/above = go

// Precipitation intentionally has NO threshold constant and NO caution tier: any rain is a no-go
// (optics demos), so the tier compares `> 0` directly. No epsilon — it would only pardon real rain.
