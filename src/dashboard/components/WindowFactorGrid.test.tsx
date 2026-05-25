import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { WindowFactorGrid } from './WindowFactorGrid';
import { renderWithTheme } from '../../test/renderWithTheme';
import { namedWindowScore } from '../../test/fixtures';

describe('WindowFactorGrid', () => {
  it('renders all four factors with their labels and formatted values', () => {
    renderWithTheme(<WindowFactorGrid factors={namedWindowScore().factors} />);

    expect(screen.getByText('Wind')).toBeInTheDocument();
    expect(screen.getByText('Wave')).toBeInTheDocument();
    expect(screen.getByText('Rain')).toBeInTheDocument();
    expect(screen.getByText('Vis')).toBeInTheDocument();

    expect(screen.getByText('6.0 kn')).toBeInTheDocument();
    expect(screen.getByText('1.0 ft')).toBeInTheDocument();
    expect(screen.getByText('0 in')).toBeInTheDocument();
    expect(screen.getByText('12.0 mi')).toBeInTheDocument();
  });
});
