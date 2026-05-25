// The big bold status label (GO / CAUTION / NO-GO) the day detail, pinned card, and pin dialog all
// lead with. Owns the invariant part (weight, colour, the word) so they can't disagree; the display
// SIZE is the caller's call, passed via sx.

import Box from '@mui/material/Box';
import type { SxProps, Theme } from '@mui/material/styles';
import type { Status } from '../../scoring/status';
import { STATUS_LABEL, statusMainColor } from '../../theme/statusColor';

interface StatusWordProps {
  status: Status;
  component?: 'div' | 'span'; // block in a card, inline in the dialog — the only two intended uses
  sx?: SxProps<Theme>; // caller-owned size/alignment (e.g. fontSize, textAlign)
}

export function StatusWord({ status, component = 'div', sx }: StatusWordProps) {
  return (
    <Box
      component={component}
      sx={[
        { fontWeight: 900, lineHeight: 1, color: statusMainColor(status) },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {STATUS_LABEL[status]}
    </Box>
  );
}
