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

// The pin flow: click an hour → confirm dialog (with the centered, clamped window + rolled-up
// status) → Pin → the card fills the top slot; Unpin clears it. The fixture day runs 6 AM–5 PM
// (12 clear hours), the demo length defaults to 6, so a hover centers leaning later and clamps.
describe('pin a demo window', () => {
  beforeEach(() => {
    mockUseQuery.mockReturnValue({ data: forecast(), isLoading: false, error: undefined });
  });

  function pinnedCard() {
    return screen.queryByRole('region', { name: /pinned demo window/i });
  }

  it('clicking an hour opens the confirm dialog for the block centered on it', () => {
    renderApp();
    // Hovered 10 AM, 6-hour demo, leaning later → block starts at 8 AM and runs 8 AM–1 PM.
    fireEvent.click(screen.getByRole('button', { name: /pin a demo window around 10 AM/i }));

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/pin this demo window/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/8 AM – 1 PM · 6-hour demo/i)).toBeInTheDocument();
    expect(within(dialog).getByText('GO')).toBeInTheDocument();
  });

  it('clamps at dawn and dusk so every row maps to a valid window', () => {
    renderApp();
    // Dawn: 6 AM hover clamps up to the earliest window (6 AM–11 AM).
    fireEvent.click(screen.getByRole('button', { name: /pin a demo window around 6 AM/i }));
    expect(within(screen.getByRole('dialog')).getByText(/6 AM – 11 AM · 6-hour demo/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^cancel$/i }));

    // Dusk: 5 PM hover clamps down to the latest window (12 PM–5 PM).
    fireEvent.click(screen.getByRole('button', { name: /pin a demo window around 5 PM/i }));
    expect(within(screen.getByRole('dialog')).getByText(/12 PM – 5 PM · 6-hour demo/i)).toBeInTheDocument();
  });

  it('confirming pins the window to the top slot, and Unpin clears it', () => {
    renderApp();
    expect(pinnedCard()).not.toBeInTheDocument(); // slot is empty until something is pinned

    fireEvent.click(screen.getByRole('button', { name: /pin a demo window around 10 AM/i }));
    fireEvent.click(screen.getByRole('button', { name: /^pin window$/i }));

    const card = pinnedCard()!;
    expect(card).toBeInTheDocument();
    expect(within(card).getByText(/pinned demo window/i)).toBeInTheDocument();
    expect(within(card).getByText(/8 AM – 1 PM · 6-hour demo/i)).toBeInTheDocument();
    const firstDay = formatDayLabel(DATES[0]);
    expect(within(card).getByText(new RegExp(`${firstDay.weekday},`))).toBeInTheDocument();

    fireEvent.click(within(card).getByRole('button', { name: /^unpin$/i }));
    expect(pinnedCard()).not.toBeInTheDocument();
  });

  it('a pinned window keeps its frozen length when the dashboard demo length changes', () => {
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: /pin a demo window around 10 AM/i }));
    fireEvent.click(screen.getByRole('button', { name: /^pin window$/i }));
    expect(within(pinnedCard()!).getByText(/8 AM – 1 PM · 6-hour demo/i)).toBeInTheDocument();

    // Drop the dashboard-wide demo length to 4 hours.
    fireEvent.mouseDown(screen.getByRole('combobox', { name: /demo length in hours/i }));
    fireEvent.click(within(screen.getByRole('listbox')).getByText('4 hours'));

    // The pinned window is independent — still the 6-hour window it was pinned at.
    expect(within(pinnedCard()!).getByText(/8 AM – 1 PM · 6-hour demo/i)).toBeInTheDocument();
  });

  it('hovering previews the centered block, and keyboard (Enter/Space) commits', () => {
    renderApp();
    const row = screen.getByRole('button', { name: /pin a demo window around 10 AM/i });

    // Hover/focus previews (the selection highlight) without opening the dialog.
    fireEvent.mouseEnter(row);
    fireEvent.focus(row);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.mouseLeave(row.parentElement!); // clears the preview

    // An unhandled key does nothing; Enter and Space open the confirm dialog.
    fireEvent.keyDown(row, { key: 'a' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.keyDown(row, { key: 'Enter' });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^cancel$/i }));
    fireEvent.keyDown(row, { key: ' ' });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('a day shorter than the demo length shows the no-fit hint and ignores clicks', () => {
    const data = forecast();
    data.days[0] = { ...data.days[0], hours: data.days[0].hours.slice(0, 3) }; // only 6–8 AM
    mockUseQuery.mockReturnValue({ data, isLoading: false, error: undefined });
    renderApp();

    expect(screen.getByText(/daylight is shorter than the 6-hour demo length/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /pin a demo window around 6 AM/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('pins an incomplete window as a surfaced no-go (dialog and card both warn)', () => {
    const data = forecast();
    const hours = [...data.days[0].hours];
    const tenAm = hours.findIndex((h) => h.time.slice(11, 13) === '10'); // inside the 8 AM–1 PM block
    hours[tenAm] = { ...hours[tenAm], waveHeightFt: null, complete: false };
    data.days[0] = { ...data.days[0], hours };
    mockUseQuery.mockReturnValue({ data, isLoading: false, error: undefined });
    renderApp();

    fireEvent.click(screen.getByRole('button', { name: /pin a demo window around 10 AM/i }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/missing readings/i)).toBeInTheDocument();
    expect(within(dialog).getByText('NO-GO')).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: /^pin window$/i }));
    const card = pinnedCard()!;
    expect(within(card).getByText(/missing readings/i)).toBeInTheDocument();
    expect(within(card).getByText('NO-GO')).toBeInTheDocument();
  });
});
