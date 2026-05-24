// The top context band: the title, named after the site (data-driven off DEFAULT_SITE) so it
// reads as "<place> Weather Dashboard" and updates for free when multi-city lands. The window
// and demo-length controls live just below in WindowControls; the key and source in the footer.

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { DEFAULT_SITE } from '../../config/sites';

export function DashboardHeader() {
  return (
    <Box component="header">
      <Typography variant="h1" component="h1">
        {DEFAULT_SITE.label} Weather Dashboard
      </Typography>
    </Box>
  );
}
