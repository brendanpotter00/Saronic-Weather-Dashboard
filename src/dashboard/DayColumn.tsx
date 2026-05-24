// One day in the horizon line: a tappable column showing the weekday + date (the date number
// tinted by the day's best-achievable badge) above that day's HourLine. Clicking it opens the
// detail below. It's a real <button> (ButtonBase) so keyboard + screen-reader users get the
// same affordance.

import ButtonBase from '@mui/material/ButtonBase';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { ScoredDay } from '../scoring/scoring';
import { STATUS_TO_PALETTE, STATUS_LABEL } from '../theme/statusColor';
import { HourLine } from './HourLine';
import { formatDayLabel } from './format';

interface DayColumnProps {
  day: ScoredDay;
  isToday: boolean;
  isSelected: boolean;
  onSelect: (date: string) => void;
}

export function DayColumn({ day, isToday, isSelected, onSelect }: DayColumnProps) {
  const { dow, dayNum } = formatDayLabel(day.date);
  const badgeColor = `${STATUS_TO_PALETTE[day.badge]}.main`;

  return (
    <ButtonBase
      onClick={() => onSelect(day.date)}
      aria-pressed={isSelected}
      aria-label={`${dow} ${dayNum} — ${STATUS_LABEL[day.badge]}`}
      sx={{
        flex: { xs: '0 0 56px', sm: 1 }, // fixed width when the row scrolls on phones; equal share otherwise
        minWidth: 0,
        p: 1,
        borderRadius: 1,
        display: 'block',
        transition: 'background-color .15s, box-shadow .15s',
        bgcolor: isSelected ? 'action.selected' : 'transparent',
        boxShadow: isSelected ? (t) => `inset 0 0 0 2px ${t.palette.primary.main}` : 'none',
        '&:hover': { bgcolor: 'action.hover' },
      }}
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
    </ButtonBase>
  );
}
