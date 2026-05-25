// Tara's go/caution/no-go bands, as numbers. This is the single place her thresholds live;
// it changes when her RULES change, nothing else. The per-factor tier logic that consumes
// these is in `tiers.ts`.
//
// Pattern: the hard no-go limit (or, for visibility, the go ideal) is the one anchor per
// factor; the other boundary is DERIVED from it via a fraction, not set independently — move
// an anchor and its band moves with it. Each derived boundary is an explicit named constant
// (not computed inside a tier function) so a reader sees the whole band here and the value can
// be unit-tested directly. Fractions reproduce Tara's documented bands.

// Wind/wave anchor on the no-go ceiling and derive the caution boundary DOWN from it
// (good is below the caution line, no-go is above the limit).
export const WIND_NOGO_KN = 20;
export const WIND_CAUTION_FRACTION = 0.75;
export const WIND_CAUTION_KN = WIND_NOGO_KN * WIND_CAUTION_FRACTION; // 15 — at/above = caution

export const WAVE_NOGO_FT = 4;
export const WAVE_CAUTION_FRACTION = 0.5;
export const WAVE_CAUTION_FT = WAVE_NOGO_FT * WAVE_CAUTION_FRACTION; // 2 — at/above = caution

// Visibility is inverted (more miles = better): like wind/wave it anchors on the no-go
// limit — here a FLOOR, not a ceiling — and derives the go ideal UP from it via the fraction.
export const VISIBILITY_NOGO_MILES = 3; // below this = no-go (the anchor)
export const VISIBILITY_CAUTION_FRACTION = 0.5;
export const VISIBILITY_GO_MILES =
  VISIBILITY_NOGO_MILES / VISIBILITY_CAUTION_FRACTION; // 6 — at/above = go

// Precipitation intentionally has NO threshold constant and NO caution tier: any rain at all
// is a no-go (optics demos), so the tier compares `> 0` directly. `millimetersToInches` maps a
// real 0 mm to exactly 0 and a missing reading to null, so no epsilon is needed — and any
// epsilon would only pardon real rain, the exact wrong-greenlight this tool exists to prevent.
