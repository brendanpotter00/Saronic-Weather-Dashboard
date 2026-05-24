import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import App from './App';
import { ThemeProvider } from './theme/ThemeProvider';
import type { CombinedForecast, CombinedHour, DayForecast } from './model';
import { formatDayLabel } from './dashboard/format';

// App renders the dashboard, which reads one RTK Query hook and runs the (real) scoring pass.
// We mock only the hook so each render state is deterministic and no store/network is needed —
// scoreForecast stays real, so these are true integration smoke tests of the view.
const mockUseQuery = vi.fn();
vi.mock('./forecast/forecastApi', () => ({
  useGetCombinedForecastQuery: () => mockUseQuery(),
}));

// --- Fixture: an all-clear day repeated, with offset-aware timestamps like the data layer emits.
function goHour(date: string, hour: number): CombinedHour {
  return {
    time: `${date}T${String(hour).padStart(2, '0')}:00:00-05:00`,
    windSpeedKn: 6,
    waveHeightFt: 1,
    precipitationIn: 0,
    visibilityMiles: 12,
    complete: true,
  };
}

function goDay(date: string): DayForecast {
  return {
    date,
    sunriseTime: `${date}T06:00:00-05:00`,
    sunsetTime: `${date}T19:00:00-05:00`,
    daylightDurationSeconds: 46800,
    hours: Array.from({ length: 12 }, (_, i) => goHour(date, 6 + i)),
    complete: true,
  };
}

// 10 consecutive days from a fixed Sunday so weekday labels are deterministic.
const DATES = Array.from({ length: 10 }, (_, i) => `2026-05-${String(24 + i).padStart(2, '0')}`);

function forecast(overrides: Partial<CombinedForecast> = {}): CombinedForecast {
  return {
    site: { latitude: 30.37, longitude: -89.09 },
    marineSite: { latitude: 30.29, longitude: -89.12 },
    timezone: 'America/Chicago',
    days: DATES.map(goDay),
    marineAvailable: true,
    ...overrides,
  };
}

function renderApp() {
  return render(
    <ThemeProvider>
      <App />
    </ThemeProvider>,
  );
}

beforeEach(() => {
  mockUseQuery.mockReset();
});

describe('Dashboard (via App)', () => {
  it('renders the header, the legend, and one column per forecast day', () => {
    mockUseQuery.mockReturnValue({ data: forecast(), isLoading: false, error: undefined });
    renderApp();

    expect(screen.getByRole('heading', { name: /gulfport.*weather/i })).toBeInTheDocument();
    // Legend decodes all three statuses.
    expect(screen.getAllByText('GO').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('CAUTION').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('NO-GO').length).toBeGreaterThanOrEqual(1);
    // One clickable column per day (aria-label is "DOW dd — STATUS").
    expect(screen.getAllByRole('button', { name: /—/ })).toHaveLength(DATES.length);
  });

  it('defaults the detail to the first day and switches when another day is clicked', () => {
    mockUseQuery.mockReturnValue({ data: forecast(), isLoading: false, error: undefined });
    renderApp();

    // Full weekday names appear only in the detail card (columns show the short "SUN"), so they
    // disambiguate which day is expanded.
    const first = formatDayLabel(DATES[0]);
    const third = formatDayLabel(DATES[2]);
    expect(screen.getByText(new RegExp(`${first.weekday},`))).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${third.dow} ${third.dayNum} —`) }));
    expect(screen.getByText(new RegExp(`${third.weekday},`))).toBeInTheDocument();
  });

  it('shows the demo length (DEMO_WINDOW_HOURS) as a card in the day detail', () => {
    mockUseQuery.mockReturnValue({ data: forecast(), isLoading: false, error: undefined });
    renderApp();
    expect(screen.getByText(/demo length/i)).toBeInTheDocument();
    expect(screen.getByText(/6 hours/i)).toBeInTheDocument();
  });

  it('shows the marine-unavailable banner when waves are missing', () => {
    mockUseQuery.mockReturnValue({
      data: forecast({ marineAvailable: false, marineSite: null }),
      isLoading: false,
      error: undefined,
    });
    renderApp();
    expect(screen.getByText(/marine \(wave\) data is unavailable/i)).toBeInTheDocument();
  });

  it('shows a loading state while fetching (no alert)', () => {
    mockUseQuery.mockReturnValue({ data: undefined, isLoading: true, error: undefined });
    renderApp();
    expect(screen.getByLabelText(/loading forecast/i)).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows an error alert when the forecast fails', () => {
    mockUseQuery.mockReturnValue({ data: undefined, isLoading: false, error: { status: 500 } });
    renderApp();
    const alert = screen.getByRole('alert');
    expect(within(alert).getByText(/couldn't load the forecast/i)).toBeInTheDocument();
  });
});
