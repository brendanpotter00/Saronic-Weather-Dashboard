// Provider-agnostic domain config: the demo site(s). These survive any change
// to the weather data provider. Multi-city is out of scope, but the sites are
// modeled as a list so adding Panama City / Norfolk / San Diego later is a data
// change, not a rewrite.

export interface Site {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
  // NOTE: for multi-city, timezone belongs here (Gulfport is America/Chicago,
  // San Diego is America/Los_Angeles, ...). It's a request-level constant for
  // now while we have a single site — see openMeteoConstants.ts.
}

export const SITES: Site[] = [
  { id: 'gulfport', label: 'Gulfport, MS', latitude: 30.3674, longitude: -89.0928 },
];

export const DEFAULT_SITE = SITES[0];
