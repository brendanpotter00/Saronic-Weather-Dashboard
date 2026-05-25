// Reduce a raw reading to the resolution we BOTH judge it at and show it at — the fix for a
// whole class of bug where the colour and the number disagreed. The dashboard used to compute a
// factor's tier from the full-precision value but round the value independently for display, so
// at a threshold boundary the two could contradict: a 9.88 mi visibility scored CAUTION (9.88 <
// 10) yet `Math.round` painted the label "10 mi" — the same "10 mi" that a genuine 10.2 reading
// showed in green. Quantizing ONCE here, and having scoring tier + display stringify that single
// number, makes the contradiction impossible: one value, one classification, one label.
//
// Direction is per factor and deliberately CONSERVATIVE — round toward the danger so the tool
// never reads safer than reality (a go/no-go safety call should err pessimistic, not optimistic):
//   - wind / wave  : higher is worse  -> round UP   (never understate a hazard)
//   - visibility   : lower is worse   -> round DOWN (never overstate how far you can see)
//   - precipitation: any rain is a no-go and its display already partitions cleanly ("0 in" =>
//     go vs any positive => no-go), so it's already contradiction-proof — left unrounded so the
//     bespoke "<0.01 in" floor in format.ts is preserved. It's the model the others copy.

import { Factor } from './status';

// Display resolution per factor (decimal places). The single source for BOTH the directional
// rounding below and `toFixed` in format.ts, so the number scoring classifies is exactly the
// number rendered — they can't drift to different precisions.
export const FACTOR_DECIMALS: Record<Factor, number> = {
  [Factor.Wind]: 1,
  [Factor.Wave]: 1,
  [Factor.Precipitation]: 2,
  [Factor.Visibility]: 1,
};

// Round to `decimals` places in one direction, stripping binary-float noise first: e.g.
// `1.97 * 10` is `19.700000000000003`, and a naive `Math.ceil` of that would jump to 2.0 (here
// correct) but `0.29 * 100` is `28.999999999999996`, where a naive `Math.floor` would snap to
// 0.28. `toFixed(6)` collapses that 1e-15 noise before the directional round decides the digit.
function roundToDecimals(value: number, decimals: number, direction: 'up' | 'down'): number {
  const scale = 10 ** decimals;
  const scaled = Number((value * scale).toFixed(6));
  const rounded = direction === 'up' ? Math.ceil(scaled) : Math.floor(scaled);
  return rounded / scale;
}

// The one number Tara sees and the tier is computed from. `null` (a missing reading) passes
// through untouched — it stays the fail-safe no-go it was upstream (see normalize.ts).
export function quantizeReading(factor: Factor, value: number | null): number | null {
  if (value === null) return null;
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
