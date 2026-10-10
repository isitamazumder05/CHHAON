import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  FileText,
  Printer,
  Copy,
  Check,
  X,
  AlertTriangle,
  Clock,
  Droplets,
  Umbrella,
  Users,
} from 'lucide-react';
import type { AssessmentResult, GeoLocation, CurrentWeather, WorkContext } from '../types';

interface SafetyActionPlanProps {
  assessment: AssessmentResult | null;
  location: GeoLocation | null;
  weather?: CurrentWeather | null;
  workContext?: WorkContext | null;
}

export const SafetyActionPlan: React.FC<SafetyActionPlanProps> = ({
  assessment,
  location,
  weather,
  workContext,
}) => {
  const [showReportModal, setShowReportModal] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [generatedDate, setGeneratedDate] = useState<string>('');

  useEffect(() => {
    if (showReportModal) {
      setGeneratedDate(
        new Date().toLocaleString(undefined, {
          dateStyle: 'medium',
          timeStyle: 'short',
        })
      );
    }
  }, [showReportModal]);

  // Handle keyboard Escape to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showReportModal) {
        setShowReportModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showReportModal]);

  if (!assessment) return null;

  const {
    workRestCycle,
    hydrationPlan,
    ppeCoolingActions,
    acclimatizationRule,
    supervisorNotes,
    topDrivers,
  } = assessment;

  const handleCopyText = () => {
    const text = `
CHHAON (छाँव) — Worksite Heat Safety Operational Report
=====================================================
Worksite Location: ${location?.displayName || 'Active Worksite'} (${location ? `${location.lat.toFixed(4)}°N, ${location.lng.toFixed(4)}°E` : ''})
Generated: ${generatedDate || new Date().toLocaleString()}
Weather Forecast Timestamp: ${weather?.timestamp || 'N/A'} (${weather?.dataSource || 'Open-Meteo'})
Environmental Screening Status: ${assessment.tierLabel} (${assessment.tierHindi}) — Heat Index ~${assessment.heatIndex}°C

WORK CONDITIONS:
- Physical Exertion: ${workContext?.intensity || 'N/A'}
- Shift Duration: ${workContext?.duration || 'N/A'}
- Canopy Shade: ${workContext?.shade || 'N/A'}
- Water Access: ${workContext?.water || 'N/A'}
- Crew Acclimatization: ${workContext?.acclimatization || 'N/A'}

PRIMARY RISK DRIVERS:
${topDrivers.map((d) => `• ${d}`).join('\n')}

OPERATIONAL PROTOCOLS:
1. Work/Rest Pacing:
   ${workRestCycle.headline}
   ${workRestCycle.conditionDescription}

2. Hydration Protocol:
   ${hydrationPlan.headline}
   ${hydrationPlan.notes}

3. Canopy & PPE Controls:
${ppeCoolingActions.map((a) => `   • ${a}`).join('\n')}

4. Acclimatization & Buddy Monitoring:
   ${acclimatizationRule}
   Two-person buddy pairs to monitor slurred speech, confusion, or stopped sweating.

5. EMERGENCY FIRST-AID:
   Heat stroke is a medical emergency. If a worker exhibits confusion, delirium, hot skin, or loss of consciousness, move to shade immediately, douse with cool water, and call 108 / 112 ambulance services.

DISCLAIMER:
Operational environmental planning aid based on regional numerical model predictions and reported site context. Not an on-site physical WBGT measurement, certified occupational standard, or medical diagnosis. No outdoor conditions are guaranteed safe.
    `.trim();

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <section className="chhaon-card supervisor-plan-card" aria-labelledby="action-plan-heading">
        <div className="card-header">
          <div className="card-title-group">
            <span className="card-title-icon" aria-hidden="true">
              <ShieldAlert size={20} />
            </span>
            <h2 id="action-plan-heading" className="card-title">
              Supervisor Safety Plan
            </h2>
          </div>
          <button
            type="button"
            className="generate-report-btn"
            onClick={() => setShowReportModal(true)}
            aria-haspopup="dialog"
          >
            <FileText size={16} aria-hidden="true" />
            <span>Generate Safety Report</span>
          </button>
        </div>

        {/* Compact Operational Action Summary */}
        <div className="safety-summary-grid">
          <div className="safety-summary-box">
            <div className="summary-box-icon summary-box-icon--terracotta">
              <Clock size={16} aria-hidden="true" />
            </div>
            <div className="summary-box-content">
              <strong className="summary-box-title">Work/Rest Pacing</strong>
              <p className="summary-box-text">{workRestCycle.headline}</p>
            </div>
          </div>

          <div className="safety-summary-box">
            <div className="summary-box-icon summary-box-icon--blue">
              <Droplets size={16} aria-hidden="true" />
            </div>
            <div className="summary-box-content">
              <strong className="summary-box-title">Hydration Standard</strong>
              <p className="summary-box-text">{hydrationPlan.headline}</p>
            </div>
          </div>

          <div className="safety-summary-box">
            <div className="summary-box-icon summary-box-icon--forest">
              <Umbrella size={16} aria-hidden="true" />
            </div>
            <div className="summary-box-content">
              <strong className="summary-box-title">Site Canopy &amp; Cooling</strong>
              <p className="summary-box-text">Deploy shaded canopies within 25–50m; maintain active cross-ventilation.</p>
            </div>
          </div>

          <div className="safety-summary-box">
            <div className="summary-box-icon summary-box-icon--amber">
              <Users size={16} aria-hidden="true" />
            </div>
            <div className="summary-box-content">
              <strong className="summary-box-title">Buddy Surveillance</strong>
              <p className="summary-box-text">Pair workers to monitor stumbling, confusion, and halted perspiration.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Safety Report Modal Dialog */}
      {showReportModal && (
        <div
          className="report-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="report-modal-title"
          onClick={() => setShowReportModal(false)}
        >
          <div
            className="report-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Control Header (Hidden when printing) */}
            <div className="report-modal-ctrl-bar no-print">
              <div className="ctrl-bar-title">
                <FileText size={18} aria-hidden="true" style={{ color: 'var(--brand-forest)' }} />
                <h3 id="report-modal-title" style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>
                  Supervisor Safety Report Preview
                </h3>
              </div>
              <div className="ctrl-bar-actions">
                <button
                  type="button"
                  className="ctrl-btn ctrl-btn--secondary"
                  onClick={handleCopyText}
                  title="Copy full text of this report"
                >
                  {copied ? <Check size={14} style={{ color: 'var(--brand-forest)' }} /> : <Copy size={14} />}
                  <span>{copied ? 'Copied!' : 'Copy Text'}</span>
                </button>
                <button
                  type="button"
                  className="ctrl-btn ctrl-btn--primary"
                  onClick={handlePrint}
                  title="Print report or save as PDF"
                >
                  <Printer size={14} />
                  <span>Print / Save as PDF</span>
                </button>
                <button
                  type="button"
                  className="ctrl-btn-close"
                  onClick={() => setShowReportModal(false)}
                  aria-label="Close report preview"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Printable Document Container */}
            <div id="chhaon-printable-report" className="printable-report-body">
              {/* Report Document Header */}
              <div className="report-doc-header">
                <div className="doc-brand-row">
                  <div className="doc-brand-left">
                    <span className="doc-brand-hi">छाँव</span>
                    <span className="doc-brand-sep">•</span>
                    <span className="doc-brand-en">CHHAON</span>
                  </div>
                  <span className="doc-tagline">काम भी ज़रूरी। सुरक्षा भी। • Work matters. So does safety.</span>
                </div>
                <h1 className="doc-main-title">Worksite Heat Safety Operational Plan</h1>
                <div className="doc-meta-strip">
                  <span><strong>Worksite:</strong> {location?.displayName || 'Active Worksite'}</span>
                  {location && (
                    <span><strong>Coordinates:</strong> {location.lat.toFixed(4)}°N, {location.lng.toFixed(4)}°E</span>
                  )}
                  <span><strong>Generated:</strong> {generatedDate}</span>
                  {weather && <span><strong>Weather Data:</strong> {weather.timestamp} ({weather.dataSource})</span>}
                </div>
              </div>

              {/* Status Alert Band */}
              <div className="report-tier-banner" data-tier={assessment.tier}>
                <div className="tier-banner-left">
                  <span className="tier-banner-label">Screening Assessment:</span>
                  <span className="tier-banner-val">{assessment.tierLabel}</span>
                  <span className="tier-banner-hi">({assessment.tierHindi})</span>
                </div>
                <div className="tier-banner-right">
                  <span>Felt Heat Index: <strong>~{assessment.heatIndex}°C</strong></span>
                  {weather && <span>(Ambient: {weather.temperature}°C, {weather.humidity}% RH)</span>}
                </div>
              </div>

              {/* Section 1: Worksite Conditions & Drivers */}
              <div className="report-section-grid">
                <div className="report-section-col">
                  <h4 className="report-sec-heading">1. Worksite Input Parameters</h4>
                  <ul className="report-sec-list">
                    <li><strong>Physical Exertion:</strong> {workContext?.intensity || 'Moderate'}</li>
                    <li><strong>Continuous Exposure:</strong> {workContext?.duration || '4h'}</li>
                    <li><strong>Overhead Canopy:</strong> {workContext?.shade || 'None (Direct Sun)'}</li>
                    <li><strong>Potable Water Access:</strong> {workContext?.water || 'Limited'}</li>
                    <li><strong>Crew Acclimatization:</strong> {workContext?.acclimatization || 'Unknown'}</li>
                  </ul>
                </div>
                <div className="report-section-col">
                  <h4 className="report-sec-heading">2. Primary Risk Drivers</h4>
                  <ul className="report-sec-list">
                    {topDrivers.map((driver, idx) => (
                      <li key={idx}>{driver}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Section 2: Prescribed Safety Protocols */}
              <div className="report-protocols-box">
                <h4 className="report-sec-heading">3. Prescribed Operational Protocols</h4>

                <div className="protocol-item">
                  <strong>A. Work/Rest &amp; Pacing:</strong>
                  <p>{workRestCycle.headline} — {workRestCycle.conditionDescription}</p>
                </div>

                <div className="protocol-item">
                  <strong>B. Hydration Standards:</strong>
                  <p>{hydrationPlan.headline} — {hydrationPlan.notes}</p>
                </div>

                <div className="protocol-item">
                  <strong>C. Overhead Canopy &amp; PPE Controls:</strong>
                  <ul>
                    {ppeCoolingActions.map((action, idx) => (
                      <li key={idx}>{action}</li>
                    ))}
                  </ul>
                </div>

                <div className="protocol-item">
                  <strong>D. Workforce Acclimatization &amp; Buddy Surveillance:</strong>
                  <p>{acclimatizationRule}</p>
                  <p>Designate 2-person buddy pairs to monitor slurred speech, confusion, pale skin, or ceased sweating.</p>
                </div>

                {supervisorNotes && supervisorNotes.length > 0 && (
                  <div className="protocol-item">
                    <strong>E. Site Supervisor Muster Briefing Points:</strong>
                    <ul>
                      {supervisorNotes.map((note, idx) => (
                        <li key={idx}>{note}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Section 3: Emergency First-Aid Red Flags */}
              <div className="report-emergency-box">
                <h4 className="report-emergency-title">
                  <AlertTriangle size={15} aria-hidden="true" />
                  EMERGENCY RED FLAGS — HEAT STROKE FIRST AID
                </h4>
                <p>
                  <strong>Signs:</strong> Confusion, irrational behavior, delirium, hot dry or profusely sweating skin, physical collapse.
                </p>
                <p>
                  <strong>Immediate Action:</strong> Heat stroke is a life-threatening medical emergency. Move worker to shade immediately, douse entire body with cool water or ice, fan vigorously, and call <strong>108 / 112 Emergency Medical Services</strong> without delay.
                </p>
              </div>

              {/* Legal & Technical Disclaimer Footer */}
              <div className="report-doc-disclaimer">
                <strong>Planning Aid Disclaimer:</strong> CHHAON is an operational decision-support tool based on Open-Meteo numerical weather forecasts and reported site conditions. It is not an on-site physical WBGT black-globe measurement, an individualized medical prescription, or a certified workplace safety inspection. No outdoor work condition is guaranteed safe.
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
