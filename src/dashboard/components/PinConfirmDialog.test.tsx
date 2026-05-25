import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent, within } from '@testing-library/react';
import { Status } from '../../scoring/status';
import { PinConfirmDialog } from './PinConfirmDialog';
import { renderWithTheme } from '../../test/renderWithTheme';
import { namedWindowScore } from '../../test/fixtures';

describe('PinConfirmDialog', () => {
  it('renders the window summary and status when open', () => {
    renderWithTheme(
      <PinConfirmDialog
        open
        date="2026-05-24"
        score={namedWindowScore()}
        lengthHours={6}
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/pin this demo window/i)).toBeInTheDocument();
    expect(within(dialog).getByText('Sunday, May 24')).toBeInTheDocument();
    expect(within(dialog).getByText(/8 AM.*1 PM.*6-hour demo/)).toBeInTheDocument();
    expect(within(dialog).getByText('GO')).toBeInTheDocument();
  });

  it('fires confirm and cancel from the action buttons', () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    renderWithTheme(
      <PinConfirmDialog
        open
        date="2026-05-24"
        score={namedWindowScore()}
        lengthHours={6}
        onConfirm={onConfirm}
        onClose={onClose}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /^pin window$/i }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: /^cancel$/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('warns on an incomplete window', () => {
    renderWithTheme(
      <PinConfirmDialog
        open
        date="2026-05-24"
        score={namedWindowScore({ status: Status.NoGo, complete: false })}
        lengthHours={6}
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText(/missing readings/i)).toBeInTheDocument();
  });

  it('renders nothing when closed', () => {
    renderWithTheme(
      <PinConfirmDialog
        open={false}
        date="2026-05-24"
        score={namedWindowScore()}
        lengthHours={6}
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
