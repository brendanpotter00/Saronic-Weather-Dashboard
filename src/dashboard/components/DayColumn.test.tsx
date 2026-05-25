import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { Status } from '../../scoring/status';
import { DayColumn } from './DayColumn';
import { renderWithTheme } from '../../test/renderWithTheme';
import { scoredDay } from '../../test/fixtures';

// 2026-05-24 is a Sunday (SUN), 2026-05-25 a Monday (MON).
const goDay = scoredDay('2026-05-24');

describe('DayColumn', () => {
  it('labels today, and the aria-label carries the badge and candidacy', () => {
    renderWithTheme(<DayColumn day={goDay} isToday isSelected={false} onSelect={vi.fn()} />);
    expect(screen.getByText('TODAY')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'SUN 24 — GO · valid demo window' }),
    ).toBeInTheDocument();
  });

  it('shows the weekday (not TODAY) and marks selection with aria-pressed', () => {
    renderWithTheme(<DayColumn day={goDay} isToday={false} isSelected onSelect={vi.fn()} />);
    expect(screen.getByText('SUN')).toBeInTheDocument();
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
  });

  it('omits the candidacy note for a no-go day', () => {
    const noGo = scoredDay('2026-05-25', { badge: Status.NoGo, isCandidate: false });
    renderWithTheme(<DayColumn day={noGo} isToday={false} isSelected={false} onSelect={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'MON 25 — NO-GO' })).toBeInTheDocument();
  });

  it('reports its date when clicked', () => {
    const onSelect = vi.fn();
    renderWithTheme(<DayColumn day={goDay} isToday={false} isSelected={false} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onSelect).toHaveBeenCalledWith('2026-05-24');
  });
});
