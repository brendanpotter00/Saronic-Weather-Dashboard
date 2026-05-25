// Renders RESPONSES.md — the two written challenge answers — as a themed, readable page.
// The markdown is the single source of truth: it's imported raw at build time and parsed to
// HTML, so editing RESPONSES.md updates this page with no code change.
import { marked } from 'marked'
import Container from '@mui/material/Container'
import Box from '@mui/material/Box'
import Link from '@mui/material/Link'
import Typography from '@mui/material/Typography'
import responsesMarkdown from '../../RESPONSES.md?raw'

// Parsed once at module load. The source is a trusted file bundled at build time (not user
// input), so rendering it via dangerouslySetInnerHTML carries no injection risk.
const responsesHtml = marked.parse(responsesMarkdown, { async: false })

export function ResponsesPage() {
  return (
    <Container maxWidth="md" sx={{ py: { xs: 4, sm: 6 } }}>
      <Box component="header" sx={{ mb: 4 }}>
        <Typography variant="overline" color="text.secondary" component="p">
          Saronic Weather Dashboard
        </Typography>
        <Typography variant="h1" sx={{ mt: 0.5, mb: 1.5 }}>
          Final questions &amp; responses
        </Typography>
        <Link href="/" underline="hover" sx={{ fontWeight: 600 }}>
          ← Back to dashboard
        </Link>
      </Box>

      <Box
        component="article"
        dangerouslySetInnerHTML={{ __html: responsesHtml }}
        sx={(theme) => ({
          color: 'text.primary',
          // The .md leads with the two questions as an ordered list; counter-reset keeps
          // numbering correct and the headings/spacing pull from theme tokens, not literals.
          '& h1': { ...theme.typography.h1, mt: 5, mb: 2 },
          '& h2': { ...theme.typography.h2, mt: 4, mb: 1.5 },
          '& h3': { ...theme.typography.h3, mt: 3, mb: 1 },
          '& p': { ...theme.typography.body1, my: 2, lineHeight: 1.7 },
          '& ol, & ul': { my: 2, pl: 3 },
          '& li': { ...theme.typography.body1, my: 1, lineHeight: 1.7 },
          '& li::marker': { color: 'text.secondary', fontWeight: 700 },
          '& strong': { fontWeight: 700 },
          '& a': { color: 'text.primary', fontWeight: 600 },
          '& code': {
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            fontSize: '0.9em',
            bgcolor: 'background.default',
            border: 1,
            borderColor: 'divider',
            borderRadius: 1,
            px: 0.75,
            py: 0.25,
          },
          '& pre': {
            bgcolor: 'background.default',
            border: 1,
            borderColor: 'divider',
            borderRadius: 1,
            p: 2,
            overflowX: 'auto',
          },
          '& pre code': { border: 0, p: 0, bgcolor: 'transparent' },
          '& blockquote': {
            my: 2,
            ml: 0,
            pl: 2,
            borderLeft: 4,
            borderColor: 'divider',
            color: 'text.secondary',
          },
          '& table': { borderCollapse: 'collapse', my: 2, width: '100%' },
          '& th, & td': { border: 1, borderColor: 'divider', px: 1.5, py: 1, textAlign: 'left' },
          '& hr': { border: 0, borderTop: 1, borderColor: 'divider', my: 4 },
        })}
      />
    </Container>
  )
}
