// The dashboard-wide config bar — the top control surface. Two knobs Tara sets once and glances
// at: the AVAILABLE WINDOW (the clock-hour band a demo may run in, defaulting to the daylight the
// forecast covers) and the DEMO LENGTH. It sits above the horizon so the page reads top-down:
// "here's the window and the demo length" → then scan the 10 days against them.
//
// Pure presentation: it renders the effective values the scoring layer echoed and reports a
// change up. It does no clock math — the pickers clamp to `daylightBounds` (so the window can
// never run past sunrise/sunset), the precise daylight times come pre-computed, and the
// candidate count is handed in.

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import { DEMO_MIN_HOURS, DEMO_MAX_HOURS } from '../../config/app';
import type { AvailableWindow, DaylightEnvelope } from '../../scoring/window';
import { formatClockTime, formatHourOfDay, MISSING_DISPLAY } from '../format';

export interface DashboardConfigPanelProps {
  availableWindow: AvailableWindow; // current effective window (echoed from scoring)
  daylightBounds: AvailableWindow; // hard min/max the pickers clamp to (widest daylight coverage)
  daylightEnvelope: DaylightEnvelope; // precise earliest sunrise / latest sunset, for the context line
  demoWindowHours: number; // current effective demo length
  candidateCount: number; // days with a valid window under the current settings
  totalDays: number;
  onChange: (next: { availableWindow: AvailableWindow; demoWindowHours: number }) => void;
}

const range = (lo: number, hi: number): number[] =>
  Array.from({ length: Math.max(0, hi - lo + 1) }, (_, i) => lo + i);

export function DashboardConfigPanel({
  availableWindow,
  daylightBounds,
  daylightEnvelope,
  demoWindowHours,
  candidateCount,
  totalDays,
  onChange,
}: DashboardConfigPanelProps) {
  const { startHour, endHour } = availableWindow;
  // Start can't reach the end (need ≥1 hour); end can't reach the start. Both stay inside the
  // daylight envelope, so the window never extends past sunrise/sunset.
  const startOptions = range(daylightBounds.startHour, endHour - 1);
  const endOptions = range(startHour + 1, daylightBounds.endHour);
  const demoOptions = range(DEMO_MIN_HOURS, DEMO_MAX_HOURS);

  const setStart = (value: number) => onChange({ availableWindow: { startHour: value, endHour }, demoWindowHours });
  const setEnd = (value: number) => onChange({ availableWindow: { startHour, endHour: value }, demoWindowHours });
  const setDemo = (value: number) => onChange({ availableWindow, demoWindowHours: value });

  const daylight =
    daylightEnvelope.sunriseTime && daylightEnvelope.sunsetTime
      ? `${formatClockTime(daylightEnvelope.sunriseTime)} – ${formatClockTime(daylightEnvelope.sunsetTime)}`
      : MISSING_DISPLAY;

  // The candidate count answers BOTH knobs (window + demo length), so it reads as a result of the
  // whole bar rather than a note under the window picker. Full sentence kept for screen readers.
  const countSentence = `${candidateCount} of ${totalDays} days have a valid window with these settings`;

  return (
    <Card component="section" aria-label="Dashboard configuration">
      <CardContent>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={{ xs: 2, md: 4 }} useFlexGap sx={{ alignItems: { md: 'flex-start' } }}>
          <Box>
            <Typography variant="overline" color="text.secondary" component="div">
              Available window
            </Typography>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mt: 0.5 }}>
              <FormControl size="small">
                <Select
                  value={startHour}
                  onChange={(e) => setStart(Number(e.target.value))}
                  inputProps={{ 'aria-label': 'Window start hour' }}
                >
                  {startOptions.map((h) => (
                    <MenuItem key={h} value={h}>
                      {formatHourOfDay(h)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Typography color="text.secondary" component="span">–</Typography>
              <FormControl size="small">
                <Select
                  value={endHour}
                  onChange={(e) => setEnd(Number(e.target.value))}
                  inputProps={{ 'aria-label': 'Window end hour' }}
                >
                  {endOptions.map((h) => (
                    <MenuItem key={h} value={h}>
                      {formatHourOfDay(h)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
            <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', mt: 0.75 }}>
              <Box component="span" aria-hidden sx={{ color: 'text.disabled', lineHeight: 1 }}>
                ↳
              </Box>
              <Typography variant="caption" color="text.secondary">
                within daylight{' '}
                <Tooltip title="Earliest sunrise to latest sunset across the 10-day forecast — the window can’t run past it.">
                  <Box component="span" sx={{ borderBottom: '1px dotted', borderColor: 'text.disabled', cursor: 'help' }}>
                    {daylight}
                  </Box>
                </Tooltip>
              </Typography>
            </Stack>
          </Box>

          <Box>
            <Typography variant="overline" color="text.secondary" component="div">
              Demo length
            </Typography>
            <FormControl size="small" sx={{ mt: 0.5 }}>
              <Select
                value={demoWindowHours}
                onChange={(e) => setDemo(Number(e.target.value))}
                inputProps={{ 'aria-label': 'Demo length in hours' }}
              >
                {demoOptions.map((h) => (
                  <MenuItem key={h} value={h}>
                    {h} {h === 1 ? 'hour' : 'hours'}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {/* Live result of both knobs — pushed to the row end on desktop, full-width on phone. */}
          <Box sx={{ ml: { md: 'auto' }, alignSelf: { md: 'center' }, width: { xs: '100%', md: 'auto' } }}>
            <Box
              role="status"
              aria-label={countSentence}
              sx={{
                display: 'inline-flex',
                alignItems: 'baseline',
                gap: 0.75,
                px: 2,
                py: 1,
                borderRadius: 999,
                border: 1,
                borderColor: 'divider',
                bgcolor: 'action.hover',
                width: { xs: '100%', md: 'auto' },
                justifyContent: { xs: 'center', md: 'flex-start' },
              }}
            >
              <Box component="span" sx={{ fontWeight: 700, color: 'text.primary', fontVariantNumeric: 'tabular-nums' }}>
                {candidateCount}/{totalDays}
              </Box>
              <Typography component="span" variant="body2" color="text.secondary">
                days valid
              </Typography>
            </Box>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}
