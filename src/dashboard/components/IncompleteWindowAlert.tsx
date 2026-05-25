// The fail-safe warning when a named window can't be fully evaluated (missing hours/readings) —
// surfaced as a no-go, not silently cleared. Shared by the pinned card and the pin dialog.

import Alert from '@mui/material/Alert';

export function IncompleteWindowAlert() {
  return (
    <Alert severity="warning" variant="outlined">
      Some hours in this window are missing readings, so it can't clear — shown as no-go.
    </Alert>
  );
}
