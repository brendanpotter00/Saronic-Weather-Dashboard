// The single global style source of truth. Every spacing value, font size, radius, and
// component default lives here so the rest of the UI pulls tokens instead of hardcoding —
// other agents reach for `theme.spacing(n)`, `variant="h2"`, `color="success"` and never
// invent a magic px or hex. The palette is the brief's "black & white + status colours":
// a light, near-monochrome base with the go/caution/no-go intents carried by MUI's
// success/warning/error (see statusColor.ts for the domain→palette mapping).

import { createTheme } from '@mui/material/styles';

// --- Brand tokens (named so the values aren't magic where they're consumed) ---
const INK = '#0a0a0a'; // near-black primary text/ink
const INK_SECONDARY = '#5c5c5c'; // muted grey for secondary text
const PAPER = '#ffffff'; // white surface
const CANVAS = '#fafafa'; // page background — a hair off-white so white cards read as cards
const HAIRLINE = '#e0e0e0'; // 1px dividers / outlined-card borders

// Status intents, tuned to read on white. These ARE go/caution/no-go (statusColor.ts maps to them).
const GO = '#2e7d32'; // green
const CAUTION = '#ed6c02'; // amber
const NO_GO = '#c62828'; // red

export const theme = createTheme({
  palette: {
    mode: 'light',
    background: { default: CANVAS, paper: PAPER },
    text: { primary: INK, secondary: INK_SECONDARY },
    divider: HAIRLINE,
    // Monochrome primary: black & white base, so the only saturated colour in the UI is status.
    primary: { main: INK, contrastText: PAPER },
    success: { main: GO },
    warning: { main: CAUTION },
    error: { main: NO_GO },
  },

  shape: { borderRadius: 8 },

  // MUI's 8px spacing unit is the grid; everything pads/margins in multiples of it.
  spacing: 8,

  typography: {
    // System stack — no webfont to load, keeps the < 1s load budget.
    fontFamily:
      '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    h1: { fontSize: '1.9rem', fontWeight: 800, letterSpacing: '-0.01em' },
    h2: { fontSize: '1.35rem', fontWeight: 700, letterSpacing: '-0.01em' },
    h3: { fontSize: '1.05rem', fontWeight: 700 },
    // Tiny uppercase eyebrow used for section labels and factor names.
    overline: { fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.14em', lineHeight: 1.6 },
    button: { textTransform: 'none', fontWeight: 600 },
  },

  components: {
    MuiContainer: { defaultProps: { maxWidth: 'lg' } },
    // Outlined, flat cards keep the monochrome look — colour comes from status, not shadows.
    MuiCard: { defaultProps: { variant: 'outlined' }, styleOverrides: { root: { borderColor: HAIRLINE } } },
    MuiButton: { defaultProps: { variant: 'outlined', disableElevation: true } },
    MuiChip: { defaultProps: { size: 'small' }, styleOverrides: { label: { fontWeight: 700 } } },
  },
});
