// Composes the two footer references — the Key (StatusLegend, what the colours mean) and the
// Source (Attribution, where the numbers come from) — into one borderless footer: side-by-side
// with a hairline rule between them on desktop, stacked on phones. Pure layout; each child owns
// its own content and pulls every value from the theme.

import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import { StatusLegend } from './StatusLegend';
import { Attribution } from './Attribution';
import type { ScoredForecast } from '../scoring/scoring';

interface DashboardFooterProps {
  site: ScoredForecast['site'];
  marineSite: ScoredForecast['marineSite'];
  marineAvailable: boolean;
}

export function DashboardFooter({ site, marineSite, marineAvailable }: DashboardFooterProps) {
  return (
    <Box component="footer">
      <Divider sx={{ mb: { xs: 2, md: 3 } }} />
      <Box
        sx={{
          display: 'grid',
          // One column on phones (Key over Source); on desktop, Key | rule | Source. The Key
          // is content-rich so it gets the lion's share; the rule column hugs its 1px width.
          gridTemplateColumns: { xs: '1fr', md: '1.7fr auto 1fr' },
          gap: { xs: 3, md: 4 },
          alignItems: 'stretch',
        }}
      >
        <StatusLegend />
        <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', md: 'block' } }} />
        <Attribution site={site} marineSite={marineSite} marineAvailable={marineAvailable} />
      </Box>
    </Box>
  );
}
