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
- **Cache responses ~10 minutes** so repeated morning checks don't re-hit the rate-limited
  free tier.

→ Full contract, response shapes, and gotchas: **`docs/API-Endpoints.md`**.

## Tech stack

- **Now:** React 19 + TypeScript + Vite.
- **Planned (not yet installed):** MUI (accessible component set that also covers mobile
  responsiveness), Redux Toolkit (global state), RTK Query (data fetching with a TTL cache
  for the 10-min caching requirement).
  Treat these as the intended direction — check `package.json` before assuming they're
  present.
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
- Cache data ~10 min for fast subsequent loads.

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

## Transcript logging

Run **`/log-transcript`** to snapshot the current working session into
`docs/transcript-logs/` (titled with a summary, led by a one-paragraph summary, then the
text-only transcript). Do this after meaningful decisions — the logs are the raw material
for writing thorough, honest `RESPONSES.md` answers from real history instead of memory.

## Docs map

- `docs/Saronic-Weather-Dashboard-Instructions.md` — the original challenge brief.
- `docs/Notes.md` — clarifying-question answers, requirements, decisions, and rough plan.
- `docs/API-Endpoints.md` — authoritative Open-Meteo API contract (params, shapes, gotchas).
- `RESPONSES.md` — the two written responses (decisions walkthrough + how you'd evolve it).
- `docs/transcript-logs/` — saved working conversations (via `/log-transcript`).

## Deliverables reminder

- Working app + `RESPONSES.md` (two questions) in the repo root.
- README with setup instructions.
- Public GitHub repo.
- Email the repo link to **amy.parsons@saronic.com** and **Grant.Sullens@saronic.com**.
