import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { Status, Factor } from '../../scoring/status';
import { FactorCell } from './FactorCell';
import { renderWithTheme } from '../../test/renderWithTheme';

describe('FactorCell', () => {
  it('renders the formatted reading with its unit', () => {
    renderWithTheme(<FactorCell factor={Factor.Wind} scored={{ status: Status.Go, value: 6 }} />);
    expect(screen.getByText('6.0 kn')).toBeInTheDocument();
  });

  it('renders the missing dash when there is no reading', () => {
    renderWithTheme(<FactorCell factor={Factor.Wave} scored={{ status: Status.NoGo, value: null }} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('tints a no-go reading with the status colour, not the neutral ink', () => {
    // Exercises both colour branches: a clear factor stays neutral; a no-go one is coloured.
    renderWithTheme(
      <>
        <FactorCell factor={Factor.Wind} scored={{ status: Status.Go, value: 6 }} />
        <FactorCell factor={Factor.Visibility} scored={{ status: Status.NoGo, value: 2 }} />
      </>,
    );
    expect(screen.getByText('6.0 kn')).toBeInTheDocument();
    expect(screen.getByText('2.0 mi')).toBeInTheDocument();
  });
});
