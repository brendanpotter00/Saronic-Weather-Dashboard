# Saronic Weather Dashboard — Agent Brief

A one-page, 10-day **demo-weather go/no-go look-ahead** for Saronic's Gulfport, MS test
range. Built for Tara Okonkwo (Demo Scheduling Coordinator) to glance at each morning and
decide whether conditions support running an autonomous-vessel customer demo.

This file is the single source of truth for *why* the project exists and *how* to work in
it. The authoritative details live in `docs/` (see [Docs map](#docs-map)).

## Mission

- **Inform, don't decide.** Surface the weather in one place so Tara can make the call in
  ~10 seconds. The tool does *not* recommend or auto-pick windows — human judgement stays
  in the loop (explicitly out of scope).
- **One page.** The entire 10-day forecast is visible without page-hopping or hunting
  across three weather sites.
- **Optimize for the 10-second glance.** The headline question for each day is: *does this
  day have a valid ~6-hour daylight window where all conditions are within bounds?* If yes,
  it's a candidate and Tara can drill into the hourly detail.

## Who it's for

Tara checks this every morning before scheduling. Demos host Navy/DARPA evaluators who fly
in — canceling or greenlighting wrong is expensive and embarrassing. She currently googles
weather + texts the boat captain for sea-state gut-feel. We replace the googling with a
single trustworthy view.

## Tara's thresholds (go / iffy / no-go)

These drive the per-hour and per-day status. Inlined here so you don't have to open another
file; `docs/API-Endpoints.md` is the authoritative source.

| Factor | Variable (unit) | Good | Iffy | No-go |
| --- | --- | --- | --- | --- |
| Wind | `wind_speed_10m` (kn) | < 15 | 15–20 | > 20 |
| Wave | `wave_height` (ft) | < 2 | 2–4 | > 4 |
| Precipitation | `precipitation` (mm) | 0 (none) | — | any rain |
| Visibility | `visibility` (m → mi) | ≥ 10 mi | 3–10 mi | < 3 mi |

- **Rain is always a no-go** — any precipitation kills the hour (optics demos).
- **Visibility** comes from the API in **meters** but Tara thinks in **miles**. Convert with
  `1 mi = 1609.344 m` (≥10 mi ≈ 16,093 m, <3 mi ≈ 4,828 m) before comparing.
- A day is a **candidate** if it contains *any* valid in-bounds daylight window of demo
  length, even when the rest of the day is out of bounds.

**Status logic — worst factor wins.** Roll status up, not down:
`hour status = worst of its 4 factors` → `window status = worst hour in the contiguous
daylight window` → `day badge = best available window`. Rain or <3 mi visibility anywhere
in a window kills that window outright.

## Data layer

Two Open-Meteo APIs, no key/auth, joined by their hourly `time[]` arrays:

- **Forecast API** (`api.open-meteo.com/v1/forecast`) — wind, precipitation, visibility,
  `weather_code`, `is_day`, and daily `sunrise`/`sunset`.
- **Marine API** (`marine-api.open-meteo.com/v1/marine`) — `wave_height` (+ wind-wave/swell
  context).

Always send these params: `timezone=America/Chicago`, `wind_speed_unit=kn`,
`length_unit=imperial` (waves in ft), `forecast_days=10`. Site is `latitude=30.3674`,
`longitude=-89.0928`.

- **Daylight only.** Demos are daytime — drop hours where `is_day == 0` (or use
  `sunrise`/`sunset`) before evaluating a day.
- **Join by timestamp**, matching the ISO `time[]` string (don't assume equal array lengths).
- **Marine grid ≠ forecast grid** — the marine request snaps to the nearest ocean cell; both
  echo their resolved lat/lon. Expected, not a bug.
- **Cache responses ~10 minutes in-session** so repeated morning checks within a session
  don't re-hit the rate-limited free tier. RTK Query's cache is in-memory (TTL via
  `refetchOnMountOrArgChange` + `keepUnusedDataFor`); a hard page reload starts cold and
  refetches — acceptable for a single user well under the free-tier limit.

→ Full contract, response shapes, and gotchas: **`docs/API-Endpoints.md`**.

## Tech stack

- React 19 + TypeScript + Vite.
- **Redux Toolkit + RTK Query** — global state + data fetching with the TTL cache (data layer
  in `src/forecast/`).
- **MUI** — accessible component set that also covers mobile responsiveness + theming (UI in
  `src/dashboard/`, theme/tokens in `src/theme/`).
- All installed — check `package.json` for versions.
- **No backend, by design.** Open-Meteo needs no API key or auth, so a Node/server layer
  would be overkill (see `docs/Notes.md`). Pure client-side SPA.

## Requirements

Functional:
- View the entire 10-day forecast on one page.
- Visually categorize days and hours by status (go / iffy / no-go).
- Apply Tara's thresholds to give a quick per-day go/no-go read.
- Present it so a non-technical ops person understands it at a glance.
- Responsive mobile layout — readable and usable on a phone (MUI handles this).

Non-functional:
- A decision should be possible in ~10 seconds.
- Page should load in < 1s.
- Cache data ~10 min in-session (in-memory) for fast subsequent loads; a hard reload refetches.

## Scope boundaries (out of scope)

Do **not** build these without explicit direction:
- Multiple cities (Panama City / Norfolk / San Diego) — future: a city dropdown.
- Changing-weather alerts / window-status-change notifications.
- Configurable/varying thresholds or additional weather factors.
- Boat-captain approval status.
- Suggested or "best" window recommendations — explicitly declined ("I don't need it to
  make the decision for me").

## Conventions

```bash
npm install      # dependencies
npm run dev      # dev server (http://localhost:5173)
npm run build    # tsc -b && vite build
npm run preview  # preview production build
npm run lint     # eslint
```

- Source lives in `src/`; static assets in `public/`.
- **Decisions matter more than polish** (per the brief). Keep code clean, readable, and
  maintainable over clever; prefer thoughtful go/no-go logic over calling every endpoint.
- **UI:** MUI, built in `src/dashboard/`, organized by kind: the `Dashboard.tsx` page shell and
  `format.ts` (display formatting — kept descriptively named, not a `utils/` junk drawer) at the
  root, presentational components under `components/`, and hooks under `hooks/`. Theme/tokens live
  in `src/theme/`: pull style tokens from `src/theme/theme.ts` and status colours from
  `src/theme/statusColor.ts` — never hardcode px/hex or green/amber/red. See
  **`docs/UI-Style-Guide.md`** (design system) and **`docs/UI-Architecture.md`** (component map,
  scope, extension seams) before adding UI.

## Code & naming conventions (the review bar)

These are the standards code is held to here, distilled from review feedback. Run
**`/brendan-review`** to check a diff against them. Apply them as you write, not just after.
The two that carry the most weight are the first two below — **shape data at the lowest level
so the frontend stays dumb**, and **group code by what belongs together**; the rest support them.

- **Shape data at the lowest level you can; keep the frontend dumb. (core)** Push all
  normalization and derivation as far *down* the stack as the context allows, so every layer
  above just consumes. Lowest level doesn't always mean "at fetch time" — it means as low as
  the known context permits. Here we *know* the only consumer is the dashboard, so the data
  layer emits exactly what the UI renders (domain units, standardized timestamps, joined
  records) and components stay purely presentational — no conversion, no reshaping, no unit
  math. The lower you normalize, the less anything above has to know or repeat. (See
  `normalize.ts` + `combineForecasts.ts`; conversions are explicit and unit-tested.)
- **Group what belongs together; don't throw everything in one file. (core)** Cohesion first —
  a module holds one coherent concern: domain in `config/sites.ts`, provider specifics
  (URLs, request variables, unit flags) in `openMeteoConstants.ts`, conversions in
  `normalize.ts`, the join in `combineForecasts.ts`. Split by *reason-to-change*: a value can
  be *physically* an API parameter yet be *owned* by app config (`FORECAST_DAYS`,
  `CACHE_TTL_SECONDS` in `config/app.ts`) because the reason it changes is a product decision.
- **Names must describe their contents.** A file/variable name should tell you what's inside
  without opening it. `site.ts` holding API URLs *and* site coords was wrong — it split into
  `sites.ts` (domain) and `openMeteoConstants.ts` (provider). If you can't name it cleanly,
  the module is probably doing two things.
- **Don't stutter the folder, don't use junk-drawer names.** Inside `features/weather/`, it's
  `types.ts`, not `weatherTypes.ts`. Avoid `helpers`/`utils`/`misc` — name a file for what it
  does (`combineForecasts.ts`, `normalize.ts`).
- **Units live in the name, not in a comment.** `windSpeedKn`, `waveHeightFt`,
  `precipitationIn`, `visibilityMiles`, `daylightDurationSeconds`. A reader should know the
  unit from the console/data alone. Keep the *value* a real number — never bake units into a
  string (it breaks comparisons).
- **Descriptive field names.** Say what the value *is*: `sunriseTime`/`sunsetTime`, not
  `sunrise`/`sunset`.
- **One standardized timestamp format.** All datetime fields use full ISO 8601 with the
  site's UTC offset (e.g. `2026-05-23T06:00:00-05:00`) so the front end parses them
  unambiguously. A calendar-day key (`YYYY-MM-DD`) is the one intentional exception.
- **No magic strings/numbers.** Extract named constants (`WIND_SPEED_UNIT`, `METERS_PER_MILE`).
- **Verify against the live system; don't trust assumptions or even the docs.** Unit tests
  pass on the units you *assume*; only a real call catches a wrong assumption (e.g.
  `precipitation_unit=inch` silently flips the forecast API's visibility to feet). Smoke-test
  the real endpoints and read actual values before declaring done.
- **Push back when a request conflicts with best practice.** State the disagreement and the
  reason, propose the better option, then defer to the explicit decision. (Wind is a *speed*
  in knots, not "inches"; a `helpers.ts` becomes a dumping ground.)

## Transcript logging

Run **`/log-transcript`** to snapshot the current working session into
`docs/transcript-logs/` (titled with a summary, led by a one-paragraph summary, then the
text-only transcript). Do this after meaningful decisions — the logs are the raw material
for writing thorough, honest `RESPONSES.md` answers from real history instead of memory.

## Docs map

- `docs/Saronic-Weather-Dashboard-Instructions.md` — the original challenge brief.
- `docs/Notes.md` — clarifying-question answers, requirements, decisions, and rough plan.
- `docs/API-Endpoints.md` — authoritative Open-Meteo API contract (params, shapes, gotchas).
- `docs/UI-Architecture.md` — UI component map, data flow, in/out scope, and extension seams.
- `docs/UI-Style-Guide.md` — the design system: theme tokens, status-colour map, MUI usage.
- `RESPONSES.md` — the two written responses (decisions walkthrough + how you'd evolve it).
- `docs/transcript-logs/` — saved working conversations (via `/log-transcript`).
