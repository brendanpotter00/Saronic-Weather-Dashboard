# UI Architecture — what's built, what's deferred, where it extends

The hand-off doc for the dashboard UI. Read this before adding a UI feature so you plug into
the existing seams instead of reworking the layout. Pair it with `docs/UI-Style-Guide.md` (the
design system / tokens) and `CLAUDE.md` (the *why* and the review bar).

## What the UI is

A one-page, mobile-responsive dashboard built with **MUI** on top of the already-complete data
(`src/forecast/`) and scoring (`src/scoring/`) layers. It is **pure presentation**: it maps the
domain `Status` (`go` / `caution` / `no-go`) to colour, renders values the data layer already
shaped, and dims the hours scoring flagged out-of-window. No thresholds, unit math, timestamp
math, or window-scanning happen in components — the one piece of view state that feeds scoring is
the dashboard-wide window config (available window + demo length), passed back into the scoring
pass via `useScoredForecast`.

Layout is **top-down**: context → config → overview → detail.

1. **Header** — title only (named after the site).
2. **Pinned windows** — the demo windows Tara has pinned, one card each, stacked in pin order;
   empty (no cards, no layout gap) until she pins one.
3. **Window controls** — the dashboard-wide config bar: the **available window** (the clock-hour
   band a demo may run in) and the **demo length**, plus the exact daylight envelope and a live
   "N of 10 days have a valid window" count. Set once at the top; applies to every day.
4. **Horizon line** — the centerpiece: a row of color-coded day "cards", each a contiguous line
   of that day's daylight hours coloured by hour status, with out-of-window hours dimmed. This is
   how Tara picks a day.
5. **Day detail** — opens **inline below the line** for the selected day: the day's badge as a
   big word, a plain-language summary, then every daylight hour with its four factor readings
   (out-of-window rows dimmed).
6. **Footer** — the status legend/key and data-source attribution (resolved forecast + marine
   grid cells).

## Data flow

```
useGetCombinedForecastQuery()         RTK Query, 10-min in-memory cache  (src/forecast/forecastApi.ts)
        │  → CombinedForecast
        ▼
useScoredForecast(windowConfig?)      useMemo(scoreForecast(data, opts)) (src/dashboard/hooks/useScoredForecast.ts)
        │  → ScoredForecast { site, marineSite, timezone, marineAvailable,
        │       demoWindowHours, availableWindow, daylightBounds, daylightEnvelope, days: ScoredDay[] }
        ▼
<Dashboard>          owns selectedDate + windowConfig + pinnedWindows + dialogWindow  (src/dashboard/Dashboard.tsx)
        ├─ <DashboardHeader>  (title only)
        ├─ pinnedWindows.map → <PinnedWindowSlot> (one card per pinned window — scoreNamedWindow re-scores each render)
        ├─ <WindowControls>   (available window + demo length → setWindowConfig)
        ├─ marine-unavailable <Alert> (when !marineAvailable)
        ├─ <HorizonStrip>     → <DayColumn> → <HourLine>   (click → setSelectedDate; out-of-window hours dimmed)
        ├─ <DayDetail>        → <HourRow> → <FactorCell>   (hover/focus previews a centered window; click → onRequestPin)
        ├─ <DashboardFooter>  → <StatusLegend> + <Attribution>
        └─ <PinConfirmDialog> (a pending pin; Pin → addPinnedWindow, freezing the demo length) → <WindowFactorGrid>
```

- **Scoring is memoised on the query `data` reference and the window knobs.** Expand/collapse and
  unrelated renders never re-score; only a refetch or a real window/demo-length change does.
- **Selected day and window config are local `useState`**, owned in `Dashboard` (not Redux — both
  are ephemeral view state with one owner). `selectedDate` is the stable `date` string (defaults
  to day 0, today); `windowConfig` is `null` until Tara edits, so scoring falls back to the
  product defaults and *echoes* them back, and `WindowControls` seeds itself from those echoes.

## Component map (`src/dashboard/`, organized by kind: shell + `format.ts` at root, `hooks/`, `components/`)

