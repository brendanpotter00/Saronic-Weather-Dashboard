// The reusable go/caution/no-go pill. One component so the badge looks identical in the
// legend, the day column, and the detail header — colour and label both come from the single
// status map, so they can never disagree.

import Chip from '@mui/material/Chip';
import { Status } from '../scoring/status';
import { STATUS_TO_PALETTE, STATUS_LABEL } from '../theme/statusColor';

export function StatusBadge({ status }: { status: Status }) {
  return <Chip label={STATUS_LABEL[status]} color={STATUS_TO_PALETTE[status]} />;
}
