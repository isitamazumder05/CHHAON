import React, { useState } from 'react';
import {
  CalendarClock,
  CheckCircle2,
  Info,
  Clock,
  Sparkles,
} from 'lucide-react';
import type { TimeSlotForecast } from '../types';

interface TimeSlotComparisonProps {
  slots: TimeSlotForecast[];
  isLoading?: boolean;
}

export const TimeSlotComparison: React.FC<TimeSlotComparisonProps> = ({ slots, isLoading }) => {
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(0);

  if (isLoading) {
    return (
      <section className="chhaon-card" aria-label="Loading forecast window comparison">
        <div className="card-header">
          <div className="card-title-group">
            <span className="card-title-icon" aria-hidden="true">
              <CalendarClock size={20} />
            </span>
            <h2 className="card-title">Operational Forecast Window Comparison</h2>
          </div>
          <span className="card-badge">Loading Forecast...</span>
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Evaluating hourly meteorological forecast windows...
        </p>
      </section>
    );
  }

  if (!slots || slots.length === 0) {
    return (
      <section className="chhaon-card" aria-label="Forecast window comparison unavailable">
        <div className="card-header">
          <div className="card-title-group">
            <span className="card-title-icon" aria-hidden="true">
              <CalendarClock size={20} />
            </span>
            <h2 className="card-title">Operational Forecast Window Comparison</h2>
          </div>
          <span className="card-badge">Data Unavailable</span>
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          No hourly forecast slots available for this location. Please check the worksite selection above.
        </p>
      </section>
    );
  }

  // Calculate temperature range to scale bars proportionally
  const apparentTemps = slots.map((s) => s.apparentTemperature);
  const minTemp = Math.min(...apparentTemps);
  const maxTemp = Math.max(...apparentTemps);
  const tempSpread = Math.max(maxTemp - minTemp, 4);

  // Identify the comparatively preferable operational window from actual data
  const coolerSlots = slots.filter((s) => s.isRelativelyCooler);
  const bestSlot = slots.reduce((best, cur) => (cur.apparentTemperature < best.apparentTemperature ? cur : best), slots[0]);
  const worstSlot = slots.reduce((worst, cur) => (cur.apparentTemperature > worst.apparentTemperature ? cur : worst), slots[0]);

  let preferableWindowSummary = '';
  if (coolerSlots.length > 0) {
    const firstCool = coolerSlots[0].timeLabel;
    const lastCool = coolerSlots[coolerSlots.length - 1].timeLabel;
    preferableWindowSummary = `Comparatively preferable window identified: ${firstCool}${coolerSlots.length > 1 ? ` to ${lastCool}` : ''} exhibits significantly lower felt heat (lowest ~${bestSlot.apparentTemperature}°C) compared to peak afternoon burden (~${worstSlot.apparentTemperature}°C at ${worstSlot.timeLabel}). Prioritize strenuous physical tasks during this window.`;
  } else {
    preferableWindowSummary = `Elevated heat stress persists across all available forecast hours (lowest felt heat ~${bestSlot.apparentTemperature}°C at ${bestSlot.timeLabel}; peak ~${worstSlot.apparentTemperature}°C at ${worstSlot.timeLabel}). Enforce mandatory shaded pauses and consider split shift scheduling.`;
  }

  const activeSlot = selectedSlotIndex !== null && slots[selectedSlotIndex] ? slots[selectedSlotIndex] : slots[0];

  return (
    <section className="chhaon-card forecast-visual-section" aria-labelledby="timeslot-heading">
      <div className="card-header">
        <div className="card-title-group">
          <span className="card-title-icon" aria-hidden="true">
            <CalendarClock size={20} />
          </span>
          <h2 id="timeslot-heading" className="card-title">
            Operational Forecast Window Comparison
          </h2>
        </div>
        <span className="card-badge">Next {slots.length} Forecast Hours</span>
      </div>

      {/* Preferable Available Window Insight Banner */}
      <div className="preferable-window-callout" role="note">
        <div className="window-callout-header">
          <Sparkles size={16} className="callout-icon" aria-hidden="true" />
          <strong>Shift Scheduling Analysis:</strong>
        </div>
        <p className="window-callout-body">{preferableWindowSummary}</p>
      </div>

      {/* Visual Timeline Bar Chart (Responsive SVG/CSS Visual) */}
      <div className="timeline-visual-wrapper" role="region" aria-label="Hourly Forecast Timeline Chart">
        <div className="timeline-bars-track">
          {slots.map((slot, idx) => {
            const isSelected = selectedSlotIndex === idx;
            const isNow = idx === 0;
            const isCooler = slot.isRelativelyCooler;

            // Height scaling between 25% and 95%
            const heightPct = Math.round(25 + ((slot.apparentTemperature - minTemp) / tempSpread) * 70);

            let barColor = 'var(--risk-low)';
            if (slot.estimatedRiskTier === 'EXTREME' || slot.estimatedRiskTier === 'VERY_HIGH') {
              barColor = 'var(--risk-very-high)';
            } else if (slot.estimatedRiskTier === 'HIGH') {
              barColor = 'var(--risk-high)';
            } else if (slot.estimatedRiskTier === 'MODERATE') {
              barColor = 'var(--risk-mod)';
            }

            return (
              <div
                key={`${slot.isoTime}-${idx}`}
                className={`timeline-slot-col ${isSelected ? 'selected-col' : ''} ${isCooler ? 'cooler-slot' : ''}`}
                onClick={() => setSelectedSlotIndex(idx)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') setSelectedSlotIndex(idx);
                }}
                tabIndex={0}
                role="button"
                aria-pressed={isSelected}
                aria-label={`${slot.timeLabel}: Felt Heat ${slot.apparentTemperature}°C, ${slot.estimatedRiskTier} risk tier`}
              >
                {/* Top Temp Tag */}
                <div className="slot-temp-tag">
                  <span className="slot-felt-temp">{slot.apparentTemperature}°</span>
                </div>

                {/* Proportional Vertical Bar */}
                <div className="slot-bar-container">
                  <div
                    className="slot-bar-fill"
                    style={{
                      height: `${heightPct}%`,
                      backgroundColor: barColor,
                    }}
                  />
                  {isCooler && (
                    <div className="cooler-indicator-dot" title="Comparatively preferable window" />
                  )}
                </div>

                {/* Status Tags */}
                <div className="slot-label-group">
                  {isNow ? (
                    <span className="slot-now-badge">NOW</span>
                  ) : isCooler ? (
                    <span className="slot-cooler-badge">COOLER</span>
                  ) : (
                    <span className="slot-tier-abbr">
                      {slot.estimatedRiskTier === 'HIGH' ? 'HIGH' : slot.estimatedRiskTier === 'MODERATE' ? 'MOD' : slot.estimatedRiskTier === 'LOW' ? 'LOW' : 'ALERT'}
                    </span>
                  )}
                  <span className="slot-hour-text">{slot.timeLabel}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Hour Detail Card */}
        {activeSlot && (
          <div className="selected-slot-preview" aria-live="polite">
            <div className="preview-header">
              <div className="preview-title-wrap">
                <Clock size={16} aria-hidden="true" style={{ color: 'var(--brand-terracotta)' }} />
                <strong>Forecast Detail for {activeSlot.timeLabel}:</strong>
                <span className="preview-tier-badge" data-tier={activeSlot.estimatedRiskTier}>
                  {activeSlot.estimatedRiskTier.replace('_', ' ')}
                </span>
                {activeSlot.isRelativelyCooler && (
                  <span className="preview-cooler-pill">
                    <CheckCircle2 size={13} aria-hidden="true" />
                    Comparatively Cooler Window
                  </span>
                )}
              </div>
            </div>

            <div className="preview-metrics-grid">
              <div className="preview-metric">
                <span className="metric-label">Felt Heat Index</span>
                <span className="metric-val">{activeSlot.apparentTemperature}°C</span>
              </div>
              <div className="preview-metric">
                <span className="metric-label">Ambient Air</span>
                <span className="metric-val">{activeSlot.temperature}°C</span>
              </div>
              <div className="preview-metric">
                <span className="metric-label">Relative Humidity</span>
                <span className="metric-val">{activeSlot.humidity}%</span>
              </div>
              <div className="preview-metric">
                <span className="metric-label">Direct Radiation</span>
                <span className="metric-val">
                  {activeSlot.directRadiation !== null ? `${activeSlot.directRadiation} W/m²` : 'Unavailable'}
                </span>
              </div>
              <div className="preview-metric">
                <span className="metric-label">UV Index</span>
                <span className="metric-val">
                  {typeof activeSlot.uvIndex === 'number' && !Number.isNaN(activeSlot.uvIndex)
                    ? `UV ${activeSlot.uvIndex}`
                    : 'Unavailable'}
                </span>
              </div>
            </div>

            <p className="preview-advice-text">
              <strong>Supervisor Note:</strong> {activeSlot.slotAdvice}
            </p>
          </div>
        )}
      </div>

      {/* Mandatory Safety Guidance Disclaimer */}
      <div className="timeline-disclaimer-note">
        <Info size={14} className="disclaimer-note-icon" aria-hidden="true" />
        <span>
          <strong>Comparative Planning Guidance:</strong> Forecast time slots indicate relative thermal variations across the workday. Comparatively lower values provide planning alternatives to peak heat, but do not guarantee safe working conditions.
        </span>
      </div>
    </section>
  );
};