| File | Responsibility |
| --- | --- |
| `Dashboard.tsx` | Page shell + layout; owns `selectedDate` and `windowConfig`; loading (Skeleton) / error (Alert) / empty states. |
| `hooks/useScoredForecast.ts` | Query → memoised `scoreForecast(data, windowConfig)`; the single data entry point. |
| `format.ts` | The **only** UI-side display formatting (units, "none", "—", clock/day/hour labels: `formatHourLabel`, `formatClockTime`, `formatHourOfDay`). |
| `components/StatusBadge.tsx` | The go/caution/no-go pill used in the legend (label + colour from the status map). |
| `components/DashboardHeader.tsx` | Title (site-named) only. |
| `components/WindowControls.tsx` | The dashboard-wide config bar: available-window + demo-length pickers (clamped to `daylightBounds`), the exact daylight envelope line, and the live candidate count. Reports edits up via `onChange`; holds no state. |
| `components/DashboardFooter.tsx` | Footer container; lays out `StatusLegend` + `Attribution` (side-by-side on desktop, stacked on phones). |
| `components/Attribution.tsx` | Source (Open-Meteo) + location + resolved forecast/marine grid cells. |
| `components/StatusLegend.tsx` | The key; band numbers interpolated from the threshold constants. |
| `components/PinnedWindowSlot.tsx` | One pinned demo window's card (status strip + word, range, worst-in-window factors, Unpin); `Dashboard` renders one per pinned window. Renders null if its day has rolled off the horizon. |
| `pinnedWindows.ts` | The pinned-windows collection: the `PinnedWindow`/`WindowSelection` types and the pure `addPinnedWindow` (dedupe-by-content, pin-order append) / `removePinnedWindow` / `pinnedWindowKey` ops, kept out of the component so the list logic is unit-testable. |
| `components/PinConfirmDialog.tsx` | The commit step: shows the previewed window + rolled-up status + worst-in-window readings; Pin/Cancel. Click/tap → confirm (degrades to touch). |
| `components/WindowFactorGrid.tsx` | The four worst-in-window readings as labelled, status-tinted cells; shared by the dialog and the pinned card so they can't drift. |
| `components/HorizonStrip.tsx` | The 10-day line container (horizontal scroll on phones). |
| `components/DayColumn.tsx` | One tappable day: weekday/date (date tinted by badge) + `HourLine`. |
| `components/HourLine.tsx` | One segment per daylight hour, coloured by hour status; out-of-window hours dimmed (reads `hour.isInWindow`). |
| `components/DayDetail.tsx` | Inline drill-down for the selected day: badge word + summary line + the hourly table. Owns `hoverStart` and the pin-selection wiring; a click bubbles `onRequestPin(date, startHour)` up to the dashboard. |
| `components/HourRow.tsx` | One hour row (shares `HOUR_GRID` with the detail header); dimmed when out-of-window. The pin-selection surface: hover/focus previews a centered window (tinted by its status, bracketed on first/last rows), click/tap/Enter commits. |
| `components/FactorCell.tsx` | One factor's formatted, status-tinted value. |

Theme/tokens live in `src/theme/` — see `docs/UI-Style-Guide.md`.

## Key product decisions baked into the UI

- **The line is the glance.** A run of green hours is a visible contiguous in-bounds window, so
  Tara sees "which hours look good" by eye. Hours outside the available window are dimmed, so the
  band she set reads against the rest of the day.
- **We never name/recommend a specific demo block.** Choosing the exact hours is the human's call
  (out of scope, and `scoring.ts` computes the *best achievable* tier without naming its hours).
  The UI dims the *available window* (a band Tara sets) but never highlights a chosen demo-length
  block inside it. Keep it that way unless scope changes.
- **Config lives at the top, applied dashboard-wide.** `WindowControls` owns the *available window*
  (the clock-hour band, defaulting to the actual daylight **hours** the forecast covers, so the
  picker never offers an hour with no reading) and the *demo length* (`DEMO_WINDOW_HOURS` default,
  adjustable down to `DEMO_MIN_HOURS`). Both feed the scoring pass, so the horizon + badges
  re-score live. The day detail no longer repeats them — it shows the badge and the hours.
- **Fail-safe surfaces, not silence.** `marineAvailable === false` shows a banner; an incomplete
  day shows a warning in its detail. The data layer went to trouble to flag these — don't hide them.

## Cross-layer changes this work made

