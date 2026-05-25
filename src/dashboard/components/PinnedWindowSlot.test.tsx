import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { Status } from '../../scoring/status';
import { PinnedWindowSlot } from './PinnedWindowSlot';
import { renderWithTheme } from '../../test/renderWithTheme';
import { namedWindowScore } from '../../test/fixtures';

describe('PinnedWindowSlot', () => {
  it('renders nothing while the slot is empty', () => {
    const { container } = renderWithTheme(
      <PinnedWindowSlot date={null} score={null} lengthHours={6} onUnpin={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the pinned window summary', () => {
    renderWithTheme(
      <PinnedWindowSlot date="2026-05-24" score={namedWindowScore()} lengthHours={6} onUnpin={vi.fn()} />,
    );
    expect(screen.getByRole('region', { name: /pinned demo window: Sunday, May 24/i })).toBeInTheDocument();
    expect(screen.getByText('GO')).toBeInTheDocument();
    expect(screen.getByText('Sunday, May 24')).toBeInTheDocument();
    expect(screen.getByText(/8 AM.*1 PM.*6-hour demo/)).toBeInTheDocument();
  });

  it('warns when the window is incomplete', () => {
    renderWithTheme(
      <PinnedWindowSlot
        date="2026-05-24"
        score={namedWindowScore({ status: Status.NoGo, complete: false })}
        lengthHours={6}
        onUnpin={vi.fn()}
      />,
    );
    expect(screen.getByText(/missing readings/i)).toBeInTheDocument();
    expect(screen.getByText('NO-GO')).toBeInTheDocument();
  });

  it('calls onUnpin when the ✕ is clicked', () => {
    const onUnpin = vi.fn();
    renderWithTheme(
      <PinnedWindowSlot date="2026-05-24" score={namedWindowScore()} lengthHours={6} onUnpin={onUnpin} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /unpin/i }));
    expect(onUnpin).toHaveBeenCalledTimes(1);
  });
});
