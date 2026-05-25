// The 10-day forecast region: the marine warning, the horizon strip, and the selected-day detail.
// Resolves which day is expanded (selected date, falling back to the first) so the strip and detail
// can't disagree.

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
  // Keyed by the stable date string (not an index) so selection survives a refetch; unset → first day.
  const selected = days.find((day) => day.date === selectedDate) ?? days[0];

  return (
    <>
      {!marineAvailable && <MarineUnavailableAlert />}
      <HorizonStrip days={days} selectedDate={selected.date} onSelect={onSelectDate} />
      <DayDetail day={selected} demoWindowHours={demoWindowHours} onRequestPin={onRequestPin} />
    </>
  );
}
