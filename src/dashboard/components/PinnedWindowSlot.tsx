// One pinned demo window as a card: status strip + word, day, range, and the four readings, plus a
// ✕ to unpin. Pure presentation — the section re-derives the score from the live forecast each
// render, so it firms up with no card-level logic. Renders nothing when the score is null (its day
// rolled off the horizon).

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

// The ✕ rests muted grey and warms to red on hover/focus — a "remove" cue without a shouting-red
// resting state. Negative margins pull it into the corner to align with the card edge.
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
  date: string; // the pinned day's calendar key — always present (the section renders one card per pin)
  score: NamedWindowScore | null; // null = its day rolled off the 10-day horizon → the card hides itself
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
            {/* Eyebrow + corner ✕ on one line, then day/range + status word below — so the ✕
                doesn't collide with the large status word. */}
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
