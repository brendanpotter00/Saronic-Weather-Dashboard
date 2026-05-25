import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithTheme } from '../test/renderWithTheme';
import { ResponsesPage } from './ResponsesPage';

describe('ResponsesPage', () => {
  it('renders the page heading and a back-link to the dashboard', () => {
    renderWithTheme(<ResponsesPage />);

    expect(screen.getByRole('heading', { level: 1, name: /final questions/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to dashboard/i })).toHaveAttribute('href', '/');
  });

  it('renders the responses content from RESPONSES.md', () => {
    renderWithTheme(<ResponsesPage />);

    // The page renders RESPONSES.md directly; assert both questions made it through marked.
    expect(screen.getByText(/Walk us through your decisions/i)).toBeInTheDocument();
    expect(screen.getByText(/How would you evolve this tool/i)).toBeInTheDocument();
  });
});
