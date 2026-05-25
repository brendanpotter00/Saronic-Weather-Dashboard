import { describe, it, expect } from 'vitest';
import { Status } from '../scoring/status';
import { STATUS_TO_PALETTE, STATUS_LABEL, statusMainColor } from './statusColor';

// The status→colour/word mapping is safety-critical: a swapped entry would paint a no-go window
// green (or label it GO) while every render-based test stayed happy. Assert the mapping directly.
describe('statusColor', () => {
  it('maps each status to its MUI intent palette key (go=success, caution=warning, no-go=error)', () => {
    expect(STATUS_TO_PALETTE[Status.Go]).toBe('success');
    expect(STATUS_TO_PALETTE[Status.Caution]).toBe('warning');
    expect(STATUS_TO_PALETTE[Status.NoGo]).toBe('error');
  });

  it('labels each status with the glanceable word the operator reads', () => {
    expect(STATUS_LABEL[Status.Go]).toBe('GO');
    expect(STATUS_LABEL[Status.Caution]).toBe('CAUTION');
    expect(STATUS_LABEL[Status.NoGo]).toBe('NO-GO');
  });

  it('statusMainColor returns the solid-fill `.main` token for each status', () => {
    expect(statusMainColor(Status.Go)).toBe('success.main');
    expect(statusMainColor(Status.Caution)).toBe('warning.main');
    expect(statusMainColor(Status.NoGo)).toBe('error.main');
  });
});
