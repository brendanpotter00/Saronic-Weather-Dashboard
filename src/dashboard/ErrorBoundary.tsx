// Last-resort guard for a render crash (fetch failures are handled in Dashboard): shows a styled
// fallback instead of a blank page. Recovery is a full reload, since a refetch won't cure a render
// crash. A class component because only its lifecycles can catch render errors — no hook equivalent.

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
            {/* DEV-only: the raw message helps while developing. */}
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
