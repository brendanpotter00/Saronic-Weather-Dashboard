import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { ForecastSection } from './ForecastSection';
import { renderWithTheme } from '../../test/renderWithTheme';
import { scoredDay } from '../../test/fixtures';

const days = [scoredDay('2026-05-24'), scoredDay('2026-05-25'), scoredDay('2026-05-26')];

function renderSection(overrides: Partial<Parameters<typeof ForecastSection>[0]> = {}) {
  const props = {
    days,
    marineAvailable: true,
    demoWindowHours: 6,
    selectedDate: null,
    onSelectDate: vi.fn(),
    onRequestPin: vi.fn(),
    ...overrides,
  };
  renderWithTheme(<ForecastSection {...props} />);
  return props;
}

describe('ForecastSection', () => {
  it('shows the horizon and expands the first day by default', () => {
    renderSection();
    expect(screen.getByText('10-Day Forecast')).toBeInTheDocument();
    expect(screen.getByText('Sunday, May 24')).toBeInTheDocument(); // first day, in the detail
    expect(screen.queryByText(/marine \(wave\) data is unavailable/i)).not.toBeInTheDocument();
  });

  it('expands the selected day instead of the first', () => {
    renderSection({ selectedDate: '2026-05-26' });
    expect(screen.getByText('Tuesday, May 26')).toBeInTheDocument();
  });

  it('shows the marine-unavailable banner when waves are missing', () => {
    renderSection({ marineAvailable: false });
    expect(screen.getByText(/marine \(wave\) data is unavailable/i)).toBeInTheDocument();
  });

  it('reports a day selection up', () => {
    const onSelectDate = vi.fn();
    renderSection({ onSelectDate });
    fireEvent.click(screen.getByRole('button', { name: /MON 25/i }));
    expect(onSelectDate).toHaveBeenCalledWith('2026-05-25');
  });

  it('requests a pin from the day detail', () => {
    const onRequestPin = vi.fn();
    renderSection({ onRequestPin });
    fireEvent.click(screen.getByRole('button', { name: /around 10 AM/i }));
    expect(onRequestPin).toHaveBeenCalledWith('2026-05-24', 8, 6);
  });
});
