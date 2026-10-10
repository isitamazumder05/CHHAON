import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculateHeatRisk, evaluateTimeSlots } from './heatRiskCalculator.ts';
import type { CurrentWeather, WorkContext } from '../types/index.ts';

describe('heatRiskCalculator transparent methodology', () => {
  const baseWeather: CurrentWeather = {
    temperature: 38.0,
    apparentTemperature: 43.5,
    humidity: 55,
    windSpeed: 10.0,
    uvIndex: 8,
    weatherCode: 1,
    weatherDescription: 'Mainly clear',
    directRadiation: 650,
    timestamp: '2026-10-10T13:00',
    dataSource: 'Open-Meteo NWP Model',
    isModelForecast: true,
  };

  const baseContext: WorkContext = {
    intensity: 'heavy',
    duration: '4h',
    shade: 'none',
    water: 'limited',
    acclimatization: 'unknown',
  };

  it('does not generate or claim an unsupported 0-100 score or numerical WBGT', () => {
    const assessment = calculateHeatRisk(baseWeather, baseContext);

    // Heat Index (apparent temperature) is used as the defensible screening indicator
    assert.equal(assessment.heatIndex, 43.5);

    // Score and estimatedWbgt should be undefined in clean assessment
    assert.equal(assessment.score, undefined);
    assert.equal(assessment.estimatedWbgt, undefined);

    // Tier is based on published Heat Index benchmarks
    assert.equal(assessment.tier, 'HIGH');
    assert.equal(assessment.tierLabel, 'High Heat Stress Alert');
  });

  it('never labels any condition safe, even at low apparent temperatures', () => {
    const coolWeather: CurrentWeather = {
      ...baseWeather,
      temperature: 24.0,
      apparentTemperature: 25.0,
      humidity: 40,
    };
    const assessment = calculateHeatRisk(coolWeather, baseContext);

    // Tier is 'LOW' (Baseline Heat Vigilance), never labeled "Safe"
    assert.equal(assessment.tier, 'LOW');
    assert.equal(assessment.tierLabel, 'Baseline Heat Vigilance');
    assert.match(
      assessment.summary.toLowerCase(),
      /note: no outdoor work conditions are entirely safe from heat illness/
    );
  });

  it('explicitly treats unknown acclimatization with an unacclimatized safety precaution margin', () => {
    const assessment = calculateHeatRisk(baseWeather, {
      ...baseContext,
      acclimatization: 'unknown',
    });

    assert.match(
      assessment.acclimatizationRule,
      /unconfirmed.*safety protocol requires applying an unacclimatized safety precaution margin/i
    );
  });

  it('separates API model variables from user site context in factor breakdown', () => {
    const assessment = calculateHeatRisk(baseWeather, baseContext);

    const atmosphericFactor = assessment.factors.find((f) => f.id === 'atmospheric');
    assert.equal(atmosphericFactor?.sourceType, 'API Model Forecast');

    const solarFactor = assessment.factors.find((f) => f.id === 'solar');
    assert.equal(solarFactor?.sourceType, 'User Worksite Context');

    const metabolicFactor = assessment.factors.find((f) => f.id === 'metabolic');
    assert.equal(metabolicFactor?.sourceType, 'User Worksite Context');

    const vulnFactor = assessment.factors.find((f) => f.id === 'vulnerability');
    assert.equal(vulnFactor?.sourceType, 'User Worksite Context');
  });

  it('provides conservative general rest and hydration guidance without fixed rigid cycles', () => {
    const assessment = calculateHeatRisk(baseWeather, baseContext);

    // Rest headline provides proportional guidance, not rigid OSHA compliance claims
    assert.equal(typeof assessment.workRestCycle.headline, 'string');
    assert.ok(assessment.workRestCycle.headline.length > 0);

    // Hydration provides conservative general guidance (1 cup every 15-20 min)
    assert.equal(assessment.hydrationPlan.headline, '1 Cup (~200–250 ml) Every 15–20 Mins');
    assert.match(assessment.hydrationPlan.notes, /do not exceed ~1 to 1.2 liters per hour/i);
  });

  it('evaluates hourly forecast without fabricated radiation or score < 55 thresholds', () => {
    const hourlyData = [
      {
        isoTime: '2026-10-10T07:00',
        temperature: 28.0,
        apparentTemperature: 30.0,
        humidity: 60,
        uvIndex: 2.0,
        windSpeed: 8,
        directRadiation: 150,
      },
      {
        isoTime: '2026-10-10T13:00',
        temperature: 39.0,
        apparentTemperature: 45.0,
        humidity: 50,
        uvIndex: 9.0,
        windSpeed: 10,
        directRadiation: 700,
      },
    ];

    const slots = evaluateTimeSlots(hourlyData, baseContext);
    assert.equal(slots.length, 2);

    // Morning slot (07:00) with apparentTemp 30°C is relatively cooler
    assert.equal(slots[0].isRelativelyCooler, true);
    assert.match(slots[0].slotAdvice, /relatively cooler morning window/i);

    // Afternoon slot (13:00) with apparentTemp 45°C is peak heat
    assert.equal(slots[1].isRelativelyCooler, false);
    assert.equal(slots[1].estimatedRiskTier, 'VERY_HIGH');
    assert.match(slots[1].slotAdvice, /peak forecast heat period/i);
  });

  it('generates concise scannable recommendedAction and topDrivers (2-3 items)', () => {
    const assessment = calculateHeatRisk(baseWeather, baseContext);

    // Single clear recommended next action
    assert.equal(typeof assessment.recommendedAction, 'string');
    assert.ok(assessment.recommendedAction.length > 10);
    assert.match(assessment.recommendedAction, /scheduled shaded recovery pauses/i);

    // Top drivers: exactly 2 to 3 concise prioritized bullets
    assert.ok(Array.isArray(assessment.topDrivers));
    assert.ok(assessment.topDrivers.length >= 2 && assessment.topDrivers.length <= 3);
    assert.ok(assessment.topDrivers.some((d) => d.includes('Atmospheric Burden') || d.includes('Heavy Exertion')));
    assert.ok(assessment.topDrivers.some((d) => d.includes('Direct Sunlight') || d.includes('Heavy Exertion')));
  });

  it('dynamically responds to changes in all work context inputs', () => {
    // 1. Work Intensity sensitivity
    const lightAssessment = calculateHeatRisk(baseWeather, { ...baseContext, intensity: 'light' });
    const heavyAssessment = calculateHeatRisk(baseWeather, { ...baseContext, intensity: 'heavy' });
    const lightMetabolic = lightAssessment.factors.find((f) => f.id === 'metabolic');
    const heavyMetabolic = heavyAssessment.factors.find((f) => f.id === 'metabolic');
    assert.equal(lightMetabolic?.impact, 'low');
    assert.equal(heavyMetabolic?.impact, 'critical');

    // 2. Shade sensitivity
    const fullShadeAssessment = calculateHeatRisk(baseWeather, { ...baseContext, shade: 'ample' });
    const noShadeAssessment = calculateHeatRisk(baseWeather, { ...baseContext, shade: 'none' });
    const fullSolar = fullShadeAssessment.factors.find((f) => f.id === 'solar');
    const noSolar = noShadeAssessment.factors.find((f) => f.id === 'solar');
    assert.equal(fullSolar?.impact, 'low');
    assert.equal(noSolar?.impact, 'high');

    // 3. Water access sensitivity
    const plentyWaterAssessment = calculateHeatRisk(baseWeather, { ...baseContext, water: 'abundant', acclimatization: 'acclimatized', duration: '2h' });
    const scarceWaterAssessment = calculateHeatRisk(baseWeather, { ...baseContext, water: 'scarce' });
    const plentyVuln = plentyWaterAssessment.factors.find((f) => f.id === 'vulnerability');
    const scarceVuln = scarceWaterAssessment.factors.find((f) => f.id === 'vulnerability');
    assert.equal(plentyVuln?.impact, 'moderate');
    assert.equal(scarceVuln?.impact, 'critical');
    // Scarce water should be surfaced in topDrivers
    assert.ok(scarceWaterAssessment.topDrivers.some((d) => d.includes('Water Access: Scarce')));

    // 4. Acclimatization sensitivity
    const acclimatedAssessment = calculateHeatRisk(baseWeather, { ...baseContext, acclimatization: 'acclimatized' });
    const unknownAssessment = calculateHeatRisk(baseWeather, { ...baseContext, acclimatization: 'unknown' });
    assert.match(acclimatedAssessment.acclimatizationRule, /physiological sweat response is active/i);
    assert.match(unknownAssessment.acclimatizationRule, /unacclimatized safety precaution margin/i);
  });

  it('handles empty or sparse forecast time-slot data gracefully', () => {
    // Empty array
    const emptySlots = evaluateTimeSlots([], baseContext);
    assert.deepEqual(emptySlots, []);

    // Sparse data with null solar radiation and varying hours
    const sparseData = [
      {
        isoTime: '2026-10-10T06:00',
        temperature: 26.0,
        apparentTemperature: 28.0,
        humidity: 65,
        uvIndex: null,
        windSpeed: 6.0,
        directRadiation: null,
      },
      {
        isoTime: '2026-10-10T14:00',
        temperature: 41.0,
        apparentTemperature: 46.0,
        humidity: 45,
        uvIndex: 10.0,
        windSpeed: 12.0,
        directRadiation: 750,
      },
    ];

    const slots = evaluateTimeSlots(sparseData, baseContext);
    assert.equal(slots.length, 2);
    assert.equal(slots[0].timeLabel, '6:00 AM');
    assert.equal(slots[0].directRadiation, null);
    assert.equal(slots[0].isRelativelyCooler, true);
    assert.equal(slots[1].timeLabel, '2:00 PM');
    assert.equal(slots[1].directRadiation, 750);
    assert.equal(slots[1].isRelativelyCooler, false);
    assert.equal(slots[1].estimatedRiskTier, 'VERY_HIGH');
  });
});
