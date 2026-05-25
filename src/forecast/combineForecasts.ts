import type { ForecastResponse, MarineResponse } from './responseTypes';
import type { CombinedHour, DayForecast, CombinedForecast } from '../model';
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

/** Fuse the Forecast + Marine responses into a daylight-only, day-grouped model in domain units. */
export function buildCombinedForecast(
  forecast: ForecastResponse,
  marine: MarineResponse | null,
): CombinedForecast {
  const waveByTime = buildTimestampToWaveHeight(marine);
  const hourly = forecast.hourly;
  const timeZone = forecast.timezone;

  // 1) Fuse every daylight forecast hour with its wave height (matched by time).
  const hours: CombinedHour[] = [];
  for (let i = 0; i < hourly.time.length; i++) {
    if (hourly.is_day[i] !== IS_DAYLIGHT) continue; // daylight only — demos are daytime
    const rawTime = hourly.time[i]; // raw Open-Meteo local string — the join key
    const time = localTimeToSiteIso(rawTime, timeZone);
    if (time === null) continue; // missing/unparseable timestamp — can't place this hour
    // Wind/wave go through the same fail-safe guard as the converted factors: a NaN or stray
    // string from a malformed-but-200 body becomes null, so it can't falsely make the hour `complete`.
    const windSpeedKn = finiteOrNull(hourly.wind_speed_10m[i]);
    const waveHeightFt = finiteOrNull(waveByTime.get(rawTime)); // null when marine has no match
    const precipitationIn = millimetersToInches(hourly.precipitation[i]);
    const visibilityMiles = metersToMiles(hourly.visibility[i]);
    hours.push({
      time,
      windSpeedKn,
      waveHeightFt,
      precipitationIn,
      visibilityMiles,
      // Fail-safe: an hour missing any factor can never be a GO. Computed here so scoring/UI read
      // `complete` instead of re-deriving the null checks.
      complete:
        windSpeedKn !== null &&
        waveHeightFt !== null &&
        precipitationIn !== null &&
        visibilityMiles !== null,
    });
  }

  // 2) Bucket daylight hours by calendar date. Step 3 drives day order from daily.time, so a
  // daylight hour whose date isn't in daily.time is intentionally dropped — erring toward no-go.
  const hoursByDate = new Map<string, CombinedHour[]>();
  for (const hour of hours) {
    const date = hour.time.slice(0, DATE_KEY_LENGTH);
    const bucket = hoursByDate.get(date);
    if (bucket) bucket.push(hour);
    else hoursByDate.set(date, [hour]);
  }

  // 3) Drive day order/metadata from daily.time (authoritative 10-day list). Day metadata is
  // nullable: a short/absent daily array (or a polar sunrise/sunset) yields a missing value —
  // carry it through as null rather than fabricating a timestamp or throwing.
  const daily = forecast.daily;
  const days: DayForecast[] = daily.time.map((date, i) => {
    const sunriseTime = localTimeToSiteIso(daily.sunrise[i], timeZone);
    const sunsetTime = localTimeToSiteIso(daily.sunset[i], timeZone);
    const daylightDurationSeconds = finiteOrNull(daily.daylight_duration[i]);
    const hours = hoursByDate.get(date) ?? [];
    return {
      date,
      sunriseTime,
      sunsetTime,
      daylightDurationSeconds,
      hours,
      // Day-level analog of CombinedHour.complete: a day is usable only with the metadata to
      // evaluate a daylight window (sunrise/sunset/duration) AND ≥1 daylight hour.
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
