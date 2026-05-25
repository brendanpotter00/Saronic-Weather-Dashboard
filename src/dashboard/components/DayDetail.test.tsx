import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { Status } from '../../scoring/status';
import { DayDetail } from './DayDetail';
import { renderWithTheme } from '../../test/renderWithTheme';
import { scoredDay } from '../../test/fixtures';

const day = scoredDay('2026-05-24'); // Sunday, 6 AM–5 PM, all clear

describe('DayDetail', () => {
  it('leads with the badge word, the day, and the summary, then every daylight hour', () => {
    renderWithTheme(<DayDetail day={day} demoWindowHours={6} onRequestPin={vi.fn()} />);
    expect(screen.getByText('GO')).toBeInTheDocument();
    expect(screen.getByText('Sunday, May 24')).toBeInTheDocument();
    expect(screen.getByText(/full demo window is available/i)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /pin a demo window around/i })).toHaveLength(12);
  });

  it('flags an incomplete day with the day-level warning', () => {
    const incomplete = scoredDay('2026-05-24', { complete: false, badge: Status.NoGo, isCandidate: false });
    renderWithTheme(<DayDetail day={incomplete} demoWindowHours={6} onRequestPin={vi.fn()} />);
    expect(screen.getByText(/some readings are missing for this day/i)).toBeInTheDocument();
  });

  it('requests a pin for the centered, clamped block when an hour is clicked', () => {
    const onRequestPin = vi.fn();
    renderWithTheme(<DayDetail day={day} demoWindowHours={6} onRequestPin={onRequestPin} />);
    fireEvent.click(screen.getByRole('button', { name: /around 10 AM/i }));
    expect(onRequestPin).toHaveBeenCalledWith('2026-05-24', 8, 6);
  });

  it('shows the no-fit hint when daylight is shorter than the demo length', () => {
    const shortDay = scoredDay('2026-05-24', { hours: day.hours.slice(0, 3) }); // 6–8 AM
    renderWithTheme(<DayDetail day={shortDay} demoWindowHours={6} onRequestPin={vi.fn()} />);
    expect(screen.getByLabelText(/daylight is shorter than the 6-hour demo length/i)).toBeInTheDocument();
  });
});
