// One daylight hour in the detail table: a status bar, the clock hour, and the four factor
// readings. The row's grid template is shared with the header (HOUR_GRID) so columns line up.

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { Factor } from '../../scoring/status';
import type { ScoredHour } from '../../scoring/scoring';
import { STATUS_TO_PALETTE } from '../../theme/statusColor';
import { FactorCell } from './FactorCell';
import { formatHourLabel } from '../format';

// status bar · time · wind · wave · rain · vis — imported by DayDetail for the aligned header.
export const HOUR_GRID = '6px 56px repeat(4, 1fr)';

export function HourRow({ hour }: { hour: ScoredHour }) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: HOUR_GRID,
        columnGap: 1.5,
        alignItems: 'center',
        py: 0.75,
        borderTop: 1,
        borderColor: 'divider',
        // Out-of-window hours stay readable but recede — they don't count toward a demo window.
        opacity: hour.isInWindow ? 1 : 0.45,
      }}
    >
      <Box sx={{ height: 20, borderRadius: 0.5, bgcolor: `${STATUS_TO_PALETTE[hour.status]}.main` }} />
      <Typography variant="caption" color="text.secondary">
        {formatHourLabel(hour.time)}
      </Typography>
      <FactorCell factor={Factor.Wind} scored={hour.wind} />
      <FactorCell factor={Factor.Wave} scored={hour.wave} />
      <FactorCell factor={Factor.Precipitation} scored={hour.precipitation} />
      <FactorCell factor={Factor.Visibility} scored={hour.visibility} />
    </Box>
  );
}
