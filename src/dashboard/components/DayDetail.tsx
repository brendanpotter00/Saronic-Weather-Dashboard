// The drill-down for the selected day: leads with the badge as a big word, flags missing data, then
// lays out every daylight hour. Also where a demo window gets PICKED — hover previews a block,
// click/tap bubbles a request up to the dashboard. The selection math lives in useWindowPreview.

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Tooltip from '@mui/material/Tooltip';
import Alert from '@mui/material/Alert';
import { styled } from '@mui/material/styles';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { Status } from '../../scoring/status';
import type { ScoredDay } from '../../scoring/scoring';
import { HourRow, HOUR_GRID } from './HourRow';
import { StatusStrip } from './StatusStrip';
import { StatusWord } from './StatusWord';
import { useWindowPreview } from '../hooks/useWindowPreview';
import { formatDayLabel } from '../format';

// Plain-language read of the day's badge — describes status, never recommends a window.
const SUMMARY: Record<Status, string> = {
  [Status.Go]: 'A full demo window is available. Every factor stays clear.',
  [Status.Caution]: 'A demo window is achievable, but one or more hours run close to the no-go thresholds.',
  [Status.NoGo]: 'No demo window stays clear of the no-go thresholds this day.',
};

// Column header aligned to the rows via the shared grid template + HourRow's 2px side-border reserve.
const HourGridHeader = styled(Box)(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: HOUR_GRID,
  columnGap: theme.spacing(1.5),
  paddingBottom: theme.spacing(0.5),
  borderLeft: '2px solid transparent',
  borderRight: '2px solid transparent',
}));

interface DayDetailProps {
  day: ScoredDay;
  demoWindowHours: number;
  onRequestPin: (date: string, startHour: number, lengthHours: number) => void;
}

export function DayDetail({ day, demoWindowHours, onRequestPin }: DayDetailProps) {
  const { weekday, month, dayNum } = formatDayLabel(day.date);

  // Commit at the live demo length — that becomes the pin's frozen length from this moment on.
  const preview = useWindowPreview(day, demoWindowHours, (startHour) =>
    onRequestPin(day.date, startHour, demoWindowHours),
  );

  // The how-to hint when a window fits, or why one doesn't.
  const pinHint = preview.windowFits
    ? `Point at the middle of your demo — the ${demoWindowHours}-hour block centers there; click to pin.`
    : `Daylight is shorter than the ${demoWindowHours}-hour demo length, so no window fits.`;

  return (
    <Box component="section" aria-label="Selected day detail">
      <Card>
        <StatusStrip status={day.badge} />
        <CardContent>
          <Stack spacing={2}>
            <Box>
              <Typography variant="overline" color="text.secondary" component="div">
                {weekday}, {month} {dayNum}
              </Typography>
              <StatusWord status={day.badge} sx={{ fontSize: '2.4rem' }} />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {SUMMARY[day.badge]}
              </Typography>
            </Box>

            {!day.complete && (
              <Alert severity="warning" variant="outlined">
                Some readings are missing for this day, so it can't clear — shown as no-go.
              </Alert>
            )}

            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                <Typography variant="overline" color="text.secondary" component="div">
                  Daylight hours
                </Typography>
                <Tooltip title={pinHint}>
                  {/* Focusable span carries the accessible name so the hint reaches keyboard and
                      screen-reader users, not just hover. */}
                  <Box
                    component="span"
                    role="img"
                    aria-label={pinHint}
                    tabIndex={0}
                    sx={{ display: 'inline-flex', color: 'text.secondary', cursor: 'help' }}
                  >
                    <InfoOutlinedIcon sx={{ fontSize: '1rem' }} />
                  </Box>
                </Tooltip>
              </Box>
              <HourGridHeader>
                <span />
                <Typography variant="caption" color="text.secondary">Time</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'right' }}>Wind Speed</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'right' }}>Wave Height</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'right' }}>Rain</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'right' }}>Visibility</Typography>
              </HourGridHeader>
              {/* Clear on leave so the preview vanishes when the cursor exits. */}
              <Box onMouseLeave={preview.clearPreview}>
                {day.hours.map((hour) => (
                  <HourRow
                    key={hour.time}
                    hour={hour}
                    inSelection={preview.isInSelection(hour.clockHour)}
                    selectionStatus={preview.selectionStatus}
                    isSelectionStart={preview.isSelectionStart(hour.clockHour)}
                    isSelectionEnd={preview.isSelectionEnd(hour.clockHour)}
                    onHover={preview.previewHour}
                    onSelect={preview.selectHour}
                  />
                ))}
              </Box>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
