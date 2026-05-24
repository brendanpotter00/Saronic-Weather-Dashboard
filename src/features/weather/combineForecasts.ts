import type {
  ForecastResponse,
  MarineResponse,
  CombinedHour,
  DayForecast,
  CombinedForecast,
} from './types';
import { metersToMiles, millimetersToInches, localTimeToSiteIso } from './normalize';

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
    if (h.is_day[i] !== 1) continue; // daylight only — demos are daytime
    const rawTime = h.time[i]; // raw Open-Meteo local string — the join key
    const windSpeedKn = h.wind_speed_10m[i] ?? null;
    const waveHeightFt = waveByTime.get(rawTime) ?? null; // null when marine has no match
    const precipitationIn = millimetersToInches(h.precipitation[i]);
    const visibilityMiles = metersToMiles(h.visibility[i]);
    hours.push({
      time: localTimeToSiteIso(rawTime, timeZone),
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
  const days: DayForecast[] = d.time.map((date, i) => ({
    date,
    sunriseTime: localTimeToSiteIso(d.sunrise[i], timeZone),
    sunsetTime: localTimeToSiteIso(d.sunset[i], timeZone),
    daylightDurationSeconds: d.daylight_duration[i],
    hours: hoursByDate.get(date) ?? [],
  }));

  return {
    site: { latitude: forecast.latitude, longitude: forecast.longitude },
    marineSite: marine ? { latitude: marine.latitude, longitude: marine.longitude } : null,
    timezone: forecast.timezone,
    days,
    marineAvailable: marine !== null,
  };
}
