// The thin status-coloured bar that caps a card or dialog. One component owns its height and colour
// so the callers can't drift.

import Box from '@mui/material/Box';
import type { Status } from '../../scoring/status';
import { statusMainColor } from '../../theme/statusColor';

const STRIP_HEIGHT_PX = 5;

export function StatusStrip({ status }: { status: Status }) {
  return <Box sx={{ height: STRIP_HEIGHT_PX, bgcolor: statusMainColor(status) }} />;
}
