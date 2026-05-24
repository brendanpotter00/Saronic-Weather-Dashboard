// Collapsible footer reference. Collapsed by default so it stays out of the way of the
// 10-second glance; expanding reveals the two references side-by-side — the Key (StatusLegend,
// what the colours mean) and the Source (Attribution, where the numbers come from), with a
// hairline rule between them on desktop, stacked on phones. The summary is a white outlined bar
// with a hover state so it reads clearly as a clickable toggle against the off-white canvas;
// the chevron is pulled in next to the title rather than floating at the far edge.

import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import Typography from '@mui/material/Typography';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { StatusLegend } from './StatusLegend';
import { Attribution } from './Attribution';
import type { ScoredForecast } from '../../scoring/scoring';

interface DashboardFooterProps {
  site: ScoredForecast['site'];
  marineSite: ScoredForecast['marineSite'];
  marineAvailable: boolean;
}

export function DashboardFooter({ site, marineSite, marineAvailable }: DashboardFooterProps) {
  return (
    <Box component="footer">
      <Accordion
        disableGutters
        elevation={0}
        square
        // Flat container: no shadow, transparent, and drop the default top hairline so the
        // white summary bar below is the only thing the eye reads as the footer control.
        sx={{ bgcolor: 'transparent', '&::before': { display: 'none' } }}
      >
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="footer-reference-content"
          id="footer-reference-header"
          // A white, outlined, rounded bar that lifts on hover — an obvious "click me" affordance
          // against the #fafafa canvas. flexGrow:0 on the content stops MUI from shoving the
          // chevron to the far right, so title + chevron stay together as one tappable group.
          sx={(theme) => ({
            px: 2,
            borderRadius: 1,
            bgcolor: 'background.paper',
            border: 1,
            borderColor: 'divider',
            // Pin the title + chevron group to the left edge (flexGrow:0 alone leaves them
            // centred in the full-width bar).
            justifyContent: 'flex-start',
            transition: theme.transitions.create(['background-color', 'border-color']),
            '&:hover': { bgcolor: 'action.hover', borderColor: 'text.secondary' },
            '& .MuiAccordionSummary-content': { flexGrow: 0, mr: 0.5 },
          })}
        >
          <Typography variant="overline" color="text.primary">
            Status Key &amp; Sources
          </Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ px: 0, pt: 2 }}>
          <Box
            sx={{
              display: 'grid',
              // One column on phones (Key over Source); on desktop, Key | rule | Source. The
              // Key is content-rich so it gets the lion's share; the rule column hugs its 1px.
              gridTemplateColumns: { xs: '1fr', md: '1.7fr auto 1fr' },
              gap: { xs: 3, md: 4 },
              alignItems: 'stretch',
            }}
          >
            <StatusLegend />
            <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', md: 'block' } }} />
            <Attribution site={site} marineSite={marineSite} marineAvailable={marineAvailable} />
          </Box>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
}
