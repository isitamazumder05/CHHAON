import type { CurrentWeather } from '../types';

// WMO Weather interpretation table
const WMO_CODE_MAP: Record<number, string> = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog or morning mist',
  48: 'Depositing rime fog',
  51: 'Light drizzle',
  53: 'Moderate drizzle',
  55: 'Dense drizzle',
  61: 'Slight rain',
  63: 'Moderate rain',
  65: 'Heavy rain',
  80: 'Rain showers',
  95: 'Thunderstorm',
};

export interface FetchWeatherResponse {
  current: CurrentWeather;
  hourly: Array<{
    isoTime: string;
    temperature: number;
    apparentTemperature: number;
    humidity: number;
    uvIndex: number | null;
    windSpeed: number;
    directRadiation: number | null;
  }>;
}

/**
 * Validates and transforms raw Open-Meteo API response.
 * Throws explicit errors when required fields are missing instead of silently fabricating fallback values.
 */
export function parseWeatherApiResponse(data: any): FetchWeatherResponse {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid meteorological response: empty or non-object payload received.');
  }

  const currentRaw = data.current;
  if (!currentRaw || typeof currentRaw !== 'object') {
    throw new Error('Incomplete meteorological data: Missing current weather payload in forecast response.');
  }

  // Strict validation: temperature, apparent temperature, relative humidity, wind speed, and timestamp are required
  const temp = currentRaw.temperature_2m;
  const appTemp = currentRaw.apparent_temperature;
  const humidity = currentRaw.relative_humidity_2m;
  const wind = currentRaw.wind_speed_10m;
  const timeStr = currentRaw.time;

  if (
    typeof temp !== 'number' ||
    Number.isNaN(temp) ||
    typeof appTemp !== 'number' ||
    Number.isNaN(appTemp) ||
    typeof humidity !== 'number' ||
    Number.isNaN(humidity) ||
    typeof wind !== 'number' ||
    Number.isNaN(wind) ||
    typeof timeStr !== 'string' ||
    !timeStr.trim()
  ) {
    throw new Error(
      'Incomplete meteorological data: Essential atmospheric variables (air temperature, humidity, apparent temperature, or wind speed) are missing from the forecast response.'
    );
  }

  // Validate hourly structure
  if (!data.hourly || !Array.isArray(data.hourly.time)) {
    throw new Error('Incomplete meteorological data: Hourly forecast series is missing from the response.');
  }

  const hourlyTimes: string[] = data.hourly.time;
  const hourlyTemps: (number | null)[] = data.hourly.temperature_2m || [];
  const hourlyApparent: (number | null)[] = data.hourly.apparent_temperature || [];
  const hourlyHumidity: (number | null)[] = data.hourly.relative_humidity_2m || [];
  const hourlyUV: (number | null)[] = data.hourly.uv_index || [];
  const hourlyWind: (number | null)[] = data.hourly.wind_speed_10m || [];
  const hourlyRadiation: (number | null)[] = data.hourly.direct_normal_irradiance || [];

  const weatherCode = typeof currentRaw.weather_code === 'number' ? currentRaw.weather_code : 0;
  const weatherDescription = WMO_CODE_MAP[weatherCode] || 'Weather conditions reported';

  // Align hourly index with current local time prefix (e.g. "2026-10-10T14")
  const currentHourPrefix = timeStr.slice(0, 13);
  const matchedHourlyIdx = hourlyTimes.findIndex(
    (t) => typeof t === 'string' && t.startsWith(currentHourPrefix)
  );

  // Solar radiation and UV index:
  // 1. Check currentRaw for valid numeric value (distinguish numeric 0 from null/undefined)
  // 2. If undefined in currentRaw, check matched hourly slot (strictly matching current hour, NEVER midnight index 0)
  // 3. Otherwise explicit null (distinguishing missing/unavailable data from genuine zero)
  let directRadiation: number | null = null;
  if (
    typeof currentRaw.direct_normal_irradiance === 'number' &&
    !Number.isNaN(currentRaw.direct_normal_irradiance)
  ) {
    directRadiation = Math.round(currentRaw.direct_normal_irradiance);
  } else if (
    currentRaw.direct_normal_irradiance === undefined &&
    matchedHourlyIdx >= 0 &&
    typeof hourlyRadiation[matchedHourlyIdx] === 'number' &&
    !Number.isNaN(hourlyRadiation[matchedHourlyIdx])
  ) {
    directRadiation = Math.round(hourlyRadiation[matchedHourlyIdx]!);
  }

  let uvIndex: number | null = null;
  if (typeof currentRaw.uv_index === 'number' && !Number.isNaN(currentRaw.uv_index)) {
    uvIndex = Math.round(currentRaw.uv_index * 10) / 10;
  } else if (
    currentRaw.uv_index === undefined &&
    matchedHourlyIdx >= 0 &&
    typeof hourlyUV[matchedHourlyIdx] === 'number' &&
    !Number.isNaN(hourlyUV[matchedHourlyIdx])
  ) {
    uvIndex = Math.round(hourlyUV[matchedHourlyIdx]! * 10) / 10;
  }

  const currentWeather: CurrentWeather = {
    temperature: Math.round(temp * 10) / 10,
    apparentTemperature: Math.round(appTemp * 10) / 10,
    humidity: Math.round(humidity),
    windSpeed: Math.round(wind * 10) / 10,
    uvIndex,
    weatherCode,
    weatherDescription,
    directRadiation,
    timestamp: timeStr,
    timezone: data.timezone,
    utcOffsetSeconds: data.utc_offset_seconds,
    dataSource: 'Open-Meteo Numerical Weather Prediction Model',
    isModelForecast: true,
  };

  // Align hourly forecast window with current local forecast time
  let startIdx = matchedHourlyIdx;
  if (startIdx === -1) {
    // If exact hour match not found, find first slot >= current local time
    startIdx = hourlyTimes.findIndex((t) => typeof t === 'string' && t >= timeStr);
    if (startIdx === -1) startIdx = 0;
  }

  const hourlyList = [];
  const maxSlots = Math.min(24, hourlyTimes.length - startIdx);
  for (let i = 0; i < maxSlots; i++) {
    const idx = startIdx + i;
    const t = hourlyTemps[idx];
    const at = hourlyApparent[idx];
    const h = hourlyHumidity[idx];
    const w = hourlyWind[idx];
    const uv = hourlyUV[idx];
    const rad = hourlyRadiation[idx];

    // Require essential parameters for valid hourly forecast slot
    if (typeof t !== 'number' || typeof at !== 'number' || typeof h !== 'number') {
      continue;
    }

    hourlyList.push({
      isoTime: hourlyTimes[idx],
      temperature: Math.round(t * 10) / 10,
      apparentTemperature: Math.round(at * 10) / 10,
      humidity: Math.round(h),
      uvIndex: typeof uv === 'number' && !Number.isNaN(uv) ? Math.round(uv * 10) / 10 : null,
      windSpeed: typeof w === 'number' && !Number.isNaN(w) ? Math.round(w * 10) / 10 : 0,
      directRadiation: typeof rad === 'number' && !Number.isNaN(rad) ? Math.round(rad) : null,
    });
  }

  return {
    current: currentWeather,
    hourly: hourlyList,
  };
}

export async function fetchLiveWeather(lat: number, lng: number): Promise<FetchWeatherResponse> {
  const params = new URLSearchParams({
    latitude: lat.toFixed(4),
    longitude: lng.toFixed(4),
    current: 'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,uv_index,direct_normal_irradiance',
    hourly: 'temperature_2m,relative_humidity_2m,apparent_temperature,uv_index,wind_speed_10m,direct_normal_irradiance',
    timezone: 'auto',
    forecast_days: '2',
  });

  const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Weather forecast service returned status ${res.status} (${res.statusText || 'Error'})`);
    }

    const data = await res.json();
    return parseWeatherApiResponse(data);
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Weather request timed out. Please check network connection and try again.');
    }
    throw error;
  }
}
