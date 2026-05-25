import { describe, it, expect } from 'vitest';
import type { FetchBaseQueryError } from '@reduxjs/toolkit/query/react';
import type { SerializedError } from '@reduxjs/toolkit';
import { classifyForecastError } from './errorKind';

// One case per ForecastErrorKind: the classifier is the single place a raw RTK error becomes a
// UI-actionable kind, so each branch (network/status-string vs HTTP number vs serialized) is pinned.
describe('classifyForecastError', () => {
  it('a network/timeout failure (no HTTP status) → offline', () => {
    expect(classifyForecastError({ status: 'FETCH_ERROR', error: 'down' })).toBe('offline');
    expect(classifyForecastError({ status: 'TIMEOUT_ERROR', error: 'slow' })).toBe('offline');
  });

  it('HTTP 429 → rateLimited (free-tier cap)', () => {
    expect(classifyForecastError({ status: 429, data: undefined })).toBe('rateLimited');
  });

  it('HTTP 5xx → server', () => {
    expect(classifyForecastError({ status: 500, data: undefined })).toBe('server');
    expect(classifyForecastError({ status: 503, data: undefined })).toBe('server');
  });

  it('a malformed body (CUSTOM_ERROR / PARSING_ERROR) → badData', () => {
    expect(classifyForecastError({ status: 'CUSTOM_ERROR', error: 'missing arrays' })).toBe('badData');
    const parsing: FetchBaseQueryError = {
      status: 'PARSING_ERROR',
      originalStatus: 200,
      data: 'not json',
      error: 'parse fail',
    };
    expect(classifyForecastError(parsing)).toBe('badData');
  });

  it('undefined, a serialized JS error, or an unmapped status → unknown', () => {
    expect(classifyForecastError(undefined)).toBe('unknown');
    const serialized: SerializedError = { name: 'TypeError', message: 'boom' };
    expect(classifyForecastError(serialized)).toBe('unknown');
    expect(classifyForecastError({ status: 404, data: undefined })).toBe('unknown'); // not transient, not our buckets
  });
});
