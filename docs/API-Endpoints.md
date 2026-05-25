# API Endpoints — Open-Meteo

Reference for the two upstream APIs the dashboard pulls from. Everything here was
verified against live API responses on 2026-05-23. Use this as the contract when
implementing the data layer.

## Overview

- **Site:** Gulf Test Range, Gulfport, MS — `latitude=30.3674`, `longitude=-89.0928`
- **Auth:** none. Free, no API key, no registration.
- **Time range:** request `forecast_days=10` (both APIs support up to 16).
- **Timezone:** pass `timezone=America/Chicago` so `time[]` values are local to
  Gulfport and `sunrise`/`sunset` line up with the local day. Without it the API
  returns UTC.
- **Two APIs, two hosts:** weather conditions come from the Forecast API; sea state
  comes from the Marine API. They share the same `latitude`/`longitude`/`timezone`/
  `forecast_days` params and are joined by matching the hourly `time[]` values.

Conditions Tara cares about and where each comes from:

| Tara's factor | Source API | Variable |
| --- | --- | --- |
| Wind speed | Forecast | `wind_speed_10m` |
| Wave height | Marine | `wave_height` |
| Precipitation | Forecast | `precipitation` |
| Visibility | Forecast | `visibility` |

We request **only** the variables the go/no-go read consumes — not every available
field — keeping the request minimal per the brief. The exact lists live in
`src/forecast/openMeteoConstants.ts`; the "requested" tables below mirror them, and each
is followed by an "available, not requested" table documenting the rest for future scope.

---

## 1. Weather Forecast API

Wind, precipitation, visibility, and the daylight window.

**Base URL:** `https://api.open-meteo.com/v1/forecast`

**Example request** (copy-paste runnable):

```
https://api.open-meteo.com/v1/forecast?latitude=30.3674&longitude=-89.0928&hourly=wind_speed_10m,precipitation,visibility,is_day&daily=sunrise,sunset,daylight_duration&wind_speed_unit=kn&timezone=America/Chicago&forecast_days=10
```

**Docs:** https://open-meteo.com/en/docs

### Parameters

| Param | Value | Why |
| --- | --- | --- |
| `latitude` / `longitude` | `30.3674` / `-89.0928` | Gulfport site |
| `hourly` | comma list (below) | hourly variables to return |
| `daily` | `sunrise,sunset,daylight_duration` | daylight window for filtering |
| `wind_speed_unit` | `kn` | Tara's wind thresholds are in **knots** |
| `timezone` | `America/Chicago` | local times |
| `forecast_days` | `10` | 10-day look-ahead |

### Hourly variables requested

The four the go/no-go read consumes (`FORECAST_HOURLY` in `openMeteoConstants.ts`):

| Variable | Unit returned | Used for |
| --- | --- | --- |
| `wind_speed_10m` | `kn` | wind go/no-go |
| `precipitation` | `mm` | rain (any rain = no-go per Tara) |
| `visibility` | `m` | visibility (converted to miles, see §3) |
| `is_day` | `1` day / `0` night | exclude night hours; demos are daytime only |

### Other available variables (not requested)

The Forecast API also offers these. We don't request them today (so they're absent from
the example URL and response below), but they're here for when scope grows — e.g. a
condition icon or a gust read:

| Variable | Unit returned | Could be used for |
| --- | --- | --- |
| `wind_gusts_10m` | `kn` | gust context (secondary) |
| `precipitation_probability` | `%` | rain likelihood context |
| `weather_code` | WMO code | human-readable condition / icon |

### Daily variables requested

| Variable | Unit returned | Used for |
| --- | --- | --- |
| `sunrise` | ISO8601 local time | start of daylight window |
| `sunset` | ISO8601 local time | end of daylight window |
| `daylight_duration` | seconds | length of daylight |

### Response structure

Parallel arrays. `hourly.time[i]` aligns index-for-index with every other
`hourly.*[i]` array. Units live in `hourly_units` / `daily_units`.

