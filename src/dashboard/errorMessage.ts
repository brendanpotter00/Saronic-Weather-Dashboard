// kind → user-facing copy: errorKind.ts reduces a failure to a finite kind, and this says it in
// words the operator can act on. Every kind offers a Retry; the detail says whether it's likely to help.

import type { ForecastErrorKind } from '../forecast/errorKind';

export interface ErrorCopy {
  readonly title: string;
  readonly detail: string;
}

export const FORECAST_ERROR_COPY: Record<ForecastErrorKind, ErrorCopy> = {
  offline: {
    title: "Can't reach the weather service",
    detail: 'You appear to be offline. Check your connection, then retry.',
  },
  rateLimited: {
    title: 'Too many requests',
    detail: "The free weather tier is rate-limited and we've hit the cap. Wait a minute, then retry.",
  },
  server: {
    title: 'The weather service is having trouble',
    detail: 'Open-Meteo returned a server error. This is usually temporary — retry in a moment.',
  },
  badData: {
    title: "Couldn't read the forecast",
    detail: 'The forecast came back in an unexpected format. Retry, or hard-reload to refetch.',
  },
  unknown: {
    title: "Couldn't load the forecast",
    detail: 'Something went wrong. Check the connection and retry — a hard reload refetches.',
  },
};
