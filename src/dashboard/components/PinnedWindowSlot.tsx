// One pinned demo window, rendered as a card: status strip + word, day, range, and the four
// worst-in-window readings, plus a top-corner ✕ to unpin. It is pure presentation — the section
// re-derives the score from the live forecast on every render (scoreNamedWindow), so the status
// firms up here with no card-level logic. Renders nothing when that score is null (the window's
// day has rolled off the 10-day horizon), so a stale pin simply drops out without erroring.

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { styled } from '@mui/material/styles';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import CloseIcon from '@mui/icons-material/Close';
import type { NamedWindowScore } from '../../scoring/window';
import { formatDayLabel, formatHourLabel } from '../format';
import { WindowFactorGrid } from './WindowFactorGrid';
import { StatusStrip } from './StatusStrip';
import { StatusWord } from './StatusWord';
import { IncompleteWindowAlert } from './IncompleteWindowAlert';

// Unpinning is a reversible view action, so the ✕ rests muted grey and only warms toward the
// no-go red on hover/focus — a clear "remove" cue without a shouting-red resting state. The
// negative margins pull its padding into the corner so the ✕ optically aligns to the card edge
// and the eyebrow line. Tokens only, no raw hex.
const UnpinButton = styled(IconButton)(({ theme }) => ({
  marginTop: theme.spacing(-0.5),
  marginRight: theme.spacing(-0.5),
  color: theme.palette.text.secondary,
  transition: theme.transitions.create(['color', 'background-color'], {
    duration: theme.transitions.duration.shorter,
  }),
  '&:hover, &:focus-visible': {
    color: theme.palette.error.main,
    backgroundColor: theme.palette.action.hover,
  },
}));

interface PinnedWindowSlotProps {
  date: string;
  score: NamedWindowScore | null; // null = the window's day has rolled off the horizon → hide the card
  lengthHours: number; // the demo length frozen at pin time (independent of the live config)
  onUnpin: () => void;
}

export function PinnedWindowSlot({ date, score, lengthHours, onUnpin }: PinnedWindowSlotProps) {
  if (score === null) return null;

  const { weekday, month, dayNum } = formatDayLabel(date);

  return (
    <Box component="section" aria-label={`Pinned demo window: ${weekday}, ${month} ${dayNum}`}>
      <Card>
        <StatusStrip status={score.status} />
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
                  <UnpinButton size="small" aria-label="Unpin" onClick={onUnpin}>
                    <CloseIcon fontSize="small" />
                  </UnpinButton>
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
                <StatusWord
                  status={score.status}
                  sx={{ fontSize: { xs: '2rem', sm: '2.6rem' }, textAlign: { xs: 'left', sm: 'right' } }}
                />
              </Box>
            </Box>

            {!score.complete && <IncompleteWindowAlert />}

            <WindowFactorGrid factors={score.factors} />
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
