// Reserved layout seam for the (out-of-scope) "pin a chosen demo window to the top" feature.
// It renders nothing today, but it exists and is placed at the top of the dashboard flow so
// adding the feature later is "fill this slot" rather than "re-lay-out the page". When built,
// Dashboard already owns the selected day/window state to feed it (see Dashboard.tsx).

export function PinnedWindowSlot() {
  return null;
}