```jsonc
{
  "latitude": 30.366642,           // snaps to nearest grid cell
  "longitude": -89.10287,
  "utc_offset_seconds": -18000,
  "timezone": "America/Chicago",
  "hourly_units": {
    "time": "iso8601",
    "wind_speed_10m": "kn",
    "precipitation": "mm",
    "visibility": "m",
    "is_day": ""
  },
  "hourly": {
    "time": ["2026-05-23T00:00", "2026-05-23T01:00", ...],   // 240 entries for 10 days
    "wind_speed_10m": [ ... ],
    "precipitation": [ ... ],
    "visibility": [ ... ],
    "is_day": [ ... ]
  },
  "daily_units": { "sunrise": "iso8601", "sunset": "iso8601", "daylight_duration": "s" },
  "daily": {
    "time": ["2026-05-23", ...],   // 10 entries
    "sunrise": ["2026-05-23T05:57", ...],
    "sunset": ["2026-05-23T19:xx", ...],
    "daylight_duration": [ ... ]
  }
}
```

---

## 2. Marine Forecast API

Sea state — `wave_height` is the go/no-go input; wind waves, swell, period, and direction
are available but not requested (see below).

**Base URL:** `https://marine-api.open-meteo.com/v1/marine`

**Example request** (copy-paste runnable):

```
https://marine-api.open-meteo.com/v1/marine?latitude=30.3674&longitude=-89.0928&hourly=wave_height&length_unit=imperial&timezone=America/Chicago&forecast_days=10
```

**Docs:** https://open-meteo.com/en/docs/marine-weather-api

### Parameters

| Param | Value | Why |
| --- | --- | --- |
| `latitude` / `longitude` | `30.3674` / `-89.0928` | Gulfport site (snaps to nearest ocean cell, see Gotchas) |
| `hourly` | comma list (below) | hourly sea-state variables |
| `length_unit` | `imperial` | returns wave heights in **feet** — matches Tara's ft thresholds. Default is meters. |
| `timezone` | `America/Chicago` | local times, aligns with Forecast API |
| `forecast_days` | `10` | 10-day look-ahead |

### Hourly variables requested

Just the one the wave go/no-go needs (`MARINE_HOURLY` in `openMeteoConstants.ts`):

| Variable | Default unit | With `length_unit=imperial` | Used for |
| --- | --- | --- | --- |
| `wave_height` | `m` | `ft` | wave go/no-go (primary) |

> `length_unit=imperial` converts the length-type `wave_height` from meters to feet —
> matching Tara's ft thresholds.

### Other available variables (not requested)

The Marine API also offers these; not requested today, so absent from the example URL
and response below:

| Variable | Default unit | With `length_unit=imperial` | Could be used for |
| --- | --- | --- | --- |
| `wind_wave_height` | `m` | `ft` | locally generated chop (context) |
| `swell_wave_height` | `m` | `ft` | swell component (context) |
| `wave_period` | `s` | `s` | wave period (context) |
| `wave_direction` | `°` | `°` | wave direction (context) |

> `length_unit` only converts length-type fields (the `*_height` variables).
> `wave_period` stays seconds and `wave_direction` stays degrees.

### Response structure

Same parallel-array shape as the Forecast API.

```jsonc
{
  "latitude": 30.291664,           // marine grid cell, differs from forecast cell
  "longitude": -89.12499,
  "utc_offset_seconds": -18000,
  "timezone": "America/Chicago",
  "hourly_units": {
    "time": "iso8601",
    "wave_height": "ft"            // "m" if length_unit omitted
  },
  "hourly": {
    "time": ["2026-05-23T00:00", ...],   // same hourly cadence as Forecast API
    "wave_height": [ ... ]
  }
}
```

---

## 3. Units & Tara's thresholds

The values returned in the units above map to Tara's go / iffy / no-go bands
(from the instructions and `Notes.md`):

| Factor | Variable (unit) | Good | Iffy | No-go |
| --- | --- | --- | --- | --- |
| Wind | `wind_speed_10m` (kn) | < 15 | 15–20 | > 20 |
| Wave | `wave_height` (ft) | < 2 | 2–4 | > 4 |
| Precipitation | `precipitation` (mm) | 0 (none) | — | any rain |
| Visibility | `visibility` (m) | ≥ 6 mi (~9,656 m) | 3–6 mi (~4,828–9,656 m) | < 3 mi (< ~4,828 m) |

> Tara gave visibility in **miles** ("6 mi is go, 3–6 caution, less than 3 a no-go")
> but the API returns **meters**. Convert with 1 mi = 1609.344 m. Open-Meteo caps
> visibility around ~24,140 m, so the 6 mi go floor (9,656 m) sits comfortably in range.

