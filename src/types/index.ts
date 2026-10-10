export type ThemeMode = 'system' | 'light' | 'dark';

export type WorkIntensity = 'light' | 'moderate' | 'heavy';
export type ExposureDuration = '1h' | '2h' | '4h' | '6h' | '8h+';
export type ShadeAvailability = 'none' | 'partial' | 'ample';
export type WaterAvailability = 'abundant' | 'limited' | 'scarce';
export type AcclimatizationStatus = 'acclimatized' | 'partial' | 'unacclimatized' | 'unknown';

export interface WorkContext {
  intensity: WorkIntensity;
  duration: ExposureDuration;
  shade: ShadeAvailability;
  water: WaterAvailability;
  acclimatization: AcclimatizationStatus;
}

export type LocationMatchType = 'exact' | 'locality' | 'manual' | 'hub';

export interface GeoLocation {
  lat: number;
  lng: number;
  displayName: string;
  fullAddress?: string;
  district?: string;
  state?: string;
  matchType?: LocationMatchType;
  originalQuery?: string;
  isManualSelection?: boolean;
}

export interface CurrentWeather {
  temperature: number; // °C
  apparentTemperature: number; // °C (Heat Index / felt temperature in shade)
  humidity: number; // %
  windSpeed: number; // km/h
  uvIndex: number | null;
  weatherCode: number;
  weatherDescription: string;
  directRadiation: number | null; // W/m² (Direct Normal Irradiance from API, or null if unavailable)
  timestamp: string; // Weather model forecast timestamp
  timezone?: string;
  utcOffsetSeconds?: number;
  dataSource: string; // e.g. "Open-Meteo Numerical Weather Prediction Model"
  isModelForecast: boolean;
}

export type RiskTier = 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH' | 'EXTREME';

export interface RiskFactor {
  id: string;
  label: string;
  category: 'atmospheric' | 'solar' | 'metabolic' | 'vulnerability';
  impact: 'low' | 'moderate' | 'high' | 'critical';
  sourceType: 'API Model Forecast' | 'User Worksite Context';
  explanation: string;
  remedy: string;
}

export interface WorkRestCycle {
  headline: string;
  conditionDescription: string;
  workMinutes?: number;
  restMinutes?: number;
}

export interface HydrationPlan {
  headline: string;
  drinkingIntervalMinutes: number;
  electrolytesRecommended: boolean;
  notes: string;
  millilitersPerHour?: number;
}

export interface AssessmentResult {
  heatIndex: number; // °C (Apparent Temperature / Heat Index)
  tier: RiskTier;
  tierLabel: string;
  tierHindi: string;
  color: string;
  summary: string;
  recommendedAction: string; // Prioritized single clear recommended next action
  topDrivers: string[]; // 2-3 most important contributing risk factors
  factors: RiskFactor[];
  workRestCycle: WorkRestCycle;
  hydrationPlan: HydrationPlan;
  ppeCoolingActions: string[];
  acclimatizationRule: string;
  supervisorNotes: string[];
  calculatedAt: string;
  dataSourceInfo: string;
  disclaimer: string;
  score?: number; // Maintained optionally for backwards compatibility if needed
  estimatedWbgt?: number; // Deprecated/removed from UI display
}

export interface TimeSlotForecast {
  timeLabel: string;
  isoTime: string;
  temperature: number;
  apparentTemperature: number;
  humidity: number;
  uvIndex: number | null;
  windSpeed: number;
  directRadiation: number | null;
  estimatedRiskTier: RiskTier;
  isRelativelyCooler: boolean;
  isWorkRecommended: boolean; // Backwards compatibility alias for isRelativelyCooler
  slotAdvice: string;
}
