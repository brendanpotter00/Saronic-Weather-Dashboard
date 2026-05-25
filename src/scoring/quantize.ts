// Reduce a raw reading to the resolution we BOTH judge it at and show it at — the fix for a class
// of bug where the colour and the number disagreed: a 9.88 mi visibility scored CAUTION (9.88 < 10)
// yet rounded to "10 mi", the same label a genuine 10.2 reading showed in green. Quantizing ONCE
// here, then tiering AND stringifying that single number, makes the contradiction impossible.
//
// Direction is per factor and deliberately CONSERVATIVE — round toward the danger so the tool never
// reads safer than reality:
//   - wind / wave  : higher is worse  -> round UP
//   - visibility   : lower is worse   -> round DOWN
//   - precipitation: any rain is a no-go and "0 in" vs any positive already partitions cleanly, so
//     it's left unrounded (preserving the "<0.01 in" floor in format.ts).

import { Factor } from './status';

// Display resolution per factor. The single source for BOTH the directional rounding here and
// `toFixed` in format.ts, so scoring and display can't drift to different precisions.
export const FACTOR_DECIMALS: Record<Factor, number> = {
  [Factor.Wind]: 1,
  [Factor.Wave]: 1,
  [Factor.Precipitation]: 2,
  [Factor.Visibility]: 1,
};

// Round to `decimals` places in one direction, stripping binary-float noise first: `0.29 * 100` is
// `28.999999999999996`, which a naive `Math.floor` would snap to 0.28. `toFixed(6)` collapses that
// ~1e-15 noise before the directional round.
function roundToDecimals(value: number, decimals: number, direction: 'up' | 'down'): number {
  const scale = 10 ** decimals;
  const scaled = Number((value * scale).toFixed(6));
  const rounded = direction === 'up' ? Math.ceil(scaled) : Math.floor(scaled);
  return rounded / scale;
}

// The one number the operator sees and the tier is computed from. A null OR non-finite reading
// collapses to null so it stays the fail-safe no-go it was upstream. Guarding non-finite here
// matters: a NaN slipping into the tier comparisons scores a spurious GO (`NaN > limit` is false),
// the tool reading SAFER than reality.
export function quantizeReading(factor: Factor, value: number | null): number | null {
  if (value === null || !Number.isFinite(value)) return null;
  switch (factor) {
    case Factor.Wind:
    case Factor.Wave:
      return roundToDecimals(value, FACTOR_DECIMALS[factor], 'up');
    case Factor.Visibility:
      return roundToDecimals(value, FACTOR_DECIMALS[factor], 'down');
    case Factor.Precipitation:
      return value; // already contradiction-proof; see header note
  }
}
