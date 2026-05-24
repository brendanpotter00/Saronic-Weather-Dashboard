// Collapsible footer reference. The whole thing is one white, outlined card so the surface
// persists behind both states: collapsed it's a slim white bar (just the summary); expanded the
// white extends down behind the two references — the Key (StatusLegend, what the colours mean)
// and the Source (Attribution, where the numbers come from), side-by-side with a hairline rule
// between them on desktop, stacked on phones. Collapsed by default to stay out of the 10-second
// glance; the summary darkens on hover so it reads clearly as a clickable toggle, and the chevron
// is pulled in next to the title rather than floating at the far edge.

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
        // The card itself: white surface + hairline border + rounded corners, so the white
        // persists behind the details when expanded. overflow:hidden clips the summary's hover
        // highlight to the rounded corners. Drop MUI's default top pseudo-rule.
        sx={{
          bgcolor: 'background.paper',
          border: 1,
          borderColor: 'divider',
          borderRadius: 1,
          overflow: 'hidden',
          '&::before': { display: 'none' },
        }}
      >
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="footer-reference-content"
          id="footer-reference-header"
          // flexGrow:0 stops MUI from ballooning the title and shoving the chevron to the far
          // edge; justify-content keeps the title + chevron group pinned left as one tappable
          // unit. Hover darkens the row so the clickable region is obvious.
          sx={(theme) => ({
            px: 2,
            justifyContent: 'flex-start',
            transition: theme.transitions.create('background-color'),
            '&:hover': { bgcolor: 'action.hover' },
            '& .MuiAccordionSummary-content': { flexGrow: 0, mr: 0.5 },
          })}
        >
          <Typography variant="overline" color="text.primary">
            Status Key &amp; Sources
          </Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ px: 2, pt: 0, pb: 2 }}>
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
