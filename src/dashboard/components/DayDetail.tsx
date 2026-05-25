// The drill-down that opens below the line for the selected day. Leads with the day's badge as
// a big word (the answer), flags missing data, then lays out every daylight hour so Tara can
// see exactly where conditions turn.
//
// It's also where a demo window gets PICKED: hovering/focusing an hour previews a fixed-length
// block centered on it, tinted by the block's rolled-up status. Hover is desktop-only sugar —
// committing is always a click/tap that bubbles a request up to the dashboard, which owns the
// confirm dialog and the pinned slot. The selection math lives in useWindowPreview; this component
// is the markup that binds to it.

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

// Column header aligned to the hour rows via the shared grid template, including HourRow's 2px
// side-border reserve so the header columns can't drift out of alignment with the rows.
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

  // The how-to hint when a window fits, or why one doesn't — surfaced from the daylight-hours info
  // icon so the header stays uncluttered.
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
                  {/* A focusable span carries the accessible name (the icon itself stays
                      aria-hidden) so the hint reaches keyboard and screen-reader users, not just
                      mouse hover. */}
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
              {/* Clearing on leave so the preview follows the cursor and vanishes when it exits. */}
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