The window/demo-length feature pushed all its math down into the scoring layer (the "shape data at
the lowest level" rule), so components stay dumb:

- **New `src/scoring/window.ts`** — owns the `AvailableWindow` type, `isHourInWindow`,
  `daylightEnvelope` (precise earliest sunrise / latest sunset, for the control's context line),
  and `defaultAvailableWindow` (the default = the actual daylight **hours** present across the days,
  so it clips nothing real and the picker can't offer an empty hour).
- **`scoreForecast(forecast, options?)`** takes `{ demoWindowHours, availableWindow }` (both
  optional → product defaults). It clips the candidacy scan to the window, tags each `ScoredHour`
  with `isInWindow`, and echoes `demoWindowHours`, `availableWindow`, `daylightBounds`, and
  `daylightEnvelope` on `ScoredForecast` so the UI renders config as data.
- **`ScoredHour.isInWindow`** drives the dimming in `HourLine` / `HourRow`. The sun times the UI
  shows now ride on the per-forecast `daylightEnvelope` (earliest sunrise / latest sunset), so
  `ScoredDay` no longer echoes per-day `sunriseTime` / `sunsetTime` / `demoWindowHours` — those
  were only read by the now-deleted `WindowSummary`, so they were dropped as dead pass-through (the
  same cleanup `daylightDurationSeconds` got, which still stays on `DayForecast` for the day-level
  `complete` gate; nothing in the UI renders it).
- **`config/app.ts`** adds `DEMO_MIN_HOURS` / `DEMO_MAX_HOURS` bounds for the picker.

## In scope (built)

- Light MUI theme + centralized style tokens.
- **Dashboard-wide available-window + demo-length config** (top bar): clips the candidacy scan
  live and dims out-of-window hours across the line and the detail.
- 10-day horizon line; click-to-open inline day detail with the hourly breakdown.
- **Pin a chosen demo window to the top** (centered hover → confirm → card that re-scores each refetch).
- Status legend/key; source + location attribution with resolved grid cells.
- Marine-unavailable and incomplete-day states.
- Mobile-responsive layout.

## Out of scope (deferred) — and the seam each plugs into

These are intentionally **not built**, but the structure is ready so each is additive:

1. ~~**Configurable demo-window length.**~~ **Built.** `scoreForecast(forecast, { demoWindowHours,
   availableWindow })` takes both as arguments; `useScoredForecast(windowConfig)` passes them from
   `Dashboard` state, set via `WindowControls`. (See "Cross-layer changes" above.)

2. ~~**Pin a chosen window to the top.**~~ **Built.** The interaction is **centered hover** in the
   hourly table — point at the middle of a stretch, the fixed-length block centers + tints by
   status, click/tap → `PinConfirmDialog` → pin. `Dashboard` owns `pinnedWindows`
   (`PinnedWindow[]`, each `{ date, startHour, lengthHours }`) and `dialogWindow` (`{ date, startHour }`)
   and re-derives every score from the live forecast each render, so the pinned cards firm up on every
   refetch with no card-level logic. **Multiple** windows can be pinned — each confirm appends a card
   (pin order), a window's content is its identity (`pinnedWindowKey`) so re-pinning an identical one
   is a no-op and each card's Unpin targets only itself, and the collection ops live in
   `src/dashboard/pinnedWindows.ts`. A pin **freezes** the demo length it was committed at
   (`lengthHours`), so it is its own independent scheduled window — later changes to the
   dashboard-wide demo length don't reshape it; the dialog preview, by contrast, uses the live demo length.
   New scoring surface in `src/scoring/window.ts`: `centeredWindowStart` (the only selection math —
   center, lean-later, clamp at dawn/dusk) and `scoreNamedWindow` (rolls a named block up to one
   status + worst-in-window readings, fail-safe no-go when it can't be fully evaluated). Each
   `ScoredHour` now carries `clockHour` so components never parse a timestamp. Reference
   prototype: **`docs/prototype-window-pin.html`**.

3. **Multiple cities (dropdown + per-city thresholds).** `SITES` is already a list and `Site`
   documents that timezone/thresholds belong on it. *Seam:* a `CitySelect` in `DashboardHeader`
   writing a `selectedSiteId` (small Redux slice); `forecastApi` endpoint arg goes `void → Site`;
   per-city thresholds become a `thresholdsForSite(site)` lookup in the scoring layer.
   `Attribution` already renders resolved coords, so it generalizes for free.

4. **Slide-out config sidebar.** The window/demo config currently lives in the always-visible
   `WindowControls` bar (other treatments — modal, accordion, drawer — were prototyped in
   `docs/prototype-window-config.html`). If config grows (city + per-city thresholds), a MUI
   `<Drawer>` toggled from the header is the seam; `Dashboard` owns layout and config still flows
   through `useScoredForecast` args.

**The unifying seam:** every deferred item is "more inputs into `useScoredForecast` /
`scoreForecast`" plus "more chrome at the top (header or `WindowControls`)." Keep scoring
parameterizable and the top of the page as the control surface, and the components below stay
dumb and unchanged.
