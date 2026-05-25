// Says plainly WHERE the weather comes from and FOR WHERE. Surfaces both grid cells because the
// marine model snaps to the nearest ocean cell, so its lat/lon differs from the forecast cell —
// expected, not a bug.

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { DEFAULT_SITE } from '../../config/sites';
import type { ScoredForecast } from '../../scoring/scoring';

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
  const marine = marineAvailable && marineSite ? `Marine ${coords(marineSite)}` : 'Marine data unavailable';
  return (
    // inline-grid so the block shrinks to its content; labels left, values right.
    <Box
      sx={{
        display: 'inline-grid',
        gridTemplateColumns: 'auto auto',
        columnGap: 1.5,
        rowGap: 0.25,
        alignItems: 'baseline',
        textAlign: 'left',
      }}
    >
      <Typography variant="overline" color="text.secondary" component="div">
        Source
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        Open-Meteo · Forecast + Marine
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {DEFAULT_SITE.label}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        Forecast {coords(site)} · {marine}
      </Typography>
    </Box>
  );
}
