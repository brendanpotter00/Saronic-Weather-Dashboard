// The reserved layout seam at the top of the dashboard, now filled by the "pin a chosen window"
// feature. Empty (renders null) until Tara pins one — so there's no layout shift — then it shows
// her pinned demo window: status strip + word, day, range, and the four worst-in-window readings,
// plus Unpin. It is pure presentation: the dashboard re-derives the score from the live forecast
// on every render (scoreNamedWindow), so the status firms up here with no card-level logic.

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import type { NamedWindowScore } from '../../scoring/window';
import { STATUS_TO_PALETTE, STATUS_LABEL } from '../../theme/statusColor';
import { formatDayLabel, formatHourLabel } from '../format';
import { WindowFactorGrid } from './WindowFactorGrid';

interface PinnedWindowSlotProps {
  date: string | null; // null = nothing pinned → the slot stays empty
  score: NamedWindowScore | null;
  lengthHours: number; // the demo length frozen at pin time (independent of the live config)
  onUnpin: () => void;
}

export function PinnedWindowSlot({ date, score, lengthHours, onUnpin }: PinnedWindowSlotProps) {
  if (date === null || score === null) return null;

  const { weekday, month, dayNum } = formatDayLabel(date);
  const statusColor = `${STATUS_TO_PALETTE[score.status]}.main`;

  return (
    <Box component="section" aria-label="Pinned demo window">
      <Card>
        <Box sx={{ height: 5, bgcolor: statusColor }} />
        <CardContent>
          <Stack spacing={2}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr auto' },
                gap: 2,
                alignItems: 'start',
              }}
            >
              <Box>
                <Typography
                  variant="overline"
                  color="text.secondary"
                  sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                >
                  <PushPinOutlinedIcon sx={{ fontSize: '0.95rem' }} />
                  Pinned demo window
                </Typography>
                <Typography variant="h2" component="div">
                  {weekday}, {month} {dayNum}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {formatHourLabel(score.startTime)} – {formatHourLabel(score.endTime)} · {lengthHours}-hour demo
                </Typography>
              </Box>
              <Box
                component="div"
                sx={{
                  fontSize: { xs: '2rem', sm: '2.6rem' },
                  fontWeight: 900,
                  lineHeight: 1,
                  color: statusColor,
                  textAlign: { xs: 'left', sm: 'right' },
                }}
              >
                {STATUS_LABEL[score.status]}
              </Box>
            </Box>

            {!score.complete && (
              <Alert severity="warning" variant="outlined">
                Some hours in this window are missing readings, so it can't clear — shown as no-go.
              </Alert>
            )}

            <WindowFactorGrid factors={score.factors} />

            <Box
              sx={{
                display: 'flex',
                justifyContent: 'flex-end',
                pt: 1.5,
                borderTop: 1,
                borderColor: 'divider',
              }}
            >
              <Button color="error" onClick={onUnpin}>
                Unpin
              </Button>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
