// One factor's reading. Tints by the factor's status: a clear factor stays neutral ink (so a good
// row isn't a wall of green); caution/no-go is coloured to draw the eye to what's limiting the hour.

import Typography from '@mui/material/Typography';
import { Status, Factor } from '../../scoring/status';
import type { ScoredFactor } from '../../scoring/scoring';
import { statusMainColor } from '../../theme/statusColor';
import { formatFactorValue } from '../format';

export function FactorCell({ factor, scored }: { factor: Factor; scored: ScoredFactor }) {
  const color = scored.status === Status.Go ? 'text.primary' : statusMainColor(scored.status);
  return (
    <Typography variant="body2" sx={{ textAlign: 'right', fontWeight: 700, color }}>
      {formatFactorValue(factor, scored.value)}
    </Typography>
  );
}
