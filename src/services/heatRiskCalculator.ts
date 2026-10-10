import type {
  CurrentWeather,
  WorkContext,
  AssessmentResult,
  RiskFactor,
  RiskTier,
  WorkRestCycle,
  HydrationPlan,
  TimeSlotForecast,
} from '../types';

/**
 * Calculates an explainable, transparent Environmental Heat Screening Assessment.
 * Grounded in published Heat Index benchmarks (NOAA/NWS & NDMA Heat Action Plan frameworks).
 *
 * NOTE: This is an environmental planning aid based on regional numerical model forecasts
 * and user-reported worksite context. It is NOT a clinical diagnosis, certified on-site
 * physical WBGT measurement, or statutory compliance guarantee. No outdoor condition is labeled "safe".
 */
export function calculateHeatRisk(weather: CurrentWeather, context: WorkContext): AssessmentResult {
  const { temperature, humidity, apparentTemperature, directRadiation, windSpeed } = weather;
  const { intensity, duration, shade, water, acclimatization } = context;

  if (
    typeof temperature !== 'number' ||
    typeof apparentTemperature !== 'number' ||
    typeof humidity !== 'number' ||
    typeof windSpeed !== 'number'
  ) {
    throw new Error('Incomplete weather data: Cannot calculate heat screening without essential atmospheric parameters.');
  }

  // 1. Environmental Screening Tier based on Apparent Temperature (Heat Index in shade)
  // Categories informed by NOAA/NWS Heat Index & India NDMA Heat Action Plan guidelines
  let tier: RiskTier = 'LOW';
  let tierLabel = 'Baseline Heat Vigilance';
  let tierHindi = 'सतर्कता आवश्यक';
  let color = 'var(--risk-low)';
  let baseSummary = '';

  if (apparentTemperature >= 52) {
    tier = 'EXTREME';
    tierLabel = 'Extreme Heat Emergency';
    tierHindi = 'अत्यधिक ऊष्मा आपात';
    color = 'var(--risk-extreme)';
    baseSummary =
      'Extreme environmental heat emergency (Heat Index ≥52°C). High risk of rapid heat stroke and physical collapse. Stand down non-essential outdoor physical labor. Mandate continuous shaded rest for emergency operations.';
  } else if (apparentTemperature >= 44) {
    tier = 'VERY_HIGH';
    tierLabel = 'Hazardous Heat Stress Alert';
    tierHindi = 'गंभीर ऊष्मा संकट';
    color = 'var(--risk-very-high)';
    baseSummary =
      'Hazardous environmental heat burden (Heat Index 44°C–51°C). Severe risk of heat exhaustion and heat stroke under continuous physical labor. Shift heavy physical tasks to cooler hours; enforce frequent shaded recovery and active cooling.';
  } else if (apparentTemperature >= 38) {
    tier = 'HIGH';
    tierLabel = 'High Heat Stress Alert';
    tierHindi = 'उच्च ऊष्मा तनाव';
    color = 'var(--risk-high)';
    baseSummary =
      'Elevated environmental heat stress (Heat Index 38°C–43°C). Heat illness is likely with prolonged outdoor activity. Enforce scheduled shaded pauses, active hydration, and buddy monitoring.';
  } else if (apparentTemperature >= 32) {
    tier = 'MODERATE';
    tierLabel = 'Moderate Heat Caution';
    tierHindi = 'मध्यम ऊष्मा सतर्कता';
    color = 'var(--risk-mod)';
    baseSummary =
      'Moderate environmental heat load (Heat Index 32°C–37°C). Physical fatigue and heat cramps possible during prolonged exertion or direct sunlight. Provide routine cool water access and scheduled shaded pauses.';
  } else {
    tier = 'LOW';
    tierLabel = 'Baseline Heat Vigilance';
    tierHindi = 'सतर्कता आवश्यक';
    color = 'var(--risk-low)';
    baseSummary =
      'Baseline environmental heat conditions (Heat Index <32°C). Note: No outdoor work conditions are entirely safe from heat illness. Strenuous physical exertion, direct sun, or unacclimatized personnel still generate significant internal heat burden.';
  }

  // Add contextual site notes to summary
  const summaryAdditions: string[] = [];
  if (intensity === 'heavy') {
    summaryAdditions.push('Heavy physical workload (>350 W) significantly accelerates internal metabolic core heating.');
  }
  if (shade === 'none') {
    summaryAdditions.push('Zero canopy shade exposes crew to direct radiant solar heat, increasing effective thermal burden by ~3°C to 5°C above shaded Heat Index.');
  }
  if (acclimatization === 'unknown') {
    summaryAdditions.push('Worker acclimatization status is unconfirmed; safety protocol requires applying an unacclimatized precaution margin.');
  } else if (acclimatization === 'unacclimatized') {
    summaryAdditions.push('Unacclimatized personnel have reduced sweating efficiency and elevated cardiovascular strain.');
  }
  if (water === 'scarce') {
    summaryAdditions.push('Scarce drinking water access poses critical dehydration hazard.');
  }

  const fullSummary = summaryAdditions.length > 0 ? `${baseSummary} ${summaryAdditions.join(' ')}` : baseSummary;

  // 2. Contributing Factors Breakdown (Clearly separating API model variables from user site context)
  const factors: RiskFactor[] = [
    {
      id: 'atmospheric',
      label: 'Atmospheric Heat Burden',
      category: 'atmospheric',
      impact: apparentTemperature >= 44 ? 'critical' : apparentTemperature >= 38 ? 'high' : apparentTemperature >= 32 ? 'moderate' : 'low',
      sourceType: 'API Model Forecast',
      explanation: `Forecast ambient temperature of ${temperature}°C with ${humidity}% relative humidity yields a felt Heat Index of ${apparentTemperature}°C in the shade. High humidity restricts sweat evaporation.`,
      remedy: `Monitor ambient breeze. Forecast convective wind speed is ${windSpeed} km/h. Provide ventilated recovery areas.`,
    },
    {
      id: 'solar',
      label: 'Solar Exposure & Canopy Status',
      category: 'solar',
      impact: shade === 'none' ? 'high' : shade === 'partial' ? 'moderate' : 'low',
      sourceType: 'User Worksite Context',
      explanation:
        shade === 'none'
          ? `Direct overhead sunlight with zero canopy cover heats tools and workers up to 4°C above ambient air.${directRadiation !== null ? ` Forecast direct normal irradiance is ~${directRadiation} W/m² (DNI).` : ' Direct irradiance is unavailable from forecast model.'}`
          : shade === 'partial'
          ? 'Intermittent shade provides temporary relief, but unshaded intervals still expose workers to direct solar heating.'
          : 'Continuous canopy shade effectively mitigates direct radiant infrared load from the sun.',
      remedy:
        shade === 'none'
          ? 'Erect portable shamiana or tarpaulin shelter over active labor zones immediately.'
          : shade === 'partial'
          ? 'Rotate high-intensity operations into full-shade zones periodically.'
          : 'Ensure sidewalls remain open to allow natural cross-ventilation under the canopy.',
    },
    {
      id: 'metabolic',
      label: 'Metabolic Exertion Burden',
      category: 'metabolic',
      impact: intensity === 'heavy' ? 'critical' : intensity === 'moderate' ? 'high' : 'low',
      sourceType: 'User Worksite Context',
      explanation:
        intensity === 'heavy'
          ? 'Heavy physical labor (concrete hauling, excavation, roofing) generates intense internal muscular heat (>350 W) that rapidly elevates core body temperature.'
          : intensity === 'moderate'
          ? 'Moderate physical exertion (masonry, plastering, carpentry) generates steady metabolic heat (~200–350 W).'
          : 'Light physical tasks (supervision, machine operation, surveying) generate lower internal muscular heat (~150–200 W).',
      remedy:
        intensity === 'heavy'
          ? 'Reschedule heavy physical tasks to cooler early morning hours (06:00–09:00 AM) or split shifts.'
          : intensity === 'moderate'
          ? 'Pace continuous exertion and enforce scheduled shaded rest breaks.'
          : 'Maintain routine hydration breaks and monitor individual worker comfort.',
    },
    {
      id: 'vulnerability',
      label: 'Hydration Access & Acclimatization',
      category: 'vulnerability',
      impact:
        water === 'scarce' || acclimatization === 'unacclimatized'
          ? 'critical'
          : acclimatization === 'unknown' || water === 'limited' || duration === '8h+'
          ? 'high'
          : 'moderate',
      sourceType: 'User Worksite Context',
      explanation:
        `Shift duration: ${duration}. Water access: ${water}. Acclimatization status: ${acclimatization}. ` +
        (acclimatization === 'unknown'
          ? 'Worker acclimatization is unconfirmed; safety protocol treats crew conservatively as unacclimatized.'
          : acclimatization === 'unacclimatized'
          ? 'Unacclimatized crew lack physiological sweating adaptations and face elevated risk of rapid heat exhaustion.'
          : acclimatization === 'partial'
          ? 'Partially adapted crew (3–6 days); cardiovascular strain is still elevated during peak heat.'
          : 'Acclimatized crew (>7–14 days in hot weather); sweat mechanisms are conditioned, but continuous hydration remains essential.'),
      remedy:
        water !== 'abundant'
          ? 'Establish a dedicated cool potable water station within 25–50 meters of all workers immediately.'
          : 'Maintain buddy-system monitoring and enforce periodic water checks.',
    },
  ];

  // 3. Conservative General Rest & Recovery Guidance
  let workRestCycle: WorkRestCycle;
  if (tier === 'EXTREME' || tier === 'VERY_HIGH') {
    workRestCycle = {
      headline: 'Frequent Shaded Recovery Breaks',
      conditionDescription:
        'Advisory guidance: Curtail continuous heavy exertion. Reschedule strenuous outdoor tasks to cooler hours. Mandate frequent shaded rest pauses with active ventilation or cooling fans.',
    };
  } else if (tier === 'HIGH') {
    workRestCycle = {
      headline: 'Scheduled Shaded Recovery Pauses',
      conditionDescription:
        'Advisory guidance: Increase shaded recovery frequency. Rotate workers out of direct sun and strenuous tasks before thermal fatigue develops. Provide cool shaded rest areas.',
    };
  } else if (tier === 'MODERATE') {
    workRestCycle = {
      headline: 'Regular Shaded Recovery Pauses',
      conditionDescription:
        'Advisory guidance: Provide scheduled shaded pauses throughout each hour. Encourage workers to cool down in ventilated canopies and monitor fatigue.',
    };
  } else {
    workRestCycle = {
      headline: 'Routine Scheduled Breaks',
      conditionDescription:
        'Baseline precaution: Maintain routine shaded rest pauses. Adjust pacing according to task physical exertion, sun exposure, and individual worker fatigue.',
    };
  }

  // 4. Conservative Hydration Guidance (Informed by NIOSH Criteria Document Pub. No. 2016-106 & NDMA guidelines)
  const electrolytesRecommended =
    apparentTemperature >= 35 || intensity === 'heavy' || duration === '6h' || duration === '8h+';

  const hydrationPlan: HydrationPlan = {
    headline: '1 Cup (~200–250 ml) Every 15–20 Mins',
    drinkingIntervalMinutes: apparentTemperature >= 38 ? 15 : 20,
    electrolytesRecommended,
    notes:
      'Advisory guidance informed by NIOSH & NDMA: Encourage frequent small drinks rather than large infrequent gulps. Supply cool potable water within 25–50m. For extended strenuous shifts with profuse sweating, provide ORS or lemon-salt solution. Do not exceed ~1 to 1.2 liters per hour to prevent overhydration.',
  };

  // 5. Practical PPE & Cooling Controls
  const ppeCoolingActions: string[] = [
    'Lightweight, light-colored, breathable cotton clothing to shield skin without trapping sweat.',
    'Hard hat brim neck-shades (safetex nape flap) to shield neck and head from direct sunlight.',
    'Potable water and wash stations accessible at muster points for facial and neck cooling.',
  ];

  if (tier === 'HIGH' || tier === 'VERY_HIGH' || tier === 'EXTREME') {
    ppeCoolingActions.push('Misting fans or evaporative desert coolers deployed inside worker rest canopies.');
    ppeCoolingActions.push('Designate dedicated "Safety Buddy" pairs to check for stumbling, confusion, pale skin, or ceased sweating.');
  }

  // Acclimatization rule text
  let acclimRuleText = '';
  if (acclimatization === 'unknown') {
    acclimRuleText =
      'Worker acclimatization status is unconfirmed: Safety protocol requires applying an unacclimatized safety precaution margin. Pace crew at reduced intensity and implement buddy monitoring.';
  } else if (acclimatization === 'unacclimatized') {
    acclimRuleText =
      'Unacclimatized crew require gradual workload introduction (e.g. 20% work intensity increase per day over 5 days) to build cardiovascular and sweating tolerance.';
  } else if (acclimatization === 'partial') {
    acclimRuleText =
      'Crew has 3–6 days on site; cardiovascular adaptations are underway but incomplete. Monitor for early fatigue.';
  } else {
    acclimRuleText =
      'Crew has >7–14 days continuous heat exposure; physiological sweat response is active. Maintain regular hydration and scheduled shaded rest.';
  }

  // 6. Supervisor Toolbox Talk Briefing Notes
  const supervisorNotes: string[] = [
    `Screening Alert: Current forecast Heat Index is ~${apparentTemperature}°C in the shade. Microclimates (e.g. unshaded metal, fresh asphalt) may be hotter.`,
    `Recovery: ${workRestCycle.headline}. Rest periods must take place in ventilated, completely shaded shelters.`,
    `Hydration: Encourage small, frequent drinks (~1 cup / 200–250 ml every 15–20 min). Maintain shaded drinking points.`,
    'Emergency First-Aid: Heat stroke is a medical emergency. If any worker exhibits confusion, slurred speech, delirium, hot red skin, or loss of consciousness, move to shade immediately, douse with cool water/fan vigorously, and call 108 / 112 emergency services.',
    'Planning Aid Disclaimer: CHHAON is an environmental screening tool for operational planning. It does not provide medical advice or substitute for on-site physical WBGT instrumentation and official local heat alerts.',
  ];

  // 1b. Recommended Single Next Action for Supervisors
  let recommendedAction = '';
  if (tier === 'EXTREME') {
    recommendedAction =
      'Stand down outdoor physical work immediately. Move all personnel to shaded cooling shelters with emergency hydration.';
  } else if (tier === 'VERY_HIGH') {
    recommendedAction =
      'Reschedule heavy physical tasks to cooler morning hours (06:00–09:00 AM) or night shifts; mandate frequent shaded breaks and active cooling.';
  } else if (tier === 'HIGH') {
    recommendedAction =
      'Enforce scheduled shaded recovery pauses every hour and 2-person buddy monitoring; position cool potable water within 25 meters.';
  } else if (tier === 'MODERATE') {
    recommendedAction =
      'Provide regular shaded recovery pauses and encourage workers to drink ~1 cup of cool water every 20 minutes before thirst develops.';
  } else {
    recommendedAction =
      'Maintain routine hydration access and standard heat vigilance; adjust pacing for heavy physical tasks under direct sunlight.';
  }

  // 1c. Select top 2-3 most important contributing risk drivers
  const driverCandidates: { priority: number; text: string }[] = [];

  // Atmospheric driver
  driverCandidates.push({
    priority: apparentTemperature >= 44 ? 1 : apparentTemperature >= 38 ? 2 : apparentTemperature >= 32 ? 3 : 5,
    text: `Atmospheric Burden: Felt Heat Index ${apparentTemperature}°C (${humidity}% humidity limits sweat cooling).`,
  });

  // Solar driver
  if (shade === 'none') {
    driverCandidates.push({
      priority: 2,
      text: 'Direct Sunlight: Zero canopy cover adds ~3°C–5°C radiant infrared heat to skin and tools.',
    });
  } else if (shade === 'partial') {
    driverCandidates.push({
      priority: 4,
      text: 'Intermittent Canopy: Periodic direct sun bursts still elevate thermal burden during active labor.',
    });
  }

  // Metabolic driver
  if (intensity === 'heavy') {
    driverCandidates.push({
      priority: 1,
      text: 'Heavy Exertion: Physical workload (>350 W) rapidly generates internal muscular heat.',
    });
  } else if (intensity === 'moderate') {
    driverCandidates.push({
      priority: 3,
      text: 'Moderate Exertion: Continuous tasks generate steady internal body heat (~200–350 W).',
    });
  }

  // Vulnerability driver
  if (water === 'scarce') {
    driverCandidates.push({
      priority: 1,
      text: 'Water Access: Scarce drinking water access poses critical dehydration hazard.',
    });
  } else if (acclimatization === 'unknown') {
    driverCandidates.push({
      priority: 2,
      text: 'Acclimatization: Worker status is unconfirmed; mandatory safety precaution margin applied.',
    });
  } else if (acclimatization === 'unacclimatized') {
    driverCandidates.push({
      priority: 2,
      text: 'Unacclimatized Crew: Personnel lack physiological sweating adaptations and tire quickly.',
    });
  } else if (water === 'limited') {
    driverCandidates.push({
      priority: 4,
      text: 'Water Access: Periodic refilling required to maintain adequate fluid balance.',
    });
  }

  driverCandidates.sort((a, b) => a.priority - b.priority);
  const topDrivers = driverCandidates.slice(0, 3).map((d) => d.text);

  return {
    heatIndex: apparentTemperature,
    tier,
    tierLabel,
    tierHindi,
    color,
    summary: fullSummary,
    recommendedAction,
    topDrivers,
    factors,
    workRestCycle,
    hydrationPlan,
    ppeCoolingActions,
    acclimatizationRule: acclimRuleText,
    supervisorNotes,
    calculatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    dataSourceInfo: weather.dataSource,
    disclaimer:
      'Screening advisory based on numerical weather forecast & reported site conditions; not an on-site physical WBGT instrument measurement or clinical diagnostic.',
  };
}

