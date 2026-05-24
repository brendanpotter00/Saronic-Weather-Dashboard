// The two windows side by side, so the distinction reads at a glance:
//   • Possible window — the daylight a demo could fall within (sunrise→sunset), changes daily.
//   • Demo length     — how long a demo runs (the constant requirement), the same every day.
// We never pick the specific hours; choosing a window is the human's call (out of scope). The
// day's go/no-go verdict is the badge + summary line above this in DayDetail.

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { ScoredDay } from '../../scoring/scoring';
import { formatClockTime, MISSING_DISPLAY } from '../format';

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Box sx={{ flex: 1, p: 1.5, border: 1, borderColor: 'divider', borderRadius: 1, minWidth: 0 }}>
      <Typography variant="overline" color="text.secondary" component="div">
        {label}
      </Typography>
      <Typography variant="h3" component="div" sx={{ my: 0.25 }}>
        {value}
      </Typography>
      {hint && (
        <Typography variant="caption" color="text.secondary">
          {hint}
        </Typography>
      )}
    </Box>
  );
}

export function WindowSummary({ day }: { day: ScoredDay }) {
  const daylight =
    day.sunriseTime && day.sunsetTime
      ? `${formatClockTime(day.sunriseTime)} – ${formatClockTime(day.sunsetTime)}`
      : MISSING_DISPLAY;

  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
      <Stat label="Possible window · daylight" value={daylight} />
      <Stat label="Demo length" value={`${day.demoWindowHours} hours`} />
    </Stack>
  );
}
