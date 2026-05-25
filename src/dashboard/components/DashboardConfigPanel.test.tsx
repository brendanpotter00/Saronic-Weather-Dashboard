import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent, within } from '@testing-library/react';
import { DashboardConfigPanel, type DashboardConfigPanelProps } from './DashboardConfigPanel';
import { renderWithTheme } from '../../test/renderWithTheme';

const baseProps: DashboardConfigPanelProps = {
  availableWindow: { startHour: 6, endHour: 18 },
  daylightBounds: { startHour: 6, endHour: 18 },
  daylightEnvelope: { sunriseTime: '2026-05-24T06:13:00-05:00', sunsetTime: '2026-05-24T19:45:00-05:00' },
  demoWindowHours: 6,
  candidateCount: 4,
  totalDays: 10,
  onChange: vi.fn(),
};

function renderPanel(overrides: Partial<DashboardConfigPanelProps> = {}) {
  const onChange = vi.fn();
  renderWithTheme(<DashboardConfigPanel {...baseProps} onChange={onChange} {...overrides} />);
  return onChange;
}

describe('DashboardConfigPanel', () => {
  it('shows the candidate count and the daylight envelope', () => {
    renderPanel();
    expect(screen.getByText('4/10')).toBeInTheDocument();
    expect(screen.getByText(/days valid/i)).toBeInTheDocument();
    expect(screen.getByText(/6:13 AM.*7:45 PM/)).toBeInTheDocument();
  });

  it('reports a new demo length up through onChange', () => {
    const onChange = renderPanel();
    fireEvent.mouseDown(screen.getByRole('combobox', { name: /demo length in hours/i }));
    fireEvent.click(within(screen.getByRole('listbox')).getByText('4 hours'));
    expect(onChange).toHaveBeenCalledWith({ availableWindow: { startHour: 6, endHour: 18 }, demoWindowHours: 4 });
  });

  it('reports a new window start up through onChange, keeping the end and demo length', () => {
    const onChange = renderPanel();
    fireEvent.mouseDown(screen.getByRole('combobox', { name: /window start hour/i }));
    fireEvent.click(within(screen.getByRole('listbox')).getByText('7 AM'));
    expect(onChange).toHaveBeenCalledWith({ availableWindow: { startHour: 7, endHour: 18 }, demoWindowHours: 6 });
  });

  it('reports a new window end up through onChange, keeping the start and demo length', () => {
    const onChange = renderPanel();
    fireEvent.mouseDown(screen.getByRole('combobox', { name: /window end hour/i }));
    fireEvent.click(within(screen.getByRole('listbox')).getByText('5 PM'));
    expect(onChange).toHaveBeenCalledWith({ availableWindow: { startHour: 6, endHour: 17 }, demoWindowHours: 6 });
  });
});