/**
 * Compares hourly forecast time-slots transparently based on actual forecast fields.
 * Identifies relatively cooler operational windows as possible alternatives, NEVER guaranteeing "safe" conditions.
 */
export function evaluateTimeSlots(
  hourlyData: Array<{
    isoTime: string;
    temperature: number;
    apparentTemperature: number;
    humidity: number;
    uvIndex: number | null;
    windSpeed: number;
    directRadiation?: number | null;
  }>,
  _context: WorkContext
): TimeSlotForecast[] {
  if (!hourlyData || hourlyData.length === 0) return [];

  return hourlyData.slice(0, 14).map((slot) => {
    // Parse hour from ISO string without UTC drift
    const timeParts = slot.isoTime.split('T')[1]?.split(':') || ['00', '00'];
    const hour = parseInt(timeParts[0], 10);
    const minute = timeParts[1] || '00';
    const hour12 = hour % 12 || 12;
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const timeLabel = `${hour12}:${minute} ${ampm}`;

    // Determine screening tier from slot apparent temperature
    let tier: RiskTier = 'LOW';
    if (slot.apparentTemperature >= 52) {
      tier = 'EXTREME';
    } else if (slot.apparentTemperature >= 44) {
      tier = 'VERY_HIGH';
    } else if (slot.apparentTemperature >= 38) {
      tier = 'HIGH';
    } else if (slot.apparentTemperature >= 32) {
      tier = 'MODERATE';
    } else {
      tier = 'LOW';
    }

    // Determine whether this slot is relatively cooler compared to peak midday hours
    const isRelativelyCooler =
      slot.apparentTemperature < 35 && (hour <= 9 || hour >= 17)
        ? true
        : slot.apparentTemperature < 32;

    let advice = '';
    if (hour >= 5 && hour <= 9) {
      advice = 'Relatively cooler morning window: potential opportunity for scheduling more demanding tasks before peak heat, with ongoing hydration.';
    } else if (hour >= 11 && hour <= 15) {
      advice = 'Peak forecast heat period: highest solar radiant and atmospheric burden; avoid continuous heavy exertion and maximize shaded rest.';
    } else if (hour >= 16 && hour <= 19) {
      advice = 'Late afternoon window: decreasing solar burden; maintain hydration and ongoing heat precautions.';
    } else {
      advice = isRelativelyCooler
        ? 'Relatively lower ambient temperature window: potential alternative shift period with standard precautions.'
        : 'Elevated thermal burden: pace physical labor and enforce rest intervals.';
    }

    return {
      timeLabel,
      isoTime: slot.isoTime,
      temperature: slot.temperature,
      apparentTemperature: slot.apparentTemperature,
      humidity: slot.humidity,
      uvIndex: slot.uvIndex,
      windSpeed: slot.windSpeed,
      directRadiation: slot.directRadiation ?? null,
      estimatedRiskTier: tier,
      isRelativelyCooler,
      isWorkRecommended: isRelativelyCooler, // Alias for backward compatibility
      slotAdvice: advice,
    };
  });
}
