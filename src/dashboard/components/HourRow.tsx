// One daylight hour in the detail table: a status bar, the clock hour, and the four factor
// readings. The row's grid template is shared with the header (HOUR_GRID) so columns line up.
//
// It's also the pin-selection surface: hovering/focusing a row previews a demo window centered on
// it, and clicking/tapping commits to the confirm dialog. When the row sits inside the previewed
// block it tints by the window's rolled-up status (the only saturated fill in the table) and draws
// the bracket on the first/last rows. The math lives in the scoring layer; this row only reports
// which hour it is (onHover/onSelect by clockHour) and renders the flags it's handed.

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { Factor, Status } from '../../scoring/status';
import type { ScoredHour } from '../../scoring/scoring';
import { STATUS_TO_PALETTE } from '../../theme/statusColor';
import { FactorCell } from './FactorCell';
import { formatHourLabel } from '../format';

// status bar · time · wind · wave · rain · vis — imported by DayDetail for the aligned header.
export const HOUR_GRID = '6px 56px repeat(4, 1fr)';

interface HourRowProps {
  hour: ScoredHour;
  inSelection: boolean;
  selectionStatus: Status | null; // the previewed window's rolled-up status (drives the tint)
  isSelectionStart: boolean;
  isSelectionEnd: boolean;
  onHover: (clockHour: number) => void;
  onSelect: (clockHour: number) => void;
}

export function HourRow({
  hour,
  inSelection,
  selectionStatus,
  isSelectionStart,
  isSelectionEnd,
  onHover,
  onSelect,
}: HourRowProps) {
  const paletteKey = selectionStatus ? STATUS_TO_PALETTE[selectionStatus] : null;

  return (
    <Box
      role="button"
      tabIndex={0}
      aria-label={`Pin a demo window around ${formatHourLabel(hour.time)}`}
      onMouseEnter={() => onHover(hour.clockHour)}
      onFocus={() => onHover(hour.clockHour)}
      onClick={() => onSelect(hour.clockHour)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect(hour.clockHour);
        }
      }}
      sx={(theme) => {
        const color = paletteKey ? theme.palette[paletteKey].main : undefined;
        return {
          display: 'grid',
          gridTemplateColumns: HOUR_GRID,
          columnGap: 1.5,
          alignItems: 'center',
          py: 0.75,
          borderTop: '1px solid',
          borderColor: 'divider',
          // 2px transparent side borders reserve space so the selection bracket can't shift the row.
          borderLeft: '2px solid transparent',
          borderRight: '2px solid transparent',
          cursor: 'pointer',
          transition: 'background-color .12s ease',
          // A selected row stays crisp even when out-of-window — Tara chose these hours explicitly.
          opacity: inSelection || hour.isInWindow ? 1 : 0.45,
          '&:hover': inSelection ? undefined : { bgcolor: 'action.hover' },
          '&:focus-visible': { outline: `2px solid ${theme.palette.primary.main}`, outlineOffset: '-2px' },
          ...(inSelection &&
            color && {
              bgcolor: alpha(color, 0.14),
              borderLeftColor: color,
              borderRightColor: color,
              // Drop the grey divider inside the block; bracket only the first/last edges.
              borderTopColor: isSelectionStart ? color : 'transparent',
              ...(isSelectionStart && { borderTopLeftRadius: 8, borderTopRightRadius: 8 }),
              ...(isSelectionEnd && {
                borderBottom: `2px solid ${color}`,
                borderBottomLeftRadius: 8,
                borderBottomRightRadius: 8,
              }),
            }),
        };
      }}
    >
      <Box sx={{ height: 20, borderRadius: 0.5, bgcolor: `${STATUS_TO_PALETTE[hour.status]}.main` }} />
      <Typography variant="caption" color="text.secondary">
        {formatHourLabel(hour.time)}
      </Typography>
      <FactorCell factor={Factor.Wind} scored={hour.wind} />
      <FactorCell factor={Factor.Wave} scored={hour.wave} />
      <FactorCell factor={Factor.Precipitation} scored={hour.precipitation} />
      <FactorCell factor={Factor.Visibility} scored={hour.visibility} />
    </Box>
  );
}
