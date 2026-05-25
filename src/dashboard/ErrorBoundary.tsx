// Last-resort guard: if any render below throws — a bad assumption in the view, NOT a fetch
// failure (those are handled in Dashboard with tailored copy) — show a styled fallback instead
// of React unmounting the tree to a blank white page. A render crash won't be cured by a
// refetch, so the recovery action is a full reload. Lives inside ThemeProvider (see main.tsx)
// so MUI styling resolves. It is a class component because only the class lifecycles
// (getDerivedStateFromError / componentDidCatch) can catch render errors — there is no hook
// equivalent.

import { Component, type ErrorInfo, type ReactNode } from 'react';
import Container from '@mui/material/Container';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Button from '@mui/material/Button';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Surface it for debugging; a production app would forward this to an error tracker.
    console.error('Dashboard crashed:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <Container sx={{ py: { xs: 2, md: 4 } }}>
          <Alert
            severity="error"
            action={
              <Button color="inherit" size="small" onClick={() => window.location.reload()}>
                Reload
              </Button>
            }
          >
            <AlertTitle>Something went wrong</AlertTitle>
            The dashboard hit an unexpected error and couldn't render. Reload to try again.
            {/* The raw message helps while developing; never shown in a production build. */}
            {import.meta.env.DEV && (
              <pre style={{ whiteSpace: 'pre-wrap', margin: '8px 0 0' }}>{this.state.error.message}</pre>
            )}
          </Alert>
        </Container>
      );
    }
    return this.props.children;
  }
}
