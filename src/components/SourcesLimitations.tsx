import React, { useState } from 'react';
import {
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  BookOpen,
  Scale,
} from 'lucide-react';

export const SourcesLimitations: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  return (
    <footer className="chhaon-dashboard-footer" aria-labelledby="methodology-trust-heading">
      <div className="dashboard-footer-compact">
        {/* Top Tag & Title Row */}
        <div className="footer-top-row">
          <div className="footer-tag">
            <ShieldCheck size={14} aria-hidden="true" />
            <span id="methodology-trust-heading">Methodology &amp; Trust</span>
          </div>
          <span className="methodology-microcopy">Sources, assumptions and limitations</span>
        </div>

        {/* Concise Header & Summary Copy */}
        <div className="footer-main-copy">
          <h2 className="footer-heading">Built on evidence. Designed for safer decisions.</h2>
          <p className="footer-summary">
            CHHAON uses weather forecasts and established heat-safety guidance to support outdoor work planning.
            It does not measure on-site WBGT or guarantee safe working conditions.
          </p>
        </div>

        {/* Essential Safety Disclaimer (Always Visible) */}
        <div className="footer-essential-disclaimer" role="note" aria-label="Essential Safety Notice">
          <AlertCircle size={16} aria-hidden="true" className="disclaimer-icon" />
          <div className="disclaimer-text">
            <strong>Operational Planning Notice:</strong> Weather inputs are regional model predictions, not on-site sensor measurements. Microclimates, direct solar load, and unventilated zones can produce hotter local conditions. CHHAON is an operational planning aid and does not substitute for on-site physical WBGT instrumentation, certified safety standards, or professional medical care. No outdoor work condition is guaranteed safe.
          </div>
        </div>

        {/* Action Row: Expand / Collapse Button */}
        <div className="footer-actions-row">
          <button
            type="button"
            className="methodology-toggle-btn"
            onClick={() => setIsExpanded((prev) => !prev)}
            aria-expanded={isExpanded}
            aria-controls="methodology-details-panel"
          >
            <span>{isExpanded ? 'Hide methodology' : 'Learn more about our methodology'}</span>
            {isExpanded ? (
              <ChevronUp size={16} aria-hidden="true" className="toggle-chevron" />
            ) : (
              <ChevronDown size={16} aria-hidden="true" className="toggle-chevron" />
            )}
          </button>
        </div>

        {/* Expandable Detailed Methodology Panel */}
        {isExpanded && (
          <div
            id="methodology-details-panel"
            className="methodology-details-panel"
            role="region"
            aria-labelledby="methodology-trust-heading"
          >
            {/* A. Scientific Integrity & Screening Approach */}
            <div className="methodology-section-block">
              <h3 className="methodology-section-title">
                <BookOpen size={16} aria-hidden="true" style={{ color: 'var(--brand-forest)' }} />
                Scientific Integrity &amp; Screening Approach
              </h3>
              <ul className="methodology-bullets-list">
                <li>
                  <strong>Deterministic, Auditable Evaluation:</strong> CHHAON does not use an unverified proprietary 0–100 score or a black-box machine-learning model. All screening tiers and recommendations are deterministically evaluated from open meteorological data and supervisor-reported worksite factors.
                </li>
                <li>
                  <strong>Felt Temperature in the Shade:</strong> The primary atmospheric baseline uses model-derived apparent temperature (Heat Index in the shade), which factors in ambient temperature, relative humidity, and convective wind speed. Elevated humidity curtails evaporative sweat cooling, substantially compounding physiological thermal strain.
                </li>
                <li>
                  <strong>Worksite Environmental Modifiers:</strong> Beyond ambient weather, CHHAON layers reported physical jobsite parameters: radiant solar heating (adding an estimated ~3°C–5°C effective thermal load under open unshaded skies), metabolic exertion burden (estimating internal muscular heat generation across light, moderate, and heavy labor), and hydration deficit risks.
                </li>
                <li>
                  <strong>Conservative Acclimatization Buffer:</strong> When crew acclimatization status is unconfirmed, CHHAON's protocol conservatively applies an unacclimatized safety precaution margin to protect unadapted personnel from sudden heat exhaustion.
                </li>
              </ul>
            </div>

            {/* B. Authoritative Guidance & Data Sources */}
            <div className="methodology-section-block">
              <h3 className="methodology-section-title">
                <ShieldCheck size={16} aria-hidden="true" style={{ color: 'var(--brand-forest)' }} />
                Authoritative Guidance Frameworks &amp; Data Sources
              </h3>
              <ul className="methodology-bullets-list">
                <li>
                  <strong>National Disaster Management Authority (NDMA), India:</strong> Guidance on Preparation of Action Plan for Prevention and Management of Heat Wave (informing work pacing, cool potable water proximity within 25–50m, shaded rest stations, and emergency heat stroke response protocols).
                </li>
                <li>
                  <strong>NIOSH / U.S. CDC:</strong> <em>Criteria for a Recommended Standard: Occupational Exposure to Heat and Hot Environments</em> (DHHS/NIOSH Publication No. 2016-106) — informing physiological acclimatization schedules (gradual 5-day exposure introduction), 2-person buddy monitoring, and hourly fluid intake limits (~1–1.2 L/h max).
                </li>
                <li>
                  <strong>National Weather Service (NOAA):</strong> Published Heat Index benchmark tiers (&lt;32°C Baseline Vigilance, 32°C–37°C Moderate Caution, 38°C–43°C High Alert, 44°C–51°C Hazardous Alert, ≥52°C Extreme Emergency).
                </li>
                <li>
                  <strong>Open-Meteo:</strong> Open numerical weather prediction (NWP) model APIs providing hourly forecasts for ambient temperature, apparent temperature, relative humidity, convective wind speed, direct normal solar irradiance, and UV index.
                </li>
                <li>
                  <strong>OpenStreetMap:</strong> Open collaborative geospatial and geocoding database for location search and coordinate positioning.
                </li>
                <li className="methodology-citation-note">
                  <em>Note: These authoritative sources provide public scientific frameworks and open data feeds; no cited agency or organization sponsors, certifies, or endorses the CHHAON application.</em>
                </li>
              </ul>
            </div>

            {/* C. Operational & Scientific Limitations */}
            <div className="methodology-section-block">
              <h3 className="methodology-section-title">
                <Scale size={16} aria-hidden="true" style={{ color: 'var(--brand-forest)' }} />
                Operational &amp; Scientific Limitations
              </h3>
              <ul className="methodology-bullets-list">
                <li>
                  <strong>Regional Numerical Model Forecasts:</strong> Meteorological inputs originate from regional numerical weather prediction model grids, not physical sensors deployed at the specific jobsite. Microclimates—such as dark asphalt paving, tin/metal roofing, masonry enclosures, or deep unventilated trenches—can trap heat and generate localized temperatures significantly higher than regional forecasts.
                </li>
                <li>
                  <strong>No Physical On-Site WBGT Measurement:</strong> Certified occupational compliance standards (e.g. ISO 7243, ACGIH Threshold Limit Values) require calibrated on-site physical instruments measuring natural wet-bulb, dry-bulb, and black-globe temperatures. CHHAON does not measure on-site outdoor WBGT and does not certify statutory compliance.
                </li>
                <li>
                  <strong>Comparative Planning Guidance:</strong> Rest pauses, hydration intervals, and work-window comparisons represent comparative operational planning guidance. They are not individualized clinical prescriptions and do not account for individual chronic medical conditions, medications, or personal physiological vulnerability.
                </li>
                <li>
                  <strong>No Condition Is Definitively &ldquo;Safe&rdquo;:</strong> CHHAON does not label any period or condition as &ldquo;safe&rdquo;. Even during baseline conditions, strenuous physical labor, direct sunlight, dehydration, or unacclimatized crew can trigger rapid heat illness.
                </li>
                <li>
                  <strong>Deterministic Logic:</strong> Screening classifications are fully deterministic, directly reflecting current model forecast parameters and user selections without machine-learning hallucinations.
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </footer>
  );
};
