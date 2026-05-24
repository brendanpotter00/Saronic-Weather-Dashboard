// The day's possible window: the daylight a demo could fall within (sunrise→sunset), which
// changes day to day. The constant demo-length requirement is stated once in the header, and
// the day's verdict is the badge + summary line in DayDetail — so this just reports the daylight
// span. We never pick the specific hours; choosing a window is the human's call (out of scope).

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import type { ScoredDay } from '../../scoring/scoring';
import { formatClockTime, formatDuration, MISSING_DISPLAY } from '../format';

export function WindowSummary({ day }: { day: ScoredDay }) {
  const daylight =
    day.sunriseTime && day.sunsetTime
      ? `${formatClockTime(day.sunriseTime)} – ${formatClockTime(day.sunsetTime)}`
      : MISSING_DISPLAY;

  return (
    <Box sx={{ p: 1.5, border: 1, borderColor: 'divider', borderRadius: 1 }}>
      <Typography variant="overline" color="text.secondary" component="div">
        Possible window · daylight
      </Typography>
      <Typography variant="h3" component="div" sx={{ my: 0.25 }}>
        {daylight}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {formatDuration(day.daylightDurationSeconds)} of daylight (sunrise to sunset)
      </Typography>
    </Box>
  );
}
