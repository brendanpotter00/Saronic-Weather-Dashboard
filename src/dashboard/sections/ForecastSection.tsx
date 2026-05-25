// The 10-day forecast region: the marine-data warning (when waves are missing), the horizon strip
// of day columns, and the drill-down detail for the selected day. It resolves which day is
// expanded — the selected date, falling back to the first day (today) — so the strip highlight and
// the detail can never disagree about which day is open.

import type { ScoredDay } from '../../scoring/scoring';
import { HorizonStrip } from '../components/HorizonStrip';
import { DayDetail } from '../components/DayDetail';
import { MarineUnavailableAlert } from '../components/MarineUnavailableAlert';

interface ForecastSectionProps {
  days: ScoredDay[];
  marineAvailable: boolean; // false → the wave feed is down, so every hour reads no-go
  demoWindowHours: number;
  selectedDate: string | null; // null = no explicit choice yet → fall back to the first day
  onSelectDate: (date: string) => void;
  onRequestPin: (date: string, startHour: number, lengthHours: number) => void;
}

export function ForecastSection({
  days,
  marineAvailable,
  demoWindowHours,
  selectedDate,
  onSelectDate,
  onRequestPin,
}: ForecastSectionProps) {
  // Keyed by the stable date string, not an index, so the selection survives a refetch that
  // reorders/replaces the array; an unset choice falls back to the first day.
  const selected = days.find((day) => day.date === selectedDate) ?? days[0];

  return (
    <>
      {!marineAvailable && <MarineUnavailableAlert />}
      <HorizonStrip days={days} selectedDate={selected.date} onSelect={onSelectDate} />
      <DayDetail day={selected} demoWindowHours={demoWindowHours} onRequestPin={onRequestPin} />
    </>
  );
}
