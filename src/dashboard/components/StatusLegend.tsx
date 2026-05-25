// The status key. Each factor's thresholds, tinted go/caution/no-go, derived from the SAME
// threshold constants scoring uses — so the key can't disagree with the colours. Unlike FactorCell
// (where a GO reading is neutral ink), here the GO value IS green: the key defines the colours.

import { Fragment } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { Status } from '../../scoring/status';
import { STATUS_TO_PALETTE, STATUS_LABEL } from '../../theme/statusColor';
import {
  WIND_NOGO_KN,
  WIND_CAUTION_KN,
  WAVE_NOGO_FT,
  WAVE_CAUTION_FT,
  VISIBILITY_NOGO_MILES,
  VISIBILITY_GO_MILES,
} from '../../scoring/weatherThresholds';

// One tinted threshold the eye reads off the key (e.g. "<15" shown in green).
interface KeySegment {
  text: string;
  status: Status;
}
// A factor's band: label, unit, and segments in good → no-go order. Rain is binary (no caution).
interface KeyFactor {
  label: string;
  unit: string;
  segments: KeySegment[];
}

const FACTORS: KeyFactor[] = [
  {
    label: 'Wind Speed',
    unit: 'kn',
    segments: [
      { text: `<${WIND_CAUTION_KN}`, status: Status.Go },
      { text: `${WIND_CAUTION_KN}–${WIND_NOGO_KN}`, status: Status.Caution },
      { text: `>${WIND_NOGO_KN}`, status: Status.NoGo },
    ],
  },
  {
    label: 'Wave Height',
    unit: 'ft',
    segments: [
      { text: `<${WAVE_CAUTION_FT}`, status: Status.Go },
      { text: `${WAVE_CAUTION_FT}–${WAVE_NOGO_FT}`, status: Status.Caution },
      { text: `>${WAVE_NOGO_FT}`, status: Status.NoGo },
    ],
  },
  {
    label: 'Visibility',
    unit: 'mi',
    // Inverted vs wind/wave: GO is the HIGH end. The caution band stops JUST BELOW the go ideal
    // ("3–<10", not "3–10") so 10 mi isn't tinted as both — mirroring the scoring boundary.
    segments: [
      { text: `≥${VISIBILITY_GO_MILES}`, status: Status.Go },
      { text: `${VISIBILITY_NOGO_MILES}–<${VISIBILITY_GO_MILES}`, status: Status.Caution },
      { text: `<${VISIBILITY_NOGO_MILES}`, status: Status.NoGo },
    ],
  },
  {
    label: 'Rain',
    unit: '',
    segments: [
      { text: 'none', status: Status.Go },
      { text: 'any', status: Status.NoGo },
    ],
  },
];

// The colour→meaning anchor: the three status words, tinted. Keeps the key readable without colour.
const GUIDE: Status[] = [Status.Go, Status.Caution, Status.NoGo];

// A "/"-joined run of tinted threshold values; muted slashes separate them.
function tintedRun(segments: { text: string; status: Status }[]) {
  return segments.map((seg, i) => (
    <Fragment key={seg.text}>
      {i > 0 && (
        <Box component="span" sx={{ color: 'text.disabled' }}>
          {' / '}
        </Box>
      )}
      <Box component="span" sx={{ color: `${STATUS_TO_PALETTE[seg.status]}.main`, fontWeight: 700 }}>
        {seg.text}
      </Box>
    </Fragment>
  ));
}

export function StatusLegend() {
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', columnGap: 2, rowGap: 0.5 }}>
      {/* Colour anchor leads, so the mapping is learned before the per-factor thresholds. */}
      <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
        {tintedRun(GUIDE.map((status) => ({ text: STATUS_LABEL[status], status })))}
      </Typography>
      {FACTORS.map((factor) => (
        // nowrap keeps a factor whole — the row wraps factor-by-factor, never mid-threshold.
        <Typography key={factor.label} variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
          {factor.label}{' '}
          {tintedRun(factor.segments)}
          {factor.unit && ` ${factor.unit}`}
        </Typography>
      ))}
    </Box>
  );
}
