# Saronic Weather Dashboard

A one-page, 10-day **demo weather go/no-go look-ahead** for Saronic's Gulfport, MS test
range. Built for a Demo Scheduling Coordinator to glance at each morning and decide whether
conditions support running an autonomous-vessel customer demo — without hopping across three
weather sites.

**Live demo:** https://saronic-weather-dashboard.vercel.app/

## What it does

- Pulls a 10-day forecast for the Gulfport site from two free **Open-Meteo** APIs
  (forecast + marine) — no API key.
- Scores every **daylight** hour against the coordinator's thresholds and rolls the
  worst factor up to an hour → window → day **go / caution / no-go** read.
- Shows the whole horizon as a row of color-coded day lines; click a day for the hourly
  breakdown, and pin a chosen demo window to the top.
- Optimized for a ~10-second glance: *does this day have a valid daylight window where all
  conditions are in bounds?*

| Factor | Good | Iffy | No-go |
| --- | --- | --- | --- |
| Wind (kn) | < 15 | 15–20 | > 20 |
| Wave (ft) | < 2 | 2–4 | > 4 |
| Precipitation | none | — | any rain |
| Visibility (mi) | ≥ 6 | 3–6 | < 3 |

See **`CLAUDE.md`** for the full mission, scope boundaries, and the review bar.

## Tech stack

- **React 19** + **TypeScript** + **Vite**
- **MUI** (component set, theming, mobile responsiveness)
- **Redux Toolkit + RTK Query** (global state + cached data fetching, 10-min in-memory TTL)
- **Vitest** + **Testing Library** (unit tests, 90% coverage gate)

No backend by design — Open-Meteo needs no key/auth, so the app is a pure client-side SPA.

## Getting started

Requires **Node 22** (see `.nvmrc`) and npm.

```bash
npm install         # install dependencies
npm run dev         # start the dev server (http://localhost:5173)
npm run build       # type-check (tsc -b) and build for production
npm run preview     # preview the production build locally
npm run lint        # run ESLint
npm run test        # run the unit tests once
npm run test:watch  # run tests in watch mode
npm run test:coverage  # run tests with the 90% coverage gate
```

## Project structure

```
src/
  app/         Redux store + typed hooks
  config/      Domain config (site coords) + app config (forecast days, cache TTL)
  forecast/    Open-Meteo data layer: fetch, normalize, join (RTK Query)
  scoring/     Thresholds → per-hour/window/day status; window + pin math
  dashboard/   MUI UI: page shell, sections, components, hooks, display formatting
  theme/       MUI theme + style/status-color tokens
docs/          Challenge brief, API contract, UI architecture & style guide, notes
RESPONSES.md   Written challenge responses
```

The guiding convention: **data is shaped at the lowest level so the UI stays dumb** —
the data + scoring layers emit exactly what components render (domain units, ISO
timestamps, joined records). Details in `docs/UI-Architecture.md` and `CLAUDE.md`.

## Testing & deployment

- **Tests:** Vitest + Testing Library across the data, scoring, and UI layers.
- **CI:** GitHub Actions runs lint → build → tests behind a **90% coverage gate**
  (`.github/workflows`).
- **Deploy:** on a green `main`, CI deploys to **Vercel** (production); PRs get preview
  deploys. Deploy is skipped cleanly until the Vercel secrets are configured.

## Docs

- `docs/Saronic-Weather-Dashboard-Instructions.md` — the original challenge brief.
- `docs/Notes.md` — clarifying-question answers, requirements, decisions, rough plan.
- `docs/API-Endpoints.md` — authoritative Open-Meteo API contract (params, shapes, gotchas).
- `docs/UI-Architecture.md` — UI component map, data flow, scope, extension seams.
- `docs/UI-Style-Guide.md` — the design system: theme tokens, status-color map, MUI usage.
- `CLAUDE.md` — why the project exists and how to work in it (the single source of truth).

## Written responses

The challenge's two written responses live in **`RESPONSES.md`**.
