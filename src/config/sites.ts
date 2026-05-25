// Provider-agnostic domain config: the demo site(s), modeled as a list so adding sites later is a
// data change, not a rewrite.

export interface Site {
  id: string;
  rangeName: string; // the test range's name, for the page title
  label: string; // the geographic place, shown with the resolved coordinates
  latitude: number;
  longitude: number;
  // timezone lives in openMeteoConstants.ts as a request-level constant while there's one site.
}

export const SITES: Site[] = [
  { id: 'gulfport', rangeName: 'Gulf Test Range', label: 'Gulfport, MS', latitude: 30.3674, longitude: -89.0928 },
];

export const DEFAULT_SITE = SITES[0];
