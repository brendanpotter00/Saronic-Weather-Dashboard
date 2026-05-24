# UI Architecture — what's built, what's deferred, where it extends

The hand-off doc for the dashboard UI. Read this before adding a UI feature so you plug into
the existing seams instead of reworking the layout. Pair it with `docs/UI-Style-Guide.md` (the
design system / tokens) and `CLAUDE.md` (the *why* and the review bar).

## What the UI is

A one-page, mobile-responsive dashboard built with **MUI** on top of the already-complete data
(`src/forecast/`) and scoring (`src/scoring/`) layers. It is **pure presentation**: it maps the
domain `Status` (`go` / `caution` / `no-go`) to colour and renders values the data layer already
shaped. No thresholds, unit math, timestamp math, or window-scanning happen in components.

Layout is **top-down**: context → overview → detail.

1. **Header** — title (named after the site) and the constant demo-window rule.
2. **Pinned-window slot** — reserved, renders nothing today (see seams below).
3. **Horizon line** — the centerpiece: a row of color-coded day "cards", each a contiguous line
   of that day's daylight hours coloured by hour status. This is how Tara picks a day.
4. **Day detail** — opens **inline below the line** for the selected day: the day's badge as a
   big word, the two-windows summary, and every daylight hour with its four factor readings.
5. **Footer** — the status legend/key and data-source attribution (resolved forecast + marine
   grid cells).

## Data flow

```
useGetCombinedForecastQuery()         RTK Query, 10-min in-memory cache  (src/forecast/forecastApi.ts)
        │  → CombinedForecast
        ▼
useScoredForecast()                   useMemo(scoreForecast)             (src/dashboard/hooks/useScoredForecast.ts)
        │  → ScoredForecast { site, marineSite, timezone, marineAvailable, days: ScoredDay[] }
        ▼
<Dashboard>                           owns selectedDate: string | null   (src/dashboard/Dashboard.tsx)
        ├─ <DashboardHeader>  (title + demo-window rule)
        ├─ <PinnedWindowSlot> (renders null)
        ├─ marine-unavailable <Alert> (when !marineAvailable)
        ├─ <HorizonStrip>     → <DayColumn> → <HourLine>      (click → setSelectedDate)
        ├─ <DayDetail>        → <WindowSummary> + <HourRow> → <FactorCell>
        └─ <DashboardFooter>  → <StatusLegend> + <Attribution>
```

- **Scoring is run once, memoised on the query `data` reference.** Expand/collapse never re-scores.
- **Selected day is local `useState`**, keyed by the stable `date` string (not an array index),
  defaulting to day 0 (today). It is *not* in Redux — it's ephemeral view state with one owner.

## Component map (`src/dashboard/`, organized by kind: shell + `format.ts` at root, `hooks/`, `components/`)

| File | Responsibility |
| --- | --- |
| `Dashboard.tsx` | Page shell + layout; owns `selectedDate`; loading (Skeleton) / error (Alert) / empty states. |
| `hooks/useScoredForecast.ts` | Query → memoised `scoreForecast`; the single data entry point. |
| `format.ts` | The **only** UI-side display formatting (units, "none", "—", clock/day labels). |
| `components/StatusBadge.tsx` | The go/caution/no-go pill used in the legend (label + colour from the status map). |
| `components/DashboardHeader.tsx` | Title (site-named) + the constant demo-window rule. |
| `components/DashboardFooter.tsx` | Footer container; lays out `StatusLegend` + `Attribution` (side-by-side on desktop, stacked on phones). |
| `components/Attribution.tsx` | Source (Open-Meteo) + location + resolved forecast/marine grid cells. |
| `components/StatusLegend.tsx` | The key; band numbers interpolated from the threshold constants. |
| `components/PinnedWindowSlot.tsx` | Reserved empty slot for the deferred pin-to-top feature. |
| `components/HorizonStrip.tsx` | The 10-day line container (horizontal scroll on phones). |
| `components/DayColumn.tsx` | One tappable day: weekday/date (date tinted by badge) + `HourLine`. |
| `components/HourLine.tsx` | One segment per daylight hour, coloured by hour status. |
| `components/DayDetail.tsx` | Inline drill-down for the selected day. |
| `components/WindowSummary.tsx` | The "possible daylight window" vs "demo window" distinction. |
| `components/HourRow.tsx` | One hour row (shares `HOUR_GRID` with the detail header). |
| `components/FactorCell.tsx` | One factor's formatted, status-tinted value. |

