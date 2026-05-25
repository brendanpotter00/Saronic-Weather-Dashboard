// The one place the domain's go/caution/no-go vocabulary maps to MUI's palette — read by every
// badge, line segment, and legend swatch so they can't drift.

import { Status } from '../scoring/status';

// MUI palette intent keys. The status colours ARE these intents (go=success, caution=warning,
// no-go=error), so any MUI component taking a `color` prop gets the right colour for free.
export type StatusPaletteKey = 'success' | 'warning' | 'error';

export const STATUS_TO_PALETTE: Record<Status, StatusPaletteKey> = {
  [Status.Go]: 'success',
  [Status.Caution]: 'warning',
  [Status.NoGo]: 'error',
};

// Short, glanceable words for the badge/legend (the domain value `no-go` displays as "NO-GO").
export const STATUS_LABEL: Record<Status, string> = {
  [Status.Go]: 'GO',
  [Status.Caution]: 'CAUTION',
  [Status.NoGo]: 'NO-GO',
};

// The MUI sx colour token for a status's solid fill (e.g. `success.main`). Centralized here so the
// `${...}.main` idiom isn't restated at every call site.
export function statusMainColor(status: Status): string {
  return `${STATUS_TO_PALETTE[status]}.main`;
}
