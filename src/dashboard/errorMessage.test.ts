import { describe, it, expect } from 'vitest';
import { FORECAST_ERROR_COPY } from './errorMessage';
import type { ForecastErrorKind } from '../forecast/errorKind';

// Every ForecastErrorKind must map to non-empty copy: the alert always renders a title + detail
// and offers a Retry, so a blank string would ship an empty/Untitled alert. The Record<kind, ...>
// type already forces a key per kind at compile time; this pins that each value is non-empty.
const ALL_KINDS: ForecastErrorKind[] = ['offline', 'rateLimited', 'server', 'badData', 'unknown'];

describe('FORECAST_ERROR_COPY', () => {
  it('has non-empty title and detail for every error kind', () => {
    for (const kind of ALL_KINDS) {
      const copy = FORECAST_ERROR_COPY[kind];
      expect(copy.title.trim().length).toBeGreaterThan(0);
      expect(copy.detail.trim().length).toBeGreaterThan(0);
    }
  });

  it('covers exactly the known kinds (no extra, no missing entries)', () => {
    expect(Object.keys(FORECAST_ERROR_COPY).sort()).toEqual([...ALL_KINDS].sort());
  });
});
