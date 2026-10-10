import React from 'react';
import {
  Thermometer,
  CloudSun,
  Droplets,
  Wind,
  SunMedium,
  AlertTriangle,
  MapPin,
  RefreshCw,
  Info,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';
import type {
  CurrentWeather,
  AssessmentResult,
  GeoLocation,
} from '../types';

interface AssessmentResultsProps {
  selectedLocation: GeoLocation | null;
  weather: CurrentWeather | null;
  assessment: AssessmentResult | null;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  weatherIsStale?: boolean;
}

export const AssessmentResults: React.FC<AssessmentResultsProps> = ({
  selectedLocation,
  weather,
  assessment,
  isLoading,
  error,
  onRetry,
  weatherIsStale,
}) => {
  // 1. Honest Empty State: Location not selected yet
  if (!selectedLocation) {
    return (
      <section className="chhaon-card" aria-label="Assessment Status">
        <div className="assessment-empty-state">
          <div className="empty-state-icon-circle" aria-hidden="true">
            <MapPin size={32} />
          </div>
          <h2 className="empty-state-title">No Worksite Selected Yet</h2>
          <p className="empty-state-description">
            CHHAON provides location-specific weather information and practical, source-informed heat-safety guidance. To generate a screening evaluation:
          </p>
          <div className="empty-state-steps">
            <div className="empty-step-item">
              <span className="empty-step-number">1</span>
              <span><strong>Choose Location:</strong> Click anywhere on the map of India or select a city shortcut above to fetch local numerical weather model data.</span>
            </div>
            <div className="empty-step-item">
              <span className="empty-step-number">2</span>
              <span><strong>Specify Work Context:</strong> Enter estimated physical workload, outdoor exposure duration, shade availability, and crew heat adaptation status (acclimatization).</span>
            </div>
            <div className="empty-step-item">
              <span className="empty-step-number">3</span>
              <span><strong>Review Safety Guidance:</strong> Review source-informed advisory work-rest guidance, hydration practices, and operational shift recommendations.</span>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // 2. Loading State
  if (isLoading) {
    return (
      <section className="chhaon-card" aria-label="Loading Assessment">
        <div className="loading-box">
          <RefreshCw size={36} className="spinner-icon" />
          <h2 style={{ fontSize: '1.15rem', fontWeight: 600 }}>
            Fetching Live Weather for {selectedLocation.displayName}...
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Retrieving ambient temperature, humidity, wind, and solar radiation from Open-Meteo.
          </p>
        </div>
      </section>
    );
  }

  // 3. Error State
  if (error || !weather || !assessment) {
    return (
      <section className="chhaon-card" aria-label="Assessment Error">
        <div className="assessment-empty-state" style={{ borderColor: 'var(--brand-terracotta)' }}>
          <div
            className="empty-state-icon-circle"
            style={{ backgroundColor: 'var(--brand-terracotta-light)', color: 'var(--brand-terracotta)' }}
          >
            <AlertTriangle size={32} />
          </div>
          <h2 className="empty-state-title">Unable to Retrieve Live Meteorology</h2>
          <p className="empty-state-description">
            {error || 'An error occurred while connecting to the open meteorological service.'}
          </p>
          <button
            type="button"
            className="toolbox-muster-btn"
            onClick={onRetry}
            style={{ marginTop: '8px' }}
          >
            <RefreshCw size={16} />
            <span>Try Again</span>
          </button>
        </div>
      </section>
    );
  }

  // 4. Live Results View
  return (
    <section className="chhaon-card" aria-labelledby="assessment-heading">
      <div className="card-header">
        <div className="card-title-group">
          <span className="card-title-icon" aria-hidden="true">
            <Thermometer size={20} />
          </span>
          <h2 id="assessment-heading" className="card-title">
            Heat-Risk Screening Assessment
          </h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="card-badge" style={{ backgroundColor: 'var(--bg-surface-soft)' }}>
            Updated {assessment.calculatedAt}
          </span>
        </div>
      </div>

      {/* Stale Forecast Warning Banner */}
      {weatherIsStale && (
        <div className="stale-weather-banner" role="alert">
          <AlertTriangle size={16} style={{ color: 'var(--brand-amber)', flexShrink: 0 }} />
          <span>
            <strong>Forecast may be stale:</strong> Re-fetching live weather failed. Retaining previous forecast data from {weather.timestamp}.
          </span>
        </div>
      )}


      {/* Real-time Weather Metrics Bar */}
      <div className="weather-metrics-strip" aria-label="Current Weather Conditions">
        <div className="weather-metric-tile">
          <span className="metric-tile-label">
            <Thermometer size={14} style={{ color: 'var(--brand-terracotta)' }} />
            Air Temp
          </span>
          <span className="metric-tile-value">{weather.temperature}°C</span>
          <span className="metric-tile-sub">{weather.weatherDescription}</span>
        </div>

        <div className="weather-metric-tile">
          <span className="metric-tile-label">
            <CloudSun size={14} style={{ color: 'var(--brand-amber)' }} />
            Felt Temp (HI)
          </span>
          <span className="metric-tile-value">{weather.apparentTemperature}°C</span>
          <span className="metric-tile-sub">Heat Index (Shade model)</span>
        </div>

        <div className="weather-metric-tile">
          <span className="metric-tile-label">
            <Droplets size={14} style={{ color: '#3182CE' }} />
            Humidity
          </span>
          <span className="metric-tile-value">{weather.humidity}%</span>
          <span className="metric-tile-sub">Evaporation limiter</span>
        </div>

        <div
          className="weather-metric-tile"
          title={
            typeof weather.uvIndex === 'number' && !Number.isNaN(weather.uvIndex)
              ? `Solar UV Index: ${weather.uvIndex}${weather.uvIndex === 0 ? ' (Nighttime / zero solar irradiance)' : ' (Daytime solar burden)'} at ${weather.timestamp}`
              : `Solar UV Index observation unavailable from weather forecast provider for ${weather.timestamp}`
          }
        >
          <span className="metric-tile-label">
            <SunMedium size={14} style={{ color: '#D69E2E' }} />
            UV & Solar
          </span>
          <span className="metric-tile-value">
            {typeof weather.uvIndex === 'number' && !Number.isNaN(weather.uvIndex)
              ? `UV ${weather.uvIndex}`
              : 'Unavailable'}
          </span>
          <span className="metric-tile-sub">
            {typeof weather.directRadiation === 'number' && !Number.isNaN(weather.directRadiation)
              ? `${weather.directRadiation} W/m² (DNI)`
              : 'Irradiance Unavailable'}
          </span>
          {import.meta.env.DEV && (weather.uvIndex === null || weather.uvIndex === undefined) && (
            <span style={{ fontSize: '0.66rem', color: 'var(--brand-amber)', marginTop: '2px' }}>
              [dev: UV missing in provider response]
            </span>
          )}
        </div>

        <div className="weather-metric-tile">
          <span className="metric-tile-label">
            <Wind size={14} style={{ color: 'var(--brand-sage)' }} />
            Wind Speed
          </span>
          <span className="metric-tile-value">{weather.windSpeed} km/h</span>
          <span className="metric-tile-sub">Convective airflow</span>
        </div>
      </div>

      {/* Model Forecast Provenance & Timestamp Bar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          alignItems: 'center',
          fontSize: '0.76rem',
          color: 'var(--text-muted)',
          marginBottom: '14px',
          padding: '6px 12px',
          backgroundColor: 'var(--bg-surface-soft)',
          borderRadius: 'var(--radius-sm)',
        }}
      >
        <span><strong>Forecast Source:</strong> {weather.dataSource}</span>
        <span>•</span>
        <span><strong>Model Timestamp:</strong> {weather.timestamp} {weather.timezone ? `(${weather.timezone})` : ''}</span>
        <span>•</span>
        <span>Regional grid model forecast (not an on-site physical sensor observation)</span>
      </div>

      {/* Master Heat Risk Screening Card (Scannable Layout) */}
      <div
        className="risk-master-card"
        style={{ ['--risk-color' as any]: assessment.color }}
        aria-live="polite"
      >
        <div
          className="risk-dial-wrapper"
          title={`Heat Index: ${weather.apparentTemperature}°C (Shade model)`}
        >
          <span className="risk-dial-score">{weather.apparentTemperature}°</span>
          <span className="risk-dial-max">Heat Index</span>
        </div>

        <div className="risk-summary-content">
          <div className="risk-tier-badges">
            <span className="risk-tier-badge">{assessment.tierLabel}</span>
            <span className="risk-hindi-badge">({assessment.tierHindi})</span>
          </div>

          {/* Scannable Reading Snapshot */}
          <div className="risk-reading-snapshot">
            <span>Air: <strong>{weather.temperature}°C</strong></span>
            <span>•</span>
            <span>Felt: <strong>{weather.apparentTemperature}°C</strong></span>
            <span>•</span>
            <span>Humidity: <strong>{weather.humidity}%</strong></span>
            <span>•</span>
            <span>Wind: <strong>{weather.windSpeed} km/h</strong></span>
          </div>

          {/* Prioritized Single Clear Recommended Next Action */}
          <div className="scannable-action-callout">
            <div className="action-callout-header">
              <CheckCircle2 size={16} style={{ color: 'var(--brand-forest)', flexShrink: 0 }} />
              <strong>Recommended Next Action:</strong>
            </div>
            <p className="action-callout-text">{assessment.recommendedAction}</p>
          </div>

          {/* Top 2-3 Contributing Risk Drivers (Concise Bullets) */}
          <div className="scannable-top-drivers">
            <span className="top-drivers-heading">Primary Risk Drivers:</span>
            <ul className="top-drivers-bullets">
              {assessment.topDrivers.map((driver, idx) => (
                <li key={idx}>{driver}</li>
              ))}
            </ul>
          </div>

          {/* Progressive Disclosure: Why this screening result? */}
          <details className="why-result-disclosure">
            <summary className="disclosure-summary">
              <HelpCircle size={15} style={{ color: 'var(--brand-forest)' }} />
              <span>Why this screening result? (Methodology & Model Notes)</span>
            </summary>
            <div className="disclosure-body">
              <p>{assessment.summary}</p>
              <div className="disclosure-meta">
                <span>Environmental Screening Metric: <strong>Heat Index {weather.apparentTemperature}°C</strong> (Shade model)</span>
                {' • '}
                <span>{selectedLocation.displayName}</span>
              </div>
              <p className="disclosure-disclaimer">{assessment.disclaimer}</p>
            </div>
          </details>
        </div>
      </div>

      {/* Explainable Factor Breakdown (Scannable Cards) */}
      <h3 className="factors-section-title">
        <Info size={16} aria-hidden="true" style={{ color: 'var(--brand-forest)' }} />
        Explainable Risk Drivers & Contributing Factors
      </h3>

      <div className="factors-grid">
        {assessment.factors.map((factor) => (
          <div key={factor.id} className="factor-card">
            <div className="factor-card-top">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span className="factor-name">{factor.label}</span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  {factor.sourceType}
                </span>
              </div>
              <span className={`factor-impact-pill factor-impact-${factor.impact}`}>
                {factor.impact}
              </span>
            </div>
            <p className="factor-explanation">{factor.explanation}</p>
            <div className="factor-remedy">
              <strong>Site Action:</strong> {factor.remedy}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
