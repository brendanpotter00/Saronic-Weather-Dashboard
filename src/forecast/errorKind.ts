// Classify a forecast-fetch failure into a small, finite kind ONCE, here at the data layer,
// so the UI maps a kind to copy and never branches on raw status codes itself (the project's
// "shape data at the lowest level, keep the frontend dumb" rule — the same reason normalize.ts
// emits domain units). The raw RTK error shape (FetchBaseQueryError | SerializedError) is
// plumbing; the kind is what's user-actionable: a transient blip is worth a retry, a rate-limit
// means "wait", and bad data won't fix itself by retrying.

import type { FetchBaseQueryError } from '@reduxjs/toolkit/query/react';
import type { SerializedError } from '@reduxjs/toolkit';

export type ForecastErrorKind = 'offline' | 'rateLimited' | 'server' | 'badData' | 'unknown';

export function classifyForecastError(
  error: FetchBaseQueryError | SerializedError | undefined,
): ForecastErrorKind {
  if (!error) return 'unknown';
  // Only FetchBaseQueryError carries a `status` discriminant; a SerializedError (a thrown JS
  // error RTK serialized) does not, so anything without one falls through to 'unknown'.
  if ('status' in error) {
    const { status } = error;
    // The network never reached the server, so there's no HTTP status to read.
    if (status === 'FETCH_ERROR' || status === 'TIMEOUT_ERROR') return 'offline';
    // Reached the server but the body wasn't the forecast we can parse — retrying alone
    // is unlikely to help (CUSTOM_ERROR is what our own queryFn emits for a malformed body).
    if (status === 'PARSING_ERROR' || status === 'CUSTOM_ERROR') return 'badData';
    if (typeof status === 'number') {
      if (status === 429) return 'rateLimited'; // free-tier cap hit — wait, then retry
      if (status >= 500) return 'server'; // upstream trouble — usually transient
    }
  }
  return 'unknown';
}
