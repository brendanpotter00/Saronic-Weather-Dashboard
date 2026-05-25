import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { IncompleteWindowAlert } from './IncompleteWindowAlert';
import { renderWithTheme } from '../../test/renderWithTheme';

describe('IncompleteWindowAlert', () => {
  it('warns that a window with missing readings is shown as no-go', () => {
    renderWithTheme(<IncompleteWindowAlert />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/missing readings, so it can't clear — shown as no-go/i)).toBeInTheDocument();
  });
});
