// Says plainly WHERE the weather comes from and FOR WHERE — so Tara trusts the numbers. Lives
// in the page footer. Surfaces the resolved grid cells the two Open-Meteo APIs actually answered
// for: the marine model snaps to the nearest ocean cell, so its lat/lon differs from the forecast
// cell. That's expected, not a bug, and showing it is more honest than hiding it.

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { DEFAULT_SITE } from '../config/sites';
import type { ScoredForecast } from '../scoring/scoring';

// Compact "lat, lon" with a real minus sign for the western longitude.
function coords(cell: { latitude: number; longitude: number }): string {
  return `${cell.latitude.toFixed(3)}, ${cell.longitude.toFixed(3)}`.replace(/-/g, '−');
}

interface AttributionProps {
  site: ScoredForecast['site'];
  marineSite: ScoredForecast['marineSite'];
  marineAvailable: boolean;
}

export function Attribution({ site, marineSite, marineAvailable }: AttributionProps) {
  return (
    <Box>
      <Typography variant="overline" color="text.secondary" component="div">
        Source
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        Open-Meteo · Forecast + Marine
      </Typography>
      <Stack spacing={0} sx={{ mt: 0.5 }}>
        <Typography variant="caption" color="text.secondary">
          {DEFAULT_SITE.label} · forecast grid {coords(site)}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {marineAvailable && marineSite ? `marine grid ${coords(marineSite)}` : 'marine data unavailable'}
        </Typography>
      </Stack>
    </Box>
  );
}
