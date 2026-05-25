// The fail-safe warning shown when a named demo window can't be fully evaluated — some hours or
// readings are missing, so it can't clear and is surfaced as a no-go rather than silently treated
// as clear. Shared verbatim by the pinned card and the pin-confirm dialog so the wording can't
// drift between them. (The day detail carries a sibling, day-level message of its own.)

import Alert from '@mui/material/Alert';

export function IncompleteWindowAlert() {
  return (
    <Alert severity="warning" variant="outlined">
      Some hours in this window are missing readings, so it can't clear — shown as no-go.
    </Alert>
  );
}
