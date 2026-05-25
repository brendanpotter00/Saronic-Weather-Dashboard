// The top context band: the site-named title (data-driven off DEFAULT_SITE, so it reads as
// "<place> Weather Dashboard" and updates for free when multi-city lands) on the left, and the
// data Source (Attribution) tucked top-right so Tara can see provenance at a glance. The window
// and demo-length controls live just below in DashboardConfigPanel; the status key rides the
// "10-Day Forecast" heading row.

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
        {DEFAULT_SITE.label} Weather Dashboard
      </Typography>
      {/* Right-aligned on desktop; stacks back to the left when the header wraps on a phone. */}
      <Box sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
        <Attribution site={site} marineSite={marineSite} marineAvailable={marineAvailable} />
      </Box>
    </Box>
  );
}
