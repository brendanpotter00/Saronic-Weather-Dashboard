// The color-coded line — one segment per daylight hour, coloured by status. The eye reads
// contiguous in-bounds windows directly off it, WITHOUT us recommending a window (out of scope).
// Hours outside the available window are dimmed (not hidden).

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
          // Native title tooltip per hour — avoids pulling in MUI Tooltip 240×.
          title={`${formatHourLabel(hour.time)} — ${STATUS_LABEL[hour.status]}${hour.isInWindow ? '' : ' (outside window)'}`}
          sx={{
            flex: 1,
            minWidth: 0,
            bgcolor: `${STATUS_TO_PALETTE[hour.status]}.main`,
            opacity: hour.isInWindow ? 1 : 0.3,
          }}
        />
      ))}
    </Box>
  );
}
