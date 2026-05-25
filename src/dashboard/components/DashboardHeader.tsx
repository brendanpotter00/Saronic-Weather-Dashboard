// The top context band: the site-named title on the left, the data Source (Attribution) top-right.

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { DEFAULT_SITE } from '../../config/sites';
import { Attribution } from './Attribution';
import type { ScoredForecast } from '../../scoring/scoring';

interface DashboardHeaderProps {
  site: ScoredForecast['site'];
  marineSite: ScoredForecast['marineSite'];
  marineAvailable: boolean;
}

export function DashboardHeader({ site, marineSite, marineAvailable }: DashboardHeaderProps) {
  return (
    <Box
      component="header"
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        columnGap: 2,
        rowGap: 1,
      }}
    >
      <Typography variant="h1" component="h1">
        {DEFAULT_SITE.rangeName} — {DEFAULT_SITE.label} Weather Dashboard
      </Typography>
      {/* Right-aligned on desktop; left when the header wraps on a phone. */}
      <Box sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
        <Attribution site={site} marineSite={marineSite} marineAvailable={marineAvailable} />
      </Box>
    </Box>
  );
}
