import type {
  ForecastResponse,
  MarineResponse,
  CombinedHour,
  DayForecast,
  CombinedForecast,
} from './types';
import {
  metersToMiles,
  millimetersToInches,
  localTimeToSiteIso,
  finiteOrNull,
} from './normalize';
import { IS_DAYLIGHT } from './openMeteoConstants';

// The local date key is the "YYYY-MM-DD" prefix of an ISO timestamp.
const DATE_KEY_LENGTH = 10;

function buildTimestampToWaveHeight(
  marineResponse: MarineResponse | null,
): Map<string, number | null> {
  const timestampToWaveHeight = new Map<string, number | null>();
  if (marineResponse === null) {
    return timestampToWaveHeight;
  }

  for (let i = 0; i < marineResponse.hourly.time.length; i++) {
    timestampToWaveHeight.set(marineResponse.hourly.time[i], marineResponse.hourly.wave_height[i]);
  }

  return timestampToWaveHeight;
}

/**
 * Fuse the Forecast + Marine responses into a daylight-only, day-grouped model
 * in Tara's units. Pure (no React/RTK imports) so it can be unit-tested alone.
 */
export function buildCombinedForecast(
  forecast: ForecastResponse,
  marine: MarineResponse | null,
): CombinedForecast {
  const waveByTime = buildTimestampToWaveHeight(marine);
  const h = forecast.hourly;
  const timeZone = forecast.timezone;

  // 1) Fuse every daylight forecast hour with its wave height (matched by time).
  const hours: CombinedHour[] = [];
  for (let i = 0; i < h.time.length; i++) {
    if (h.is_day[i] !== IS_DAYLIGHT) continue; // daylight only — demos are daytime
    const rawTime = h.time[i]; // raw Open-Meteo local string — the join key
    const time = localTimeToSiteIso(rawTime, timeZone);
    if (time === null) continue; // missing/unparseable timestamp — can't place this hour
    // Wind and wave go through the same fail-safe guard as the converted factors
    // (visibility/precip): a NaN or stray string from a malformed-but-200 body becomes
    // null, so it can't survive `?? null` and falsely make the hour `complete`.
    const windSpeedKn = finiteOrNull(h.wind_speed_10m[i]);
    const waveHeightFt = finiteOrNull(waveByTime.get(rawTime)); // null when marine has no match
    const precipitationIn = millimetersToInches(h.precipitation[i]);
    const visibilityMiles = metersToMiles(h.visibility[i]);
    hours.push({
      time,
      windSpeedKn,
      waveHeightFt,
      precipitationIn,
      visibilityMiles,
      // Fail-safe: an hour missing any factor can never be a GO. Computed here so
      // scoring/UI stay dumb — they read `complete`, not re-derive the null checks.
      complete:
        windSpeedKn !== null &&
        waveHeightFt !== null &&
        precipitationIn !== null &&
        visibilityMiles !== null,
    });
  }

  // 2) Bucket daylight hours by calendar date (prefix of the local ISO time).
  const hoursByDate = new Map<string, CombinedHour[]>();
  for (const hour of hours) {
    const date = hour.time.slice(0, DATE_KEY_LENGTH);
    const bucket = hoursByDate.get(date);
    if (bucket) bucket.push(hour);
    else hoursByDate.set(date, [hour]);
  }

  // 3) Drive day order/metadata from daily.time (authoritative 10-day list).
  const d = forecast.daily;
  // Day metadata fields are nullable: a short/absent daily array (or a polar
  // sunrise/sunset) yields a missing value at an index — carry that through as null
  // rather than fabricating a timestamp or throwing.
  const days: DayForecast[] = d.time.map((date, i) => {
    const sunriseTime = localTimeToSiteIso(d.sunrise[i], timeZone);
    const sunsetTime = localTimeToSiteIso(d.sunset[i], timeZone);
    const daylightDurationSeconds = d.daylight_duration[i] ?? null;
    const hours = hoursByDate.get(date) ?? [];
    return {
      date,
      sunriseTime,
      sunsetTime,
      daylightDurationSeconds,
      hours,
      // Day-level analog of CombinedHour.complete: computed here so consumers stay
      // presentational and never re-derive the null checks. A day is usable only when
      // it has the metadata to evaluate a daylight window (sunrise/sunset/duration) AND
      // at least one daylight hour; otherwise the (future) window read can't run.
      complete:
        sunriseTime !== null &&
        sunsetTime !== null &&
        daylightDurationSeconds !== null &&
        hours.length > 0,
    };
  });

  return {
    site: { latitude: forecast.latitude, longitude: forecast.longitude },
    marineSite: marine ? { latitude: marine.latitude, longitude: marine.longitude } : null,
    timezone: forecast.timezone,
    days,
    marineAvailable: marine !== null,
  };
}
