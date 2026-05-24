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
| Precipitation | Forecast | `precipitation`, `precipitation_probability` |
| Visibility | Forecast | `visibility` |

---

## 1. Weather Forecast API

Wind, precipitation, visibility, sky condition, and the daylight window.

**Base URL:** `https://api.open-meteo.com/v1/forecast`

**Example request** (copy-paste runnable):

```
https://api.open-meteo.com/v1/forecast?latitude=30.3674&longitude=-89.0928&hourly=wind_speed_10m,wind_gusts_10m,precipitation,precipitation_probability,visibility,weather_code,is_day&daily=sunrise,sunset,daylight_duration&wind_speed_unit=kn&timezone=America/Chicago&forecast_days=10
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

### Hourly variables pulled

| Variable | Unit returned | Used for |
| --- | --- | --- |
| `wind_speed_10m` | `kn` | wind go/no-go |
| `wind_gusts_10m` | `kn` | gust context (secondary) |
| `precipitation` | `mm` | rain (any rain = no-go per Tara) |
| `precipitation_probability` | `%` | rain likelihood context |
| `visibility` | `m` | visibility (see open question below) |
| `weather_code` | WMO code | human-readable condition / icon |
| `is_day` | `1` day / `0` night | exclude night hours; demos are daytime only |

### Daily variables pulled

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
    "wind_gusts_10m": "kn",
    "precipitation": "mm",
    "precipitation_probability": "%",
    "visibility": "m",
    "weather_code": "wmo code",
    "is_day": ""
  },
  "hourly": {
    "time": ["2026-05-23T00:00", "2026-05-23T01:00", ...],   // 240 entries for 10 days
    "wind_speed_10m": [ ... ],
    "wind_gusts_10m": [ ... ],
    "precipitation": [ ... ],
    "precipitation_probability": [ ... ],
    "visibility": [ ... ],
    "weather_code": [ ... ],
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

Sea state — wave height, wind waves, swell.

**Base URL:** `https://marine-api.open-meteo.com/v1/marine`

**Example request** (copy-paste runnable):

```
https://marine-api.open-meteo.com/v1/marine?latitude=30.3674&longitude=-89.0928&hourly=wave_height,wind_wave_height,swell_wave_height,wave_period,wave_direction&length_unit=imperial&timezone=America/Chicago&forecast_days=10
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

### Hourly variables pulled

| Variable | Default unit | With `length_unit=imperial` | Used for |
| --- | --- | --- | --- |
| `wave_height` | `m` | `ft` | wave go/no-go (primary) |
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
    "wave_height": "ft",           // "m" if length_unit omitted
    "wind_wave_height": "ft",
    "swell_wave_height": "ft",
    "wave_period": "s",
    "wave_direction": "°"
  },
  "hourly": {
    "time": ["2026-05-23T00:00", ...],   // same hourly cadence as Forecast API
    "wave_height": [ ... ],
    "wind_wave_height": [ ... ],
    "swell_wave_height": [ ... ],
    "wave_period": [ ... ],
    "wave_direction": [ ... ]
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
| Visibility | `visibility` (m) | ≥ 10 mi (~16,093 m) | 3–10 mi (~4,828–16,093 m) | < 3 mi (< ~4,828 m) |

> Tara gave visibility in **miles** ("10 miles is ideal, less than 3 is a no-go")
> but the API returns **meters**. Convert with 1 mi = 1609.344 m. Open-Meteo caps
> visibility around ~24,140 m, so 10 mi (16,093 m) sits comfortably in range.

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
  sent; wave height comes back in feet only if `length_unit=imperial` is sent. Omit
  them and you get m/s and meters.
- **Always send `timezone`.** Omitting it returns UTC times, which will misalign the
  daylight window and the day grouping.
- **Visibility comes back in meters, Tara thinks in miles.** Her bands are ≥ 10 mi
  ideal / < 3 mi no-go. Convert API meters with 1 mi = 1609.344 m before comparing.
- **Rate limits / caching.** Open-Meteo's free tier is rate-limited and intended for
  non-commercial use. `Notes.md` calls for caching responses ~10 minutes so repeated
  morning checks don't re-hit the API.
