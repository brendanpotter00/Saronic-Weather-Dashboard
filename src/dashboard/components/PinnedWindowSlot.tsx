// The reserved layout seam at the top of the dashboard, now filled by the "pin a chosen window"
// feature. Empty (renders null) until Tara pins one — so there's no layout shift — then it shows
// her scheduled demo window: status strip + word, day, range, the four worst-in-window readings,
// a days-out line, and Edit / Unpin. It is pure presentation: the dashboard re-derives the score
// from the live forecast on every render (scoreNamedWindow), so the status firms up each morning
// here with no card-level logic.

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
import { formatDayLabel, formatHourLabel, daysUntil } from '../format';
import { WindowFactorGrid } from './WindowFactorGrid';

interface PinnedWindowSlotProps {
  date: string | null; // null = nothing pinned → the slot stays empty
  score: NamedWindowScore | null;
  demoWindowHours: number;
  onEdit: () => void;
  onUnpin: () => void;
}

// "T-minus N days", with the near terms read in words — Tara's glance is about how close the date is.
function leadTimeLabel(date: string): string {
  const days = daysUntil(date);
  if (days < 0) return 'Date has passed';
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow · 1 day out';
  return `T-minus ${days} days`;
}

export function PinnedWindowSlot({ date, score, demoWindowHours, onEdit, onUnpin }: PinnedWindowSlotProps) {
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
                  Scheduled demo window
                </Typography>
                <Typography variant="h2" component="div">
                  {weekday}, {month} {dayNum}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {formatHourLabel(score.startTime)} – {formatHourLabel(score.endTime)} · {demoWindowHours}-hour demo
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                  <Box component="strong" sx={{ color: 'text.primary' }}>
                    {leadTimeLabel(date)}
                  </Box>{' '}
                  · re-scored each morning as the forecast firms up
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
                flexWrap: 'wrap',
                gap: 1,
                justifyContent: 'flex-end',
                alignItems: 'center',
                pt: 1.5,
                borderTop: 1,
                borderColor: 'divider',
              }}
            >
              <Stack direction="row" spacing={1}>
                <Button color="primary" onClick={onEdit}>
                  Edit window
                </Button>
                <Button color="error" onClick={onUnpin}>
                  Unpin
                </Button>
              </Stack>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
