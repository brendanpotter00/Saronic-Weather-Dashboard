import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent, within } from '@testing-library/react';
import { PinnedWindowsSection } from './PinnedWindowsSection';
import { renderWithTheme } from '../../test/renderWithTheme';
import { scoredDay } from '../../test/fixtures';

const days = [scoredDay('2026-05-24'), scoredDay('2026-05-25')]; // both clear, 6 AM–5 PM
const PIN_A = { date: '2026-05-24', startHour: 8, lengthHours: 6 };

function renderSection(overrides: Partial<Parameters<typeof PinnedWindowsSection>[0]> = {}) {
  const props = {
    days,
    demoWindowHours: 6,
    pinnedWindows: [],
    pendingPin: null,
    onConfirmPin: vi.fn(),
    onCancelPin: vi.fn(),
    onUnpin: vi.fn(),
    ...overrides,
  };
  renderWithTheme(<PinnedWindowsSection {...props} />);
  return props;
}

describe('PinnedWindowsSection', () => {
  it('renders nothing when empty with no pending pin', () => {
    const { container } = renderWithTheme(
      <PinnedWindowsSection
        days={days}
        demoWindowHours={6}
        pinnedWindows={[]}
        pendingPin={null}
        onConfirmPin={vi.fn()}
        onCancelPin={vi.fn()}
        onUnpin={vi.fn()}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders a card per pinned window, scored against the live day', () => {
    renderSection({ pinnedWindows: [PIN_A] });
    expect(screen.getByRole('region', { name: /pinned demo window: Sunday, May 24/i })).toBeInTheDocument();
    expect(screen.getByText('GO')).toBeInTheDocument();
  });

  it('hides a pin whose day has rolled off the horizon', () => {
    renderSection({ pinnedWindows: [{ date: '2099-01-01', startHour: 8, lengthHours: 6 }] });
    expect(screen.queryByRole('region', { name: /pinned demo window/i })).not.toBeInTheDocument();
  });

  it('unpins by content identity', () => {
    const { onUnpin } = renderSection({ pinnedWindows: [PIN_A] });
    fireEvent.click(screen.getByRole('button', { name: /unpin/i }));
    expect(onUnpin).toHaveBeenCalledWith(PIN_A);
  });

  it('opens the confirm dialog for a pending pin and confirms at the live demo length', () => {
    const { onConfirmPin } = renderSection({ pendingPin: { date: '2026-05-24', startHour: 8 } });
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/pin this demo window/i)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: /^pin window$/i }));
    expect(onConfirmPin).toHaveBeenCalledWith(6);
  });

  it('cancels a pending pin', () => {
    const { onCancelPin } = renderSection({ pendingPin: { date: '2026-05-24', startHour: 8 } });
    fireEvent.click(screen.getByRole('button', { name: /^cancel$/i }));
    expect(onCancelPin).toHaveBeenCalledTimes(1);
  });
});
