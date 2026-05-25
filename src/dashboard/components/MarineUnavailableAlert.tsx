// The fail-safe banner shown when the marine (wave) feed is down: without wave heights a window
// can't be cleared, so every hour is treated as no-go until the data returns. Its own component so
// the domain wording has a single owner (mirrors IncompleteWindowAlert) rather than living inline.

import Alert from '@mui/material/Alert';

export function MarineUnavailableAlert() {
  return (
    <Alert severity="warning">
      Marine (wave) data is unavailable — every hour is treated as no-go until it returns.
    </Alert>
  );
}
