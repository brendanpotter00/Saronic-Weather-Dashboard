// The drill-down that opens below the line for the selected day. Leads with the day's badge as
// a big word (the answer), states the two windows, flags missing data, then lays out every
// daylight hour so Tara can see exactly where conditions turn.

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import { Status } from '../../scoring/status';
import type { ScoredDay } from '../../scoring/scoring';
import { STATUS_TO_PALETTE, STATUS_LABEL } from '../../theme/statusColor';
import { WindowSummary } from './WindowSummary';
import { HourRow, HOUR_GRID } from './HourRow';
import { formatDayLabel } from '../format';

// Plain-language read of the day's badge — describes status, never recommends a window.
const SUMMARY: Record<Status, string> = {
  [Status.Go]: 'A full-length demo window holds up — all factors clear.',
  [Status.Caution]: 'A demo-length window is achievable, but conditions run iffy in it.',
  [Status.NoGo]: 'No demo-length window stays in bounds this day.',
};

export function DayDetail({ day }: { day: ScoredDay }) {
  const { weekday, month, dayNum } = formatDayLabel(day.date);
  const badgeColor = `${STATUS_TO_PALETTE[day.badge]}.main`;

  return (
    <Box component="section">
      <Card>
        <Box sx={{ height: 5, bgcolor: badgeColor }} />
        <CardContent>
          <Stack spacing={2}>
            <Box>
              <Typography variant="overline" color="text.secondary" component="div">
                {weekday}, {month} {dayNum}
              </Typography>
              <Typography component="div" sx={{ fontSize: '2.4rem', fontWeight: 900, lineHeight: 1, color: badgeColor }}>
                {STATUS_LABEL[day.badge]}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {SUMMARY[day.badge]}
              </Typography>
            </Box>

            <WindowSummary day={day} />

            {!day.complete && (
              <Alert severity="warning" variant="outlined">
                Some readings are missing for this day, so it can't clear — shown as no-go.
              </Alert>
            )}

            <Box>
              <Typography variant="overline" color="text.secondary" component="div" sx={{ mb: 0.5 }}>
                Daylight hours
              </Typography>
              {/* Column header, aligned to the hour rows via the shared grid template. */}
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: HOUR_GRID,
                  columnGap: 1.5,
                  pb: 0.5,
                }}
              >
                <span />
                <Typography variant="caption" color="text.secondary">Time</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'right' }}>Wind Speed</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'right' }}>Wave Height</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'right' }}>Rain</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'right' }}>Visibility</Typography>
              </Box>
              {day.hours.map((hour) => (
                <HourRow key={hour.time} hour={hour} />
              ))}
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
