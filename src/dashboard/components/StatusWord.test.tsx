import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { Status } from '../../scoring/status';
import { StatusWord } from './StatusWord';
import { renderWithTheme } from '../../test/renderWithTheme';

describe('StatusWord', () => {
  it('renders the status label', () => {
    renderWithTheme(<StatusWord status={Status.Caution} sx={{ fontSize: '2rem' }} />);
    expect(screen.getByText('CAUTION')).toBeInTheDocument();
  });

  it('renders into the requested element (span)', () => {
    const { container } = renderWithTheme(<StatusWord status={Status.Go} component="span" />);
    const span = container.querySelector('span');
    expect(span).not.toBeNull();
    expect(span).toHaveTextContent('GO');
  });

  it('accepts an array sx alongside its base styling', () => {
    renderWithTheme(<StatusWord status={Status.NoGo} sx={[{ fontSize: '1rem' }]} />);
    expect(screen.getByText('NO-GO')).toBeInTheDocument();
  });
});