---

## 4. Working with the responses

- Both APIs return **parallel arrays** keyed by the hourly `time[]` array. To read
  the conditions at hour _i_, read index _i_ from each variable array.
- **Join the two APIs by timestamp.** Both produce the same hourly cadence over the
  same days, so matching `forecast.hourly.time[i]` to `marine.hourly.time[i]` gives a
  combined hourly record. Match on the ISO string rather than assuming identical
  array lengths.
- **Daylight filtering:** demos are daytime only. Use `is_day == 1` (or the
  `sunrise`/`sunset` daily values) to drop night hours before evaluating a day.
- A 10-day request returns ~240 hourly entries per variable and 10 daily entries.

---

## 5. Gotchas

- **Marine grid ≠ forecast grid.** The Marine API snaps the request to the nearest
  ocean cell (~`30.29, -89.12`) while the Forecast API resolves to ~`30.37, -89.10`.
  Both echo their resolved `latitude`/`longitude`. This is expected — marine data
  only exists on water cells — not a bug.
- **Units are per-request.** Wind comes back in knots only if `wind_speed_unit=kn` is
  sent; wave height comes back in feet only if `length_unit=imperial` is sent (marine
  API). Omit them and you get km/h and meters.
- **⚠️ `precipitation_unit=inch` silently flips visibility to feet (forecast API).**
  Verified live 2026-05-23 against this site: with no unit params `visibility` is `m`
  (e.g. 14200); `wind_speed_unit=kn` alone keeps it `m`; adding `precipitation_unit=inch`
  switches `visibility` to `ft` (the same reading then reports 46587.9). Open-Meteo's own
  docs claim visibility is unaffected — it isn't. So we **never send `precipitation_unit`**:
  keep API defaults (precip `mm`, visibility `m`) and convert both explicitly in
  `normalize.ts` (`millimetersToInches`, `metersToMiles`). Send it and `metersToMiles`
  divides a feet value by 1609.344, reporting ~3× the true distance.
- **Always send `timezone`.** Omitting it returns UTC times, which will misalign the
  daylight window and the day grouping.
- **Visibility comes back in meters, Tara thinks in miles.** Her bands are ≥ 6 mi
  go / 3–6 mi caution / < 3 mi no-go. Convert API meters with 1 mi = 1609.344 m before comparing.
- **Rate limits / caching.** Open-Meteo's free tier is rate-limited and intended for
  non-commercial use. `Notes.md` calls for caching responses ~10 minutes so repeated
  morning checks don't re-hit the API.

---

## 6. Normalized model (what the data layer emits)

The raw parallel arrays above are fused and converted **once**, in
`combineForecasts.ts` (join by timestamp, daylight-only) using `normalize.ts`
helpers, into a `CombinedHour[]`. Everything downstream (scoring, UI) reasons in
these canonical units — never the raw API units. Shape (`types.ts` → `CombinedHour`):

| Field | Unit | Source variable | Conversion |
| --- | --- | --- | --- |
| `time` | ISO 8601 w/ site UTC offset (`2026-05-23T06:00:00-05:00`) | forecast `time[]` | `toSiteIso` appends the offset so `new Date()` is unambiguous in any browser timezone |
| `windSpeedKn` | knots | forecast `wind_speed_10m` | none — requested via `wind_speed_unit=kn` |
| `waveHeightFt` | feet (nullable) | marine `wave_height` | none — requested via `length_unit=imperial`; `null` when no matching marine hour |
| `precipitationIn` | inches | forecast `precipitation` (`mm`) | `millimetersToInches` (÷ 25.4) — **not** `precipitation_unit`, see Gotchas |
| `visibilityMiles` | miles | forecast `visibility` (`m`) | `metersToMiles` (÷ 1609.344) |

`DayForecast` wraps these with `sunriseTime` / `sunsetTime` (same ISO-with-offset
format) and `daylightDurationSeconds`.

The pattern: units we can request without side effects (`wind_speed_unit`, marine
`length_unit`) are requested at the API; the one with the visibility side effect
(`precipitation_unit`) is handled by explicit conversion instead — keeping our unit
choices decoupled from Open-Meteo's coupled imperial switch.
