import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  RotateCcw,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  MapPin,
  X,
} from 'lucide-react';
import { CinematicIntro } from './components/CinematicIntro';
import { AppHeader } from './components/AppHeader';
import { MapWorkspace } from './components/MapWorkspace';
import { WorkContextForm } from './components/WorkContextForm';
import { AssessmentResults } from './components/AssessmentResults';
import { TimeSlotComparison } from './components/TimeSlotComparison';
import { SafetyActionPlan } from './components/SafetyActionPlan';
import { SourcesLimitations } from './components/SourcesLimitations';
import { fetchLiveWeather } from './services/weatherService';
import { calculateHeatRisk, evaluateTimeSlots } from './services/heatRiskCalculator';
import type {
  GeoLocation,
  WorkContext,
  CurrentWeather,
  AssessmentResult,
  TimeSlotForecast,
} from './types';

const INITIAL_WORK_CONTEXT: WorkContext = {
  intensity: 'moderate',
  duration: '4h',
  shade: 'none',
  water: 'limited',
  acclimatization: 'unknown',
};

export const App: React.FC = () => {
  // Screen state: 'intro' for cinematic landing page, 'app' for main workspace
  const [activeScreen, setActiveScreen] = useState<'intro' | 'app'>('intro');

  // Worksite location (strictly starts null to avoid hardcoding any location)
  const [selectedLocation, setSelectedLocation] = useState<GeoLocation | null>(null);

  // Work context parameters
  const [workContext, setWorkContext] = useState<WorkContext>(INITIAL_WORK_CONTEXT);

  // Meteorological data and calculated assessments
  const [weather, setWeather] = useState<CurrentWeather | null>(null);
  const [rawHourly, setRawHourly] = useState<any[]>([]);
  const [assessment, setAssessment] = useState<AssessmentResult | null>(null);
  const [timeSlots, setTimeSlots] = useState<TimeSlotForecast[]>([]);

  const [isLoadingWeather, setIsLoadingWeather] = useState<boolean>(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);

  // Refresh Weather & Stale State
  const [isRefreshingWeather, setIsRefreshingWeather] = useState<boolean>(false);
  const [weatherIsStale, setWeatherIsStale] = useState<boolean>(false);
  const [refreshFeedback, setRefreshFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Reset Assessment State
  const [showResetModal, setShowResetModal] = useState<boolean>(false);
  const [resetFeedback, setResetFeedback] = useState<string | null>(null);

  // Asynchronous Request Tracking ID to cancel/ignore stale in-flight requests on Reset or location change
  const activeRequestIdRef = useRef<number>(0);

  // Fetch weather and recalculate risk for a chosen location
  const loadWeatherData = useCallback(
    async (loc: GeoLocation, context: WorkContext) => {
      const reqId = ++activeRequestIdRef.current;

      setIsLoadingWeather(true);
      setWeatherError(null);
      setWeather(null);
      setRawHourly([]);
      setAssessment(null);
      setTimeSlots([]);
      setWeatherIsStale(false);
      setRefreshFeedback(null);

      try {
        const response = await fetchLiveWeather(loc.lat, loc.lng);
        // Abort if request was superseded by another action or cancelled by Reset
        if (reqId !== activeRequestIdRef.current) return;

        setWeather(response.current);
        setRawHourly(response.hourly);

        // Compute scientific heat-risk assessment
        const result = calculateHeatRisk(response.current, context);
        setAssessment(result);

        // Compute forecast time-slot evaluations
        const slots = evaluateTimeSlots(response.hourly, context);
        setTimeSlots(slots);
      } catch (err: any) {
        if (reqId !== activeRequestIdRef.current) return;
        setWeatherError(
          err.message || 'Unable to connect to meteorological service. Please check your connection and retry.'
        );
      } finally {
        if (reqId === activeRequestIdRef.current) {
          setIsLoadingWeather(false);
        }
      }
    },
    []
  );

  // Re-fetch current weather for selected coordinates without resetting user inputs
  const handleRefreshWeather = useCallback(async () => {
    if (!selectedLocation || isRefreshingWeather || isLoadingWeather) return;

    const reqId = ++activeRequestIdRef.current;
    setIsRefreshingWeather(true);
    setRefreshFeedback(null);

    try {
      const response = await fetchLiveWeather(selectedLocation.lat, selectedLocation.lng);
      if (reqId !== activeRequestIdRef.current) return;

      setWeather(response.current);
      setRawHourly(response.hourly);

      // Recalculate dependent outputs with current workContext
      const result = calculateHeatRisk(response.current, workContext);
      setAssessment(result);

      const slots = evaluateTimeSlots(response.hourly, workContext);
      setTimeSlots(slots);

      setWeatherIsStale(false);
      setWeatherError(null);
      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setRefreshFeedback({
        type: 'success',
        message: `Weather forecast refreshed for ${selectedLocation.displayName} at ${nowStr}.`,
      });

      // Auto-clear success message after 4s
      setTimeout(() => {
        setRefreshFeedback((prev) => (prev?.type === 'success' ? null : prev));
      }, 4000);
    } catch (err: any) {
      if (reqId !== activeRequestIdRef.current) return;
      // Retain last valid weather data while indicating stale state
      setWeatherIsStale(true);
      setRefreshFeedback({
        type: 'error',
        message: `Could not refresh weather: ${err.message || 'Network error'}. Retaining previous forecast.`,
      });
    } finally {
      if (reqId === activeRequestIdRef.current) {
        setIsRefreshingWeather(false);
      }
    }
  }, [selectedLocation, isRefreshingWeather, isLoadingWeather, workContext]);

  // Request Reset Assessment (prompts confirmation if user selected location or modified inputs)
  const handleRequestReset = useCallback(() => {
    const isModified =
      selectedLocation !== null ||
      weather !== null ||
      workContext.intensity !== INITIAL_WORK_CONTEXT.intensity ||
      workContext.duration !== INITIAL_WORK_CONTEXT.duration ||
      workContext.shade !== INITIAL_WORK_CONTEXT.shade ||
      workContext.water !== INITIAL_WORK_CONTEXT.water ||
      workContext.acclimatization !== INITIAL_WORK_CONTEXT.acclimatization;

    if (isModified) {
      setShowResetModal(true);
    } else {
      setResetFeedback('Assessment workspace is already in the initial empty state.');
      setTimeout(() => setResetFeedback(null), 3000);
    }
  }, [selectedLocation, weather, workContext]);

  // Confirmed Reset: Produce a genuine clean initial state
  const handleConfirmReset = useCallback(() => {
    // Invalidate and cancel any in-flight asynchronous requests
    activeRequestIdRef.current++;

    setShowResetModal(false);
    setSelectedLocation(null);
    setWeather(null);
    setRawHourly([]);
    setAssessment(null);
    setTimeSlots([]);
    setWorkContext(INITIAL_WORK_CONTEXT);
    setIsLoadingWeather(false);
    setWeatherError(null);
    setIsRefreshingWeather(false);
    setWeatherIsStale(false);
    setRefreshFeedback(null);

    setResetFeedback('Assessment workspace reset. Location and results cleared.');
    setTimeout(() => setResetFeedback(null), 3500);
  }, []);

  // Handle keyboard Escape for reset modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showResetModal) {
        setShowResetModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showResetModal]);

  // When location changes, fetch live weather or clear when cleared
  const handleSelectLocation = useCallback(
    (loc: GeoLocation | null) => {
      setSelectedLocation(loc);
      if (loc) {
        loadWeatherData(loc, workContext);
      } else {
        activeRequestIdRef.current++;
        setWeather(null);
        setRawHourly([]);
        setAssessment(null);
        setTimeSlots([]);
        setIsLoadingWeather(false);
        setWeatherError(null);
        setIsRefreshingWeather(false);
        setWeatherIsStale(false);
        setRefreshFeedback(null);
      }
    },
    [loadWeatherData, workContext]
  );

  // When work context changes, recalculate assessment instantaneously with current weather
  const handleWorkContextChange = useCallback(
    (updatedContext: WorkContext) => {
      setWorkContext(updatedContext);
      if (weather) {
        const result = calculateHeatRisk(weather, updatedContext);
        setAssessment(result);

        if (rawHourly.length > 0) {
          const slots = evaluateTimeSlots(rawHourly, updatedContext);
          setTimeSlots(slots);
        }
      }
    },
    [weather, rawHourly]
  );

  // Retry fetching
  const handleRetry = () => {
    if (selectedLocation) {
      loadWeatherData(selectedLocation, workContext);
    }
  };

  // Smooth scroll to Assessment Results when supervisor triggers Review Assessment
  const handleReviewAssessment = useCallback(() => {
    const el = document.getElementById('assessment-heading');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  if (activeScreen === 'intro') {
    return (
      <CinematicIntro
        onEnter={() => {
          setActiveScreen('app');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />
    );
  }

  return (
    <div className="app-root">
      {/* Top Header */}
      <AppHeader onBackToIntro={() => setActiveScreen('intro')} />

      {/* Primary Workspace Control Toolbar */}
      <div className="workspace-toolbar-container" role="region" aria-label="Assessment and Weather Controls">
        <div className="workspace-toolbar">
          <div className="toolbar-status-group">
            {selectedLocation ? (
              <div className="toolbar-location-pill" title={`Active worksite: ${selectedLocation.displayName}`}>
                <MapPin size={15} className="toolbar-icon-terracotta" />
                <span className="toolbar-location-name">
                  {selectedLocation.isManualSelection && (
                    <span className="pill-type-tag pill-type-manual">Manual Point: </span>
                  )}
                  {selectedLocation.matchType === 'locality' && (
                    <span className="pill-type-tag pill-type-locality">Locality Match: </span>
                  )}
                  {selectedLocation.displayName}
                </span>
                {weather && (
                  <span className="toolbar-timestamp-text">
                    • Model: {weather.timestamp}
                    {weatherIsStale && <span className="toolbar-stale-tag">(Stale)</span>}
                  </span>
                )}
              </div>
            ) : (
              <span className="toolbar-instruction-hint">
                <MapPin size={15} /> Select a location on the map or quick hubs to start heat screening
              </span>
            )}
          </div>

          <div className="toolbar-actions-group">
            {/* The single, prominent Refresh Weather Action */}
            <button
              type="button"
              className="toolbar-btn refresh-btn"
              onClick={handleRefreshWeather}
              disabled={!selectedLocation || isRefreshingWeather || isLoadingWeather}
              title={
                !selectedLocation
                  ? 'Select a worksite location first to refresh weather'
                  : 'Re-fetch latest meteorological forecast for this location'
              }
              aria-label="Refresh weather forecast"
            >
              <RefreshCw size={14} className={isRefreshingWeather ? 'spinner-icon' : ''} />
              <span>{isRefreshingWeather ? 'Refreshing...' : 'Refresh Weather'}</span>
            </button>

            {/* Reset Assessment Button */}
            <button
              type="button"
              className="toolbar-btn reset-btn"
              onClick={handleRequestReset}
              title="Clear active location, weather data, and reset all work inputs"
              aria-label="Reset assessment workspace"
            >
              <RotateCcw size={14} />
              <span>Reset Assessment</span>
            </button>
          </div>
        </div>

        {/* Global Reset Notification Toast */}
        {resetFeedback && (
          <div className="toolbar-toast-banner" role="status" aria-live="polite">
            <CheckCircle2 size={15} style={{ color: 'var(--brand-forest)', flexShrink: 0 }} />
            <span>{resetFeedback}</span>
          </div>
        )}

        {/* Refresh Feedback Toast */}
        {refreshFeedback && (
          <div
            className={`toolbar-toast-banner toolbar-toast--${refreshFeedback.type}`}
            role="status"
            aria-live="polite"
          >
            {refreshFeedback.type === 'success' ? (
              <CheckCircle2 size={15} style={{ color: 'var(--risk-low)', flexShrink: 0 }} />
            ) : (
              <AlertCircle size={15} style={{ color: 'var(--risk-high)', flexShrink: 0 }} />
            )}
            <span>{refreshFeedback.message}</span>
          </div>
        )}
      </div>

      {/* Main Workspace Layout */}
      <main className="app-main" id="main-content">
        {/* Left Column: Interactive Map & Operational Work Context Inputs */}
        <div className="app-sidebar-column">
          <MapWorkspace
            selectedLocation={selectedLocation}
            onSelectLocation={handleSelectLocation}
            isLoadingWeather={isLoadingWeather}
          />

          <WorkContextForm
            context={workContext}
            onChange={handleWorkContextChange}
            assessment={assessment}
            onReviewAssessment={handleReviewAssessment}
          />
        </div>

        {/* Right Column: Assessment Results, Visual Time-Slots & Supervisor Safety Plan */}
        <div className="app-content-column">
          <AssessmentResults
            selectedLocation={selectedLocation}
            weather={weather}
            assessment={assessment}
            isLoading={isLoadingWeather}
            error={weatherError}
            onRetry={handleRetry}
            weatherIsStale={weatherIsStale}
          />

          {assessment && timeSlots.length > 0 && (
            <TimeSlotComparison slots={timeSlots} />
          )}

          {assessment && (
            <SafetyActionPlan
              assessment={assessment}
              location={selectedLocation}
              weather={weather}
              workContext={workContext}
            />
          )}

          <SourcesLimitations />
        </div>
      </main>

      {/* Confirmation Dialog Modal for Reset Assessment */}
      {showResetModal && (
        <div
          className="reset-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reset-modal-title"
          onClick={() => setShowResetModal(false)}
        >
          <div
            className="reset-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={20} style={{ color: 'var(--brand-terracotta)' }} />
                <h3 id="reset-modal-title" style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>
                  Reset Assessment Workspace?
                </h3>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowResetModal(false)}
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            <div className="reset-modal-body">
              <p style={{ margin: '0 0 10px 0', fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                This will clear the active worksite location, meteorological forecasts, calculated heat-risk outputs, and restore all work conditions to initial baseline defaults.
              </p>
              <div
                style={{
                  padding: '10px 12px',
                  backgroundColor: 'var(--bg-surface-soft)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.8rem',
                  color: 'var(--text-secondary)',
                }}
              >
                <strong>What will be cleared:</strong>
                <ul className="reset-details-list">
                  <li>Selected worksite location ({selectedLocation?.displayName || 'Active location'}) and map pin</li>
                  <li>Live meteorological data and hourly forecast slots</li>
                  <li>Calculated risk status, metrics, and generated safety plan</li>
                  <li>Custom work parameters (reverting to baseline defaults)</li>
                </ul>
              </div>
            </div>

            <div className="modal-actions" style={{ justifyContent: 'flex-end', gap: '10px', marginTop: '18px' }}>
              <button
                type="button"
                className="back-to-intro-btn"
                onClick={() => setShowResetModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="toolbox-muster-btn"
                onClick={handleConfirmReset}
                autoFocus
              >
                <RotateCcw size={15} />
                <span>Confirm Reset</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
