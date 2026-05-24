// The key, as a skim-down reference (lives in the page footer). Each band stacks its factors
// vertically under a fixed-width badge, so Wind/Wave/Vis/Rain line up across GO → CAUTION →
// NO-GO. The band numbers are interpolated from the SAME threshold constants the scoring uses,
// so the legend can never quietly disagree with how the colours were actually assigned.

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Status } from '../../scoring/status';
import { StatusBadge } from './StatusBadge';
import {
  WIND_NOGO_KN,
  WIND_CAUTION_KN,
  WAVE_NOGO_FT,
  WAVE_CAUTION_FT,
  VISIBILITY_NOGO_MILES,
  VISIBILITY_GO_MILES,
} from '../../scoring/weatherThresholds';

const BANDS: { status: Status; factors: string[] }[] = [
  {
    status: Status.Go,
    factors: [`wind < ${WIND_CAUTION_KN} kn`, `wave < ${WAVE_CAUTION_FT} ft`, `vis ≥ ${VISIBILITY_GO_MILES} mi`, 'no rain'],
  },
  {
    status: Status.Caution,
    factors: [`wind ${WIND_CAUTION_KN}–${WIND_NOGO_KN} kn`, `wave ${WAVE_CAUTION_FT}–${WAVE_NOGO_FT} ft`, `vis ${VISIBILITY_NOGO_MILES}–${VISIBILITY_GO_MILES} mi`],
  },
  {
    status: Status.NoGo,
    factors: [`wind > ${WIND_NOGO_KN} kn`, `wave > ${WAVE_NOGO_FT} ft`, `vis < ${VISIBILITY_NOGO_MILES} mi`, 'any rain'],
  },
];

export function StatusLegend() {
  return (
    <Box>
      <Typography variant="overline" color="text.secondary" component="div" sx={{ mb: 1 }}>
        Key · worst factor sets the status
      </Typography>
      <Stack spacing={2}>
        {BANDS.map(({ status, factors }) => (
          <Stack key={status} direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
            <Box sx={{ width: 88, flexShrink: 0 }}>
              <StatusBadge status={status} />
            </Box>
            <Stack spacing={0.25}>
              {factors.map((factor) => (
                <Typography key={factor} variant="caption" color="text.secondary">
                  {factor}
                </Typography>
              ))}
            </Stack>
          </Stack>
        ))}
      </Stack>
    </Box>
  );
}
