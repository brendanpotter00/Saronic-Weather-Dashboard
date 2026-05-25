// The fail-safe banner when the marine (wave) feed is down: without wave heights every hour is
// treated as no-go until the data returns.

import Alert from '@mui/material/Alert';

export function MarineUnavailableAlert() {
  return (
    <Alert severity="warning">
      Marine (wave) data is unavailable — every hour is treated as no-go until it returns.
    </Alert>
  );
}
