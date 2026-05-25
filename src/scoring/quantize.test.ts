import { describe, it, expect } from 'vitest';
import { quantizeReading, FACTOR_DECIMALS } from './quantize';
import { Factor } from './status';

describe('quantizeReading — one number for both the colour and the label', () => {
  it('wind & wave round UP, so a marginal reading never reads safer than reality', () => {
    expect(quantizeReading(Factor.Wind, 14.96)).toBe(15);
    expect(quantizeReading(Factor.Wind, 14.9)).toBe(14.9); // already at resolution -> unchanged
    expect(quantizeReading(Factor.Wave, 1.97)).toBe(2);
    expect(quantizeReading(Factor.Wave, 1.9)).toBe(1.9);
  });

  it('visibility rounds DOWN, so it never overstates how far you can see', () => {
    expect(quantizeReading(Factor.Visibility, 15900 / 1609.344)).toBe(9.8); // the reported May-24 11:00 reading
    expect(quantizeReading(Factor.Visibility, 9.96)).toBe(9.9);
    expect(quantizeReading(Factor.Visibility, 10)).toBe(10);
  });

  it('precipitation passes through (its display already partitions go/no-go cleanly)', () => {
    expect(quantizeReading(Factor.Precipitation, 0)).toBe(0);
    expect(quantizeReading(Factor.Precipitation, 0.004)).toBe(0.004);
  });

  it('a missing reading stays null (the fail-safe no-go carried from normalize.ts)', () => {
    for (const factor of Object.values(Factor)) {
      expect(quantizeReading(factor, null)).toBeNull();
    }
  });

  it('returns a value already at display resolution unchanged (float-noise safe)', () => {
    // roundToDecimals strips sub-1e-15 multiplication noise (toFixed(6)) before the directional
    // round, so a value already at 1-decimal resolution round-trips exactly rather than drifting
    // up (ceil) or down (floor). (0.7 * 10 is exactly 7 in JS — clean values are the common case;
    // the strip's real worst case is finer 2-decimal precision, documented in quantize.ts.)
    expect(quantizeReading(Factor.Wave, 0.7)).toBe(0.7);
    expect(quantizeReading(Factor.Visibility, 9.9)).toBe(9.9);
  });

  it('collapses a non-finite reading to the fail-safe null no-go (never a spurious go)', () => {
    // A NaN/Infinity must not reach the tier comparisons, where `NaN > limit` is false and would
    // score a bogus GO — the tool reading safer than reality. quantizeReading floors it to null.
    for (const factor of Object.values(Factor)) {
      expect(quantizeReading(factor, Number.NaN)).toBeNull();
      expect(quantizeReading(factor, Number.POSITIVE_INFINITY)).toBeNull();
    }
  });

  it('FACTOR_DECIMALS is the shared precision source for rounding and display', () => {
    expect(FACTOR_DECIMALS[Factor.Wind]).toBe(1);
    expect(FACTOR_DECIMALS[Factor.Wave]).toBe(1);
    expect(FACTOR_DECIMALS[Factor.Visibility]).toBe(1);
    expect(FACTOR_DECIMALS[Factor.Precipitation]).toBe(2);
  });
});
