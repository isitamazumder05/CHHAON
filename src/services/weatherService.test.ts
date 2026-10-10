import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseWeatherApiResponse } from './weatherService.ts';

describe('weatherService data integrity and validation', () => {
  const validMockResponse = {
    timezone: 'Asia/Kolkata',
    utc_offset_seconds: 19800,
    current: {
      time: '2026-10-10T14:00',
      temperature_2m: 36.4,
      apparent_temperature: 41.2,
      relative_humidity_2m: 58,
      wind_speed_10m: 12.3,
      weather_code: 1,
      uv_index: 8.5,
      direct_normal_irradiance: 680,
    },
    hourly: {
      time: [
        '2026-10-10T12:00',
        '2026-10-10T13:00',
        '2026-10-10T14:00',
        '2026-10-10T15:00',
        '2026-10-10T16:00',
      ],
      temperature_2m: [35.0, 36.0, 36.4, 35.8, 34.2],
      apparent_temperature: [39.0, 40.5, 41.2, 40.1, 38.0],
      relative_humidity_2m: [60, 59, 58, 61, 64],
      wind_speed_10m: [10, 11, 12, 11, 9],
      uv_index: [9.0, 9.2, 8.5, 6.0, 3.0],
      direct_normal_irradiance: [720, 750, 680, 450, 180],
    },
  };

  it('parses valid API response with exact values and metadata', () => {
    const result = parseWeatherApiResponse(validMockResponse);
    assert.equal(result.current.temperature, 36.4);
    assert.equal(result.current.apparentTemperature, 41.2);
    assert.equal(result.current.humidity, 58);
    assert.equal(result.current.windSpeed, 12.3);
    assert.equal(result.current.uvIndex, 8.5);
    assert.equal(result.current.directRadiation, 680);
    assert.equal(result.current.timestamp, '2026-10-10T14:00');
    assert.equal(result.current.timezone, 'Asia/Kolkata');
    assert.equal(result.current.dataSource, 'Open-Meteo Numerical Weather Prediction Model');
    assert.equal(result.current.isModelForecast, true);
  });

  it('throws an explicit error when required temperature is missing (no silent fallback to 30)', () => {
    const invalidPayload = JSON.parse(JSON.stringify(validMockResponse));
    delete invalidPayload.current.temperature_2m;

    assert.throws(
      () => parseWeatherApiResponse(invalidPayload),
      /Incomplete meteorological data: Essential atmospheric variables/
    );
  });

  it('throws an explicit error when required apparent temperature is missing (no silent fallback to 32)', () => {
    const invalidPayload = JSON.parse(JSON.stringify(validMockResponse));
    delete invalidPayload.current.apparent_temperature;

    assert.throws(
      () => parseWeatherApiResponse(invalidPayload),
      /Incomplete meteorological data: Essential atmospheric variables/
    );
  });

  it('throws an explicit error when required humidity is missing (no silent fallback to 50)', () => {
    const invalidPayload = JSON.parse(JSON.stringify(validMockResponse));
    delete invalidPayload.current.relative_humidity_2m;

    assert.throws(
      () => parseWeatherApiResponse(invalidPayload),
      /Incomplete meteorological data: Essential atmospheric variables/
    );
  });

  it('throws an explicit error when required wind speed is missing (no silent fallback to 8)', () => {
    const invalidPayload = JSON.parse(JSON.stringify(validMockResponse));
    delete invalidPayload.current.wind_speed_10m;

    assert.throws(
      () => parseWeatherApiResponse(invalidPayload),
      /Incomplete meteorological data: Essential atmospheric variables/
    );
  });

  it('leaves direct radiation and UV index as null when unavailable rather than fabricating 350 W/m²', () => {
    const payloadWithoutRadiation = JSON.parse(JSON.stringify(validMockResponse));
    payloadWithoutRadiation.current.direct_normal_irradiance = null;
    payloadWithoutRadiation.current.uv_index = null;

    const result = parseWeatherApiResponse(payloadWithoutRadiation);
    assert.equal(result.current.directRadiation, null);
    assert.equal(result.current.uvIndex, null);
  });

  it('aligns hourly forecast slots to current local time string without UTC drift', () => {
    // Current time is 14:00 local time
    const result = parseWeatherApiResponse(validMockResponse);
    // Hourly array starts at index of 14:00 (index 2 in mock)
    assert.equal(result.hourly.length, 3);
    assert.equal(result.hourly[0].isoTime, '2026-10-10T14:00');
    assert.equal(result.hourly[0].temperature, 36.4);
    assert.equal(result.hourly[1].isoTime, '2026-10-10T15:00');
  });

  it('preserves genuine numeric zero UV index (e.g. nighttime observations) without converting to null', () => {
    const nightPayload = JSON.parse(JSON.stringify(validMockResponse));
    nightPayload.current.time = '2026-10-10T23:00';
    nightPayload.current.uv_index = 0.0;
    nightPayload.current.direct_normal_irradiance = 0;

    const result = parseWeatherApiResponse(nightPayload);
    assert.strictEqual(result.current.uvIndex, 0);
    assert.strictEqual(result.current.directRadiation, 0);
  });

  it('correctly parses valid positive daytime UV index values from current API data', () => {
    const daytimePayload = JSON.parse(JSON.stringify(validMockResponse));
    daytimePayload.current.uv_index = 7.42;

    const result = parseWeatherApiResponse(daytimePayload);
    assert.strictEqual(result.current.uvIndex, 7.4);
  });

  it('resolves UV index from hourly forecast when current.uv_index is undefined with strict local hour match', () => {
    const payloadWithoutCurrentUV = JSON.parse(JSON.stringify(validMockResponse));
    delete payloadWithoutCurrentUV.current.uv_index;
    payloadWithoutCurrentUV.current.time = '2026-10-10T15:00'; // matches index 3 (uv 6.0)

    const result = parseWeatherApiResponse(payloadWithoutCurrentUV);
    assert.strictEqual(result.current.uvIndex, 6.0);
  });

  it('does not fall back to midnight index 0 when current time is unmatched in hourly forecast', () => {
    const payloadWithUnmatchedTime = JSON.parse(JSON.stringify(validMockResponse));
    delete payloadWithUnmatchedTime.current.uv_index;
    // Current time is outside hourly time range
    payloadWithUnmatchedTime.current.time = '2026-10-11T09:00';
    // Hourly array has index 0 as midnight with 0 UV, but index 0 must NOT be selected as current UV
    payloadWithUnmatchedTime.hourly.time = ['2026-10-10T00:00', '2026-10-10T01:00'];
    payloadWithUnmatchedTime.hourly.uv_index = [0.0, 0.0];

    const result = parseWeatherApiResponse(payloadWithUnmatchedTime);
    // Because current.uv_index was undefined and hourly did not have a match for 2026-10-11T09:00,
    // it must be null (Unavailable), NOT index 0 (0.0)!
    assert.strictEqual(result.current.uvIndex, null);
  });

  it('throws when payload is empty or not an object', () => {
    assert.throws(() => parseWeatherApiResponse(null), /Invalid meteorological response/);
    assert.throws(() => parseWeatherApiResponse(undefined), /Invalid meteorological response/);
  });
});
