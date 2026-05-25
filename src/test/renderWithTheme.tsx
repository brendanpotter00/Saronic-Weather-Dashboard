// Render a component inside the app's MUI theme so status colours and tokens resolve exactly as
// they do in the app. Mirrors how App.test.tsx wraps the whole app; used by the component tests
// that render a single piece in isolation.

import type { ReactElement } from 'react';
import { render } from '@testing-library/react';
import { ThemeProvider } from '../theme/ThemeProvider';

export function renderWithTheme(ui: ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}
