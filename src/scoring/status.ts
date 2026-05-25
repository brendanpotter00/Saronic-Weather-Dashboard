// Public, render-ready vocabulary for the scoring layer (the badge colour, the factor label).
//
// Enum-style value+type pairs via a const object + derived union, not a real TS `enum`: this
// project's `erasableSyntaxOnly` tsconfig rejects enums (they emit non-erasable runtime JS).
export const Status = {
  Go: 'go',
  Caution: 'caution',
  NoGo: 'no-go',
} as const;
export type Status = (typeof Status)[keyof typeof Status];

export const Factor = {
  Wind: 'wind',
  Wave: 'wave',
  Precipitation: 'precipitation',
  Visibility: 'visibility',
} as const;
export type Factor = (typeof Factor)[keyof typeof Factor];

// Canonical factor order, shared by the scoring roll-up and the display grid so they can't drift.
export const FACTOR_ORDER: Factor[] = [Factor.Wind, Factor.Wave, Factor.Precipitation, Factor.Visibility];
