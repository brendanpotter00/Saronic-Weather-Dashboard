// The color-coded line — the heart of the glance. One segment per daylight hour, coloured by
// that hour's status. A run of green is a stretch of clear hours; the eye reads contiguous
// in-bounds windows directly off the line, which is how Tara picks a day to open WITHOUT us
// recommending a specific window (explicitly out of scope).

import Box from '@mui/material/Box';
import type { ScoredHour } from '../../scoring/scoring';
import { STATUS_TO_PALETTE, STATUS_LABEL } from '../../theme/statusColor';
import { formatHourLabel } from '../format';

export function HourLine({ hours }: { hours: ScoredHour[] }) {
  return (
    <Box
      sx={{
        display: 'flex',
        gap: '1px',
        height: { xs: 16, sm: 24 },
        borderRadius: 0.5,
        overflow: 'hidden',
        bgcolor: 'background.default',
      }}
    >
      {hours.map((hour) => (
        <Box
          key={hour.time}
          // title gives a native hover tooltip per hour without pulling in MUI Tooltip 240×.
          title={`${formatHourLabel(hour.time)} — ${STATUS_LABEL[hour.status]}`}
          sx={{ flex: 1, minWidth: 0, bgcolor: `${STATUS_TO_PALETTE[hour.status]}.main` }}
        />
      ))}
    </Box>
  );
}
