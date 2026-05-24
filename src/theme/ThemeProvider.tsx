// Mounts the app's MUI theme + a CSS reset. Sits inside the Redux <Provider> (see main.tsx)
// and wraps the whole app so every component resolves the same tokens from `theme.ts`.

import type { ReactNode } from 'react';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { theme } from './theme';

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <MuiThemeProvider theme={theme}>
      {/* Normalises browser defaults and applies palette.background to <body>. */}
      <CssBaseline />
      {children}
    </MuiThemeProvider>
  );
}
