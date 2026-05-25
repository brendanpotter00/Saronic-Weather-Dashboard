// The drill-down that opens below the line for the selected day. Leads with the day's badge as
// a big word (the answer), flags missing data, then lays out every daylight hour so Tara can
// see exactly where conditions turn.
//
// It's also where a demo window gets PICKED: hovering/focusing an hour previews a fixed-length
// block centered on it (centeredWindowStart), tinted by the block's rolled-up status
// (scoreNamedWindow). Hover is desktop-only sugar — committing is always a click/tap that bubbles
// a request up to the dashboard, which owns the confirm dialog and the pinned slot.

import { useState } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Tooltip from '@mui/material/Tooltip';
import Alert from '@mui/material/Alert';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { Status } from '../../scoring/status';
import type { ScoredDay } from '../../scoring/scoring';
import { centeredWindowStart, scoreNamedWindow } from '../../scoring/window';
import { STATUS_TO_PALETTE, STATUS_LABEL } from '../../theme/statusColor';
import { HourRow, HOUR_GRID } from './HourRow';
import { formatDayLabel } from '../format';

// Plain-language read of the day's badge — describes status, never recommends a window.
const SUMMARY: Record<Status, string> = {
  [Status.Go]: 'A full demo window is available. Every factor stays clear.',
  [Status.Caution]: 'A demo window is achievable, but one or more hours run close to the no-go thresholds.',
  [Status.NoGo]: 'No demo window stays clear of the no-go thresholds this day.',
};

interface DayDetailProps {
  day: ScoredDay;
  demoWindowHours: number;
  onRequestPin: (date: string, startHour: number) => void;
}

export function DayDetail({ day, demoWindowHours, onRequestPin }: DayDetailProps) {
  const { weekday, month, dayNum } = formatDayLabel(day.date);
  const badgeColor = `${STATUS_TO_PALETTE[day.badge]}.main`;

  // Start clock-hour of the block currently being previewed (null = nothing hovered/focused).
  const [hoverStart, setHoverStart] = useState<number | null>(null);

  // Daylight bounds = the span of hours actually shown, so every visible row is pinnable and the
  // block clamps to dawn/dusk. A day shorter than the demo length can't host a window at all.
  const bounds = day.hours.length
    ? { startHour: day.hours[0].clockHour, endHour: day.hours[day.hours.length - 1].clockHour }
    : null;
  const windowFits = bounds !== null && bounds.endHour - bounds.startHour + 1 >= demoWindowHours;

  // The how-to hint when a window fits, or why one doesn't — surfaced from the daylight-hours info
  // icon so the header stays uncluttered.
  const pinHint = windowFits
    ? `Point at the middle of your demo — the ${demoWindowHours}-hour block centers there; click to pin.`
    : `Daylight is shorter than the ${demoWindowHours}-hour demo length, so no window fits.`;

  // Preview status drives the tint; recomputed only when the hovered start moves. scoreNamedWindow
  // reads the already-scored hours, so this is cheap.
  const preview = hoverStart !== null ? scoreNamedWindow(day, hoverStart, demoWindowHours) : null;
  const selEnd = hoverStart !== null ? hoverStart + demoWindowHours - 1 : null;

  const resolveStart = (clockHour: number) => (bounds ? centeredWindowStart(clockHour, demoWindowHours, bounds) : null);

  return (
    <Box component="section" aria-label="Selected day detail">
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
                  <InfoOutlinedIcon
                    aria-label={pinHint}
                    tabIndex={0}
                    sx={{ fontSize: '1rem', color: 'text.secondary', cursor: 'help' }}
                  />
                </Tooltip>
              </Box>
              {/* Column header, aligned to the hour rows via the shared grid template. */}
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: HOUR_GRID,
                  columnGap: 1.5,
                  pb: 0.5,
                  // Match HourRow's 2px side-border reserve so the header columns stay aligned.
                  borderLeft: '2px solid transparent',
                  borderRight: '2px solid transparent',
                }}
              >
                <span />
                <Typography variant="caption" color="text.secondary">Time</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'right' }}>Wind Speed</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'right' }}>Wave Height</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'right' }}>Rain</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'right' }}>Visibility</Typography>
              </Box>
              {/* Clearing on leave so the preview follows the cursor and vanishes when it exits. */}
              <Box onMouseLeave={() => setHoverStart(null)}>
                {day.hours.map((hour) => {
                  const inSelection = hoverStart !== null && hour.clockHour >= hoverStart && hour.clockHour <= selEnd!;
                  return (
                    <HourRow
                      key={hour.time}
                      hour={hour}
                      inSelection={inSelection}
                      selectionStatus={preview?.status ?? null}
                      isSelectionStart={hour.clockHour === hoverStart}
                      isSelectionEnd={hour.clockHour === selEnd}
                      onHover={(clockHour) => setHoverStart(resolveStart(clockHour))}
                      onSelect={(clockHour) => {
                        const start = resolveStart(clockHour);
                        if (start !== null) onRequestPin(day.date, start);
                      }}
                    />
                  );
                })}
              </Box>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
