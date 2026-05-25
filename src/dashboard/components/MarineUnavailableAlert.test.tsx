import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { MarineUnavailableAlert } from './MarineUnavailableAlert';
import { renderWithTheme } from '../../test/renderWithTheme';

describe('MarineUnavailableAlert', () => {
  it('warns that wave data is down and every hour is treated as no-go', () => {
    renderWithTheme(<MarineUnavailableAlert />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(
      screen.getByText(/marine \(wave\) data is unavailable — every hour is treated as no-go/i),
    ).toBeInTheDocument();
  });
});
