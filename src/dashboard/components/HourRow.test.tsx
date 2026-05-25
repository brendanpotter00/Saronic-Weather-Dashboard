import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { Status } from '../../scoring/status';
import { HourRow } from './HourRow';
import { renderWithTheme } from '../../test/renderWithTheme';
import { scoredHour } from '../../test/fixtures';

const hour = scoredHour('2026-05-24', 10);

function renderRow(overrides: Partial<Parameters<typeof HourRow>[0]> = {}) {
  const props = {
    hour,
    inSelection: false,
    selectionStatus: null,
    isSelectionStart: false,
    isSelectionEnd: false,
    onHover: vi.fn(),
    onSelect: vi.fn(),
    ...overrides,
  };
  renderWithTheme(<HourRow {...props} />);
  return props;
}

describe('HourRow', () => {
  it('renders the clock hour and its four factor readings as a pin target', () => {
    renderRow();
    expect(screen.getByRole('button', { name: /pin a demo window around 10 AM/i })).toBeInTheDocument();
    expect(screen.getByText('10 AM')).toBeInTheDocument();
    expect(screen.getByText('6.0 kn')).toBeInTheDocument();
    expect(screen.getByText('1.0 ft')).toBeInTheDocument();
    expect(screen.getByText('0 in')).toBeInTheDocument();
    expect(screen.getByText('12.0 mi')).toBeInTheDocument();
  });

  it('reports its hour on hover and focus', () => {
    const { onHover } = renderRow();
    const row = screen.getByRole('button');
    fireEvent.mouseEnter(row);
    fireEvent.focus(row);
    expect(onHover).toHaveBeenCalledTimes(2);
    expect(onHover).toHaveBeenCalledWith(10);
  });

  it('commits on click and on Enter/Space, but ignores other keys', () => {
    const { onSelect } = renderRow();
    const row = screen.getByRole('button');

    fireEvent.click(row);
    fireEvent.keyDown(row, { key: 'Enter' });
    fireEvent.keyDown(row, { key: ' ' });
    expect(onSelect).toHaveBeenCalledTimes(3);
    expect(onSelect).toHaveBeenCalledWith(10);

    fireEvent.keyDown(row, { key: 'a' });
    expect(onSelect).toHaveBeenCalledTimes(3); // unchanged
  });

  it('renders inside a previewed window without crashing', () => {
    renderRow({ inSelection: true, selectionStatus: Status.Caution, isSelectionStart: true });
    expect(screen.getByRole('button', { name: /around 10 AM/i })).toBeInTheDocument();
  });
});