Theme/tokens live in `src/theme/` — see `docs/UI-Style-Guide.md`.

## Key product decisions baked into the UI

- **The line is the glance.** A run of green hours is a visible contiguous in-bounds window, so
  Tara sees "which hours look good" by eye.
- **We never name/recommend a specific window.** Choosing the window is the human's call
  (explicitly out of scope, and `scoring.ts` deliberately computes the *best achievable* window
  tier without naming its hours). The UI shows all daylight hours coloured + the day badge; it
  does **not** highlight a chosen 6-hour block. Keep it that way unless scope changes.
- **Two windows, stated explicitly** (`WindowSummary`): the *possible* window is daylight
  (sunrise→sunset); the *demo* window is the contiguous in-bounds run a demo needs
  (`DEMO_WINDOW_HOURS`, echoed onto each `ScoredDay` as `demoWindowHours`).
- **Fail-safe surfaces, not silence.** `marineAvailable === false` shows a banner; an incomplete
  day shows a warning in its detail. The data layer went to trouble to flag these — don't hide them.

## One cross-layer change this work made

`ScoredDay` was extended (in `src/scoring/scoring.ts`) to pass through `sunriseTime`,
`sunsetTime`, `daylightDurationSeconds`, and to echo `demoWindowHours = DEMO_WINDOW_HOURS`. This
keeps the daylight-window math out of the UI (the "shape data at the lowest level" rule) — the
detail renders the span instead of computing it from raw hours.

## In scope (built)

- Light MUI theme + centralized style tokens.
- 10-day horizon line; click-to-open inline day detail with the hourly breakdown.
- Status legend/key; source + location attribution with resolved grid cells.
- Marine-unavailable and incomplete-day states.
- Mobile-responsive layout.

## Out of scope (deferred) — and the seam each plugs into

These are intentionally **not built**, but the structure is ready so each is additive:

1. **Configurable demo-window length.** `DEMO_WINDOW_HOURS` (`src/config/app.ts`) is already a
   named constant echoed onto `ScoredDay.demoWindowHours`, so the UI renders it as data today.
   *Seam:* make `scoreForecast(forecast, { demoWindowHours })` take it as an argument and have
   `useScoredForecast(demoWindowHours)` pass it from config/state. Components don't change.

2. **Pin a chosen window to the top.** `PinnedWindowSlot` already sits at the top of the layout
   and `Dashboard` already owns the day selection. *Seam:* add `pinnedWindow` state in
   `Dashboard`, render its content into `PinnedWindowSlot`. No layout shift.

3. **Multiple cities (dropdown + per-city thresholds).** `SITES` is already a list and `Site`
   documents that timezone/thresholds belong on it. *Seam:* a `CitySelect` in `DashboardHeader`
   writing a `selectedSiteId` (small Redux slice); `forecastApi` endpoint arg goes `void → Site`;
   per-city thresholds become a `thresholdsForSite(site)` lookup in the scoring layer.
   `Attribution` already renders resolved coords, so it generalizes for free.

4. **Slide-out config sidebar.** *Seam:* a single MUI `<Drawer>` toggled from `DashboardHeader`,
   hosting the demo-window-length input and city/threshold controls. Purely additive — `Dashboard`
   is the layout owner and config flows through `useScoredForecast` args.

**The unifying seam:** every deferred item is "more inputs into `useScoredForecast` /
`scoreForecast`" plus "more chrome in `DashboardHeader`." Keep scoring parameterizable and the
header as the control surface, and the components below stay dumb and unchanged.
