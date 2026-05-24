// The go/caution/no-go pill used in the legend. Colour and label both come from the single
// status map (statusColor.ts), so it can never disagree with the day column / detail header —
// those render the same map inline rather than this component.

import Chip from '@mui/material/Chip';
import { Status } from '../../scoring/status';
import { STATUS_TO_PALETTE, STATUS_LABEL } from '../../theme/statusColor';

export function StatusBadge({ status }: { status: Status }) {
  return <Chip label={STATUS_LABEL[status]} color={STATUS_TO_PALETTE[status]} />;
}
