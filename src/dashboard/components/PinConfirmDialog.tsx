// The "pin this demo window" confirm step. Hover only previews; committing is always an explicit
// click/tap → this dialog → Pin, so the interaction degrades cleanly to touch (no hover needed).
// It shows the exact window, its rolled-up status word, the four worst-in-window readings, and —
// when the block can't be fully evaluated — the same fail-safe warning the day detail uses.

import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import type { NamedWindowScore } from '../../scoring/window';
import { formatDayLabel, formatHourLabel } from '../format';
import { WindowFactorGrid } from './WindowFactorGrid';
import { StatusStrip } from './StatusStrip';
import { StatusWord } from './StatusWord';
import { IncompleteWindowAlert } from './IncompleteWindowAlert';

interface PinConfirmDialogProps {
  open: boolean;
  date: string;
  score: NamedWindowScore;
  lengthHours: number; // the demo length being frozen into this pin (matches the previewed block)
  onConfirm: () => void;
  onClose: () => void;
}

export function PinConfirmDialog({ open, date, score, lengthHours, onConfirm, onClose }: PinConfirmDialogProps) {
  const { weekday, month, dayNum } = formatDayLabel(date);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth aria-labelledby="pin-dialog-title">
      <StatusStrip status={score.status} />
      <DialogContent>
        <Stack spacing={2}>
          <Box>
            <Typography variant="overline" color="text.secondary" component="div">
              Pin this demo window
            </Typography>
            <Typography id="pin-dialog-title" variant="h2" component="div">
              {weekday}, {month} {dayNum}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {formatHourLabel(score.startTime)} – {formatHourLabel(score.endTime)} · {lengthHours}-hour demo
            </Typography>
          </Box>

          <StatusWord status={score.status} component="span" sx={{ fontSize: '1.7rem' }} />

          {!score.complete && <IncompleteWindowAlert />}

          <WindowFactorGrid factors={score.factors} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button color="primary" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="contained" color="primary" onClick={onConfirm}>
          Pin window
        </Button>
      </DialogActions>
    </Dialog>
  );
}
