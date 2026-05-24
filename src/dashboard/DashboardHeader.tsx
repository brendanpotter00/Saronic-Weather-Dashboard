// The top context band: what this is, the constant demo-window rule, and how to read the
// colours. The title is named after the site (data-driven off DEFAULT_SITE) so it reads as
// "<place> Weather" and updates for free when multi-city lands. The demo-window requirement is
// stated here once because it never changes day to day; per-day facts live in the detail. Source
// attribution moved to the page footer (see Dashboard).

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { DEFAULT_SITE } from '../config/sites';

// demoWindowHours comes from the scored data (echoed from DEMO_WINDOW_HOURS), so the UI states
// the rule without importing app config — and a future configurable length flows through for free.
export function DashboardHeader({ demoWindowHours }: { demoWindowHours: number }) {
  return (
    <Box component="header">
      <Typography variant="h1" component="h1">
        {DEFAULT_SITE.label} Weather Dashboard
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
        10-day forecast · a demo needs {demoWindowHours}h of continuous in-bounds daylight
      </Typography>
    </Box>
  );
}
