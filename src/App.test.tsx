import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

// App is a pure view over one RTK Query hook, so we mock the hook to drive each
// render state deterministically — no store or network needed. mockUseQuery lets
// every test set exactly what useGetCombinedForecastQuery returns.
const mockUseQuery = vi.fn();
vi.mock('./forecast/forecastApi', () => ({
  useGetCombinedForecastQuery: () => mockUseQuery(),
}));

beforeEach(() => {
  mockUseQuery.mockReset();
});

describe('App', () => {
  it('always shows the dashboard heading', () => {
    mockUseQuery.mockReturnValue({ isLoading: false, error: undefined });
    render(<App />);
    expect(
      screen.getByRole('heading', { name: /saronic weather dashboard/i }),
    ).toBeInTheDocument();
  });

  it('shows a loading message while the forecast is fetching', () => {
    mockUseQuery.mockReturnValue({ isLoading: true, error: undefined });
    render(<App />);
    expect(screen.getByText(/loading forecast/i)).toBeInTheDocument();
    // Loading and error are mutually exclusive states — no alert while loading.
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows an alert when the forecast fails to load', () => {
    // Shape mirrors a real RTK Query FetchBaseQueryError so the test fails for the
    // same reason production would: a failed request, not loading.
    mockUseQuery.mockReturnValue({ isLoading: false, error: { status: 500 } });
    render(<App />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.queryByText(/loading forecast/i)).not.toBeInTheDocument();
  });
});
