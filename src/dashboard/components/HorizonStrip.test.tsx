import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { HorizonStrip } from './HorizonStrip';
import { renderWithTheme } from '../../test/renderWithTheme';
import { scoredDay } from '../../test/fixtures';

const days = [scoredDay('2026-05-24'), scoredDay('2026-05-25'), scoredDay('2026-05-26')];

describe('HorizonStrip', () => {
  it('renders the heading and one column per day', () => {
    renderWithTheme(<HorizonStrip days={days} selectedDate="2026-05-25" onSelect={vi.fn()} />);
    expect(screen.getByText('10-Day Forecast')).toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(3);
  });

  it('marks the selected day as pressed', () => {
    renderWithTheme(<HorizonStrip days={days} selectedDate="2026-05-25" onSelect={vi.fn()} />);
    expect(screen.getByRole('button', { name: /MON 25/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /SUN 24/i })).toHaveAttribute('aria-pressed', 'false');
  });

  it('reports the clicked day', () => {
    const onSelect = vi.fn();
    renderWithTheme(<HorizonStrip days={days} selectedDate="2026-05-24" onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('button', { name: /TUE 26/i }));
    expect(onSelect).toHaveBeenCalledWith('2026-05-26');
  });
});
