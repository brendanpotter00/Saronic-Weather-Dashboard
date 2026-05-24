// One factor's reading in the hourly table. Shows the formatted value and tints it by the
// factor's own status: a clear factor stays neutral ink (so a good row isn't a wall of green),
// while a caution/no-go factor is coloured to draw the eye to what's limiting the hour.

import Typography from '@mui/material/Typography';
import { Status, Factor } from '../scoring/status';
import type { ScoredFactor } from '../scoring/scoring';
import { STATUS_TO_PALETTE } from '../theme/statusColor';
import { formatFactorValue } from './format';

export function FactorCell({ factor, scored }: { factor: Factor; scored: ScoredFactor }) {
  const color = scored.status === Status.Go ? 'text.primary' : `${STATUS_TO_PALETTE[scored.status]}.main`;
  return (
    <Typography variant="body2" sx={{ textAlign: 'right', fontWeight: 700, color }}>
      {formatFactorValue(factor, scored.value)}
    </Typography>
  );
}
