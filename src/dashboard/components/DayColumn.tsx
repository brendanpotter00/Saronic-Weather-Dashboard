// One day in the horizon line: a tappable column with the weekday + date (tinted by the day's
// badge) above that day's HourLine. A real <button> (ButtonBase) for keyboard/screen-reader users.

import ButtonBase from '@mui/material/ButtonBase';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { styled, alpha } from '@mui/material/styles';
import type { ScoredDay } from '../../scoring/scoring';
import { STATUS_TO_PALETTE, STATUS_LABEL, type StatusPaletteKey } from '../../theme/statusColor';
import { HourLine } from './HourLine';
import { formatDayLabel } from '../format';

// A candidate day wears a soft status-tinted band so the valid set reads as a group (faint at rest,
// deeper on hover) — kept below the date-number tint so the strip isn't a wall of colour.
const BAND_ALPHA = 0.1;
const BAND_HOVER_ALPHA = 0.16;
const COLUMN_WIDTH_XS_PX = 56; // fixed column width when the horizon scrolls on phones

interface DayCellProps {
  paletteKey: StatusPaletteKey; // day.badge mapped through STATUS_TO_PALETTE
  candidate: boolean; // day.isCandidate — owns the COLOUR channel (tint + border)
  selected: boolean; // owns the black selection RING (boxShadow); composes with the tint
}

// Candidacy is the COLOUR channel; selection is the black ring. They compose: a selected candidate
// keeps its tint and gains the ring; a selected non-candidate falls back to neutral grey.
const DayCell = styled(ButtonBase, {
  shouldForwardProp: (prop) => !['paletteKey', 'candidate', 'selected'].includes(prop as string),
})<DayCellProps>(({ theme, paletteKey, candidate, selected }) => {
  const bandColor = theme.palette[paletteKey].main;
  return {
    flex: `0 0 ${COLUMN_WIDTH_XS_PX}px`, // phones: fixed width, the row scrolls
    [theme.breakpoints.up('sm')]: { flex: 1 }, // desktop: equal share
    minWidth: 0,
    padding: theme.spacing(1),
    borderRadius: theme.shape.borderRadius,
    display: 'block',
    // 1px border reserved on every column so colouring a candidate's edge can't shift the row.
    border: '1px solid',
    borderColor: candidate ? bandColor : 'transparent',
    transition: theme.transitions.create(['background-color', 'box-shadow', 'border-color']),
    backgroundColor: candidate
      ? alpha(bandColor, BAND_ALPHA)
      : selected
        ? theme.palette.action.selected
        : 'transparent',
    boxShadow: selected ? `inset 0 0 0 2px ${theme.palette.primary.main}` : 'none',
    '&:hover': {
      backgroundColor: candidate ? alpha(bandColor, BAND_HOVER_ALPHA) : theme.palette.action.hover,
    },
  };
});

interface DayColumnProps {
  day: ScoredDay;
  isToday: boolean;
  isSelected: boolean;
  onSelect: (date: string) => void;
}

export function DayColumn({ day, isToday, isSelected, onSelect }: DayColumnProps) {
  const { dow, dayNum } = formatDayLabel(day.date);
  const paletteKey = STATUS_TO_PALETTE[day.badge];
  const badgeColor = `${paletteKey}.main`;

  return (
    <DayCell
      paletteKey={paletteKey}
      candidate={day.isCandidate}
      selected={isSelected}
      onClick={() => onSelect(day.date)}
      aria-pressed={isSelected}
      aria-label={`${dow} ${dayNum} — ${STATUS_LABEL[day.badge]}${day.isCandidate ? ' · valid demo window' : ''}`}
    >
      <Stack spacing={0.75} sx={{ width: '100%' }}>
        <Box sx={{ textAlign: 'center', lineHeight: 1.1 }}>
          <Typography
            variant="caption"
            sx={{ display: 'block', fontWeight: 700, letterSpacing: '0.06em', color: isToday ? 'primary.main' : 'text.secondary' }}
          >
            {isToday ? 'TODAY' : dow}
          </Typography>
          <Typography sx={{ fontWeight: 800, fontSize: '1.05rem', color: badgeColor, lineHeight: 1 }}>
            {dayNum}
          </Typography>
        </Box>
        <HourLine hours={day.hours} />
      </Stack>
    </DayCell>
  );
}
