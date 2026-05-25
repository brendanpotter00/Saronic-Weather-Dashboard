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
import { styled, alpha } from '@mui/material/styles';
import { Factor, Status } from '../../scoring/status';
import type { ScoredHour } from '../../scoring/scoring';
import { STATUS_TO_PALETTE, type StatusPaletteKey } from '../../theme/statusColor';
import { FactorCell } from './FactorCell';
import { formatHourLabel } from '../format';

// status bar · time · wind · wave · rain · vis — imported by DayDetail for the aligned header.
export const HOUR_GRID = '6px 56px repeat(4, 1fr)';

const SELECTION_TINT_ALPHA = 0.14; // status tint behind a previewed window — the table's only fill

interface HourRowRootProps {
  paletteKey: StatusPaletteKey | null; // previewed window's status; null when no preview
  inSelection: boolean;
  isSelectionStart: boolean;
  isSelectionEnd: boolean;
  isInWindow: boolean; // hour.isInWindow — drives the out-of-window dimming
}

const HourRowRoot = styled(Box, {
  shouldForwardProp: (prop) =>
    !['paletteKey', 'inSelection', 'isSelectionStart', 'isSelectionEnd', 'isInWindow'].includes(
      prop as string,
    ),
})<HourRowRootProps>(({ theme, paletteKey, inSelection, isSelectionStart, isSelectionEnd, isInWindow }) => {
  const bracketColor = paletteKey ? theme.palette[paletteKey].main : undefined;
  const radius = theme.shape.borderRadius;

  const base = {
    display: 'grid',
    gridTemplateColumns: HOUR_GRID,
    columnGap: theme.spacing(1.5),
    alignItems: 'center',
    paddingTop: theme.spacing(0.75),
    paddingBottom: theme.spacing(0.75),
    borderTop: `1px solid ${theme.palette.divider}`,
    // 2px transparent side borders reserve space so the selection bracket can't shift the row.
    borderLeft: '2px solid transparent',
    borderRight: '2px solid transparent',
    cursor: 'pointer',
    transition: theme.transitions.create('background-color'),
    // A selected row stays crisp even when out-of-window — Tara chose these hours explicitly.
    opacity: inSelection || isInWindow ? 1 : 0.45,
    '&:focus-visible': {
      outline: `2px solid ${theme.palette.primary.main}`,
      outlineOffset: '-2px',
    },
  };

  // Outside the previewed block: hover hints the row is clickable.
  if (!inSelection || !bracketColor) {
    return { ...base, '&:hover': { backgroundColor: theme.palette.action.hover } };
  }

  // Inside the block: tint by the window's status; bracket only the first/last edges.
  // Drop the grey divider inside the block — only the outer edges get the coloured bracket.
  return {
    ...base,
    backgroundColor: alpha(bracketColor, SELECTION_TINT_ALPHA),
    borderLeftColor: bracketColor,
    borderRightColor: bracketColor,
    borderTopColor: isSelectionStart ? bracketColor : 'transparent',
    borderTopLeftRadius: isSelectionStart ? radius : 0,
    borderTopRightRadius: isSelectionStart ? radius : 0,
    ...(isSelectionEnd && {
      borderBottom: `2px solid ${bracketColor}`,
      borderBottomLeftRadius: radius,
      borderBottomRightRadius: radius,
    }),
  };
});

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
    <HourRowRoot
      role="button"
      tabIndex={0}
      aria-label={`Pin a demo window around ${formatHourLabel(hour.time)}`}
      paletteKey={paletteKey}
      inSelection={inSelection}
      isSelectionStart={isSelectionStart}
      isSelectionEnd={isSelectionEnd}
      isInWindow={hour.isInWindow}
      onMouseEnter={() => onHover(hour.clockHour)}
      onFocus={() => onHover(hour.clockHour)}
      onClick={() => onSelect(hour.clockHour)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect(hour.clockHour);
        }
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
    </HourRowRoot>
  );
}
