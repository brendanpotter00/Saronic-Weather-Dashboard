// The four worst-in-window readings as labelled, status-tinted cells — shared by the pin dialog and
// the pinned card so they can't drift. Tints caution/no-go, leaves a clear value in neutral ink.

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { Status, Factor, FACTOR_ORDER } from '../../scoring/status';
import type { ScoredFactor } from '../../scoring/scoring';
import { statusMainColor } from '../../theme/statusColor';
import { formatFactorValue, FACTOR_LABEL } from '../format';

export function WindowFactorGrid({ factors }: { factors: Record<Factor, ScoredFactor> }) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1 }}>
      {FACTOR_ORDER.map((factor) => {
        const scored = factors[factor];
        const color = scored.status === Status.Go ? 'text.primary' : statusMainColor(scored.status);
        return (
          <Box key={factor} sx={{ border: 1, borderColor: 'divider', borderRadius: 1, px: 1, py: 0.75 }}>
            <Typography variant="overline" color="text.secondary" component="div" sx={{ lineHeight: 1.4 }}>
              {FACTOR_LABEL[factor]}
            </Typography>
            <Typography sx={{ fontWeight: 800, color, fontVariantNumeric: 'tabular-nums' }}>
              {formatFactorValue(factor, scored.value)}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
}
