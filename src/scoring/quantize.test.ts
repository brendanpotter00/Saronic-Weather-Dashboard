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

  it('strips binary-float noise so the directional round picks the right digit', () => {
    // 0.7 * 10 === 7.000000000000001 in JS; a naive Math.ceil of that would jump the answer to 0.8.
    expect(quantizeReading(Factor.Wave, 0.7)).toBe(0.7);
  });

  it('FACTOR_DECIMALS is the shared precision source for rounding and display', () => {
    expect(FACTOR_DECIMALS[Factor.Wind]).toBe(1);
    expect(FACTOR_DECIMALS[Factor.Wave]).toBe(1);
    expect(FACTOR_DECIMALS[Factor.Visibility]).toBe(1);
    expect(FACTOR_DECIMALS[Factor.Precipitation]).toBe(2);
  });
});
