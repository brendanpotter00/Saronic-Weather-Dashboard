import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';
import { ThemeProvider } from '../theme/ThemeProvider';

// A child that throws during render, to trip the boundary.
function Boom(): never {
  throw new Error('kaboom');
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ErrorBoundary', () => {
  it('renders its children when nothing throws', () => {
    render(
      <ThemeProvider>
        <ErrorBoundary>
          <div>all good</div>
        </ErrorBoundary>
      </ThemeProvider>,
    );
    expect(screen.getByText('all good')).toBeInTheDocument();
  });

  it('shows the fallback with a Reload action when a child throws', () => {
    // React logs the caught error to console.error; silence it so the test output stays clean.
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <ThemeProvider>
        <ErrorBoundary>
          <Boom />
        </ErrorBoundary>
      </ThemeProvider>,
    );
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reload/i })).toBeInTheDocument();
  });
});
