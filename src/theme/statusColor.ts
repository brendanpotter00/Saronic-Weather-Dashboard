// The one place the domain's go/caution/no-go vocabulary maps to MUI's palette. Kept apart
// from `theme.ts` because it changes for a different reason: this changes when we add or
// re-map a Status; `theme.ts` changes when we retune the actual colours. Every badge, line
// segment, and legend swatch reads this, so the legend can never drift from the cells.

import { Status } from '../scoring/status';

// MUI palette keys that carry a `.main`/`.contrastText` pair — the intent colours. Tara's
// status colours ARE these MUI intents (go=success, caution=warning, no-go=error), so any
// MUI component that takes a `color` prop (Chip, Alert, Button) gets the right colour for free.
export type StatusPaletteKey = 'success' | 'warning' | 'error';

export const STATUS_TO_PALETTE: Record<Status, StatusPaletteKey> = {
  [Status.Go]: 'success',
  [Status.Caution]: 'warning',
  [Status.NoGo]: 'error',
};

// Short, glanceable words for the badge/legend. The domain value is `no-go`; Tara reads "NO-GO".
export const STATUS_LABEL: Record<Status, string> = {
  [Status.Go]: 'GO',
  [Status.Caution]: 'CAUTION',
  [Status.NoGo]: 'NO-GO',
};

// The MUI sx colour token for a status's solid fill — `success.main` / `warning.main` /
// `error.main`. The status strip, the big status word, the day-detail badge, and the factor cells
// all paint with this, so the one `${...}.main` idiom lives here next to the map it reads instead
// of being restated at each call site.
export function statusMainColor(status: Status): string {
  return `${STATUS_TO_PALETTE[status]}.main`;
}
