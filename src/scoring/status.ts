// Public, render-ready vocabulary for the scoring layer. These are what the UI binds to
// (a badge colour, a factor label) — so they live apart from the internal tier mechanics
// (`tiers.ts`) and the threshold numbers (`weatherThresholds.ts`). This file changes only when we
// add or rename a status or a factor, not when Tara's numbers or the banding logic change.
//
// Enum-style value+type pairs. Real TS `enum`s are rejected by this project's
// `erasableSyntaxOnly` tsconfig (an enum emits non-erasable runtime JS that Vite/esbuild
// won't transpile), so we use the erasable equivalent: a frozen const object for the
// members (`Status.Go`) plus a derived union for the type. Same ergonomics, types-only.
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

// The canonical order the four factors are read and rendered in (wind, wave, rain, visibility).
// Lives beside `Factor` so the scoring roll-up (scoreNamedWindow) and the display grid
// (WindowFactorGrid) iterate one shared list and can't drift apart.
export const FACTOR_ORDER: Factor[] = [Factor.Wind, Factor.Wave, Factor.Precipitation, Factor.Visibility];
