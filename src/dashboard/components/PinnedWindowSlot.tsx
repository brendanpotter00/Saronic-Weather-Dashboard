// The reserved layout seam at the top of the dashboard, now filled by the "pin a chosen window"
// feature. Empty (renders null) until Tara pins one — so there's no layout shift — then it shows
// her pinned demo window: status strip + word, day, range, and the four worst-in-window readings,
// plus a top-corner ✕ to unpin. It is pure presentation: the dashboard re-derives the score from
// the live forecast on every render (scoreNamedWindow), so the status firms up here with no
// card-level logic.

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import CloseIcon from '@mui/icons-material/Close';
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
    <Box component="section" aria-label={`Pinned demo window: ${weekday}, ${month} ${dayNum}`}>
      <Card>
        <Box sx={{ height: 5, bgcolor: statusColor }} />
        <CardContent>
          <Stack spacing={2}>
            {/* Header: eyebrow + the corner unpin control on one line, then day/range + status
                word on the next — so the ✕ owns the top-right corner without colliding with the
                large status word, which now sits on the day line. */}
            <Box>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 1,
                }}
              >
                <Typography
                  variant="overline"
                  color="text.secondary"
                  sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                >
                  <PushPinOutlinedIcon sx={{ fontSize: '0.95rem' }} />
                  Pinned demo window
                </Typography>
                <Tooltip title="Unpin">
                  <IconButton
                    size="small"
                    aria-label="Unpin"
                    onClick={onUnpin}
                    sx={{
                      // Pull the button's padding into the corner so the ✕ optically aligns to
                      // the card edge and the eyebrow line.
                      mt: -0.5,
                      mr: -0.5,
                      // Unpinning is a reversible view action, so the ✕ rests muted grey and only
                      // warms toward the no-go red on hover/focus — a clear "remove" cue without a
                      // shouting-red resting state. Tokens only, no raw hex.
                      color: 'text.secondary',
                      transition: (theme) =>
                        theme.transitions.create(['color', 'background-color'], {
                          duration: theme.transitions.duration.shorter,
                        }),
                      '&:hover, &:focus-visible': {
                        color: 'error.main',
                        bgcolor: 'action.hover',
                      },
                    }}
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '1fr auto' },
                  gap: 2,
                  alignItems: 'start',
                }}
              >
                <Box>
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
            </Box>

            {!score.complete && (
              <Alert severity="warning" variant="outlined">
                Some hours in this window are missing readings, so it can't clear — shown as no-go.
              </Alert>
            )}

            <WindowFactorGrid factors={score.factors} />
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
