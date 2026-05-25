// Entry point for the standalone /responses page (a second Vite multi-page build target,
// see vite.config.ts). It only needs the MUI theme — no Redux store, since the page renders
// static markdown rather than live forecast data.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider } from '../theme/ThemeProvider'
import { ResponsesPage } from './ResponsesPage'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <ResponsesPage />
    </ThemeProvider>
  </StrictMode>,
)
