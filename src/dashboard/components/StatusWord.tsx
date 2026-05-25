// The big bold status label — the one-word answer (GO / CAUTION / NO-GO) the day detail, the
// pinned card, and the pin dialog all lead with. This component owns the invariant part: the
// heavy weight, tight line-height, the status colour, and the word itself (from STATUS_LABEL), so
// those can never disagree across the three places. The DISPLAY SIZE is the caller's layout call
// — each surface sizes it for its own context — so font size (and any alignment) comes in via sx.

import Box from '@mui/material/Box';
import type { ElementType } from 'react';
import type { SxProps, Theme } from '@mui/material/styles';
import type { Status } from '../../scoring/status';
import { STATUS_LABEL, statusMainColor } from '../../theme/statusColor';

interface StatusWordProps {
  status: Status;
  component?: ElementType; // 'div' in a card, 'span' inline in the dialog
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
