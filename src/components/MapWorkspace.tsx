import React, { useEffect, useRef, useState, useTransition } from 'react';
import * as L from 'leaflet';
import { Search, MapPin, X, Navigation, Compass, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import type { GeoLocation } from '../types';
import {
  searchLocationWithDetails,
  reverseGeocode,
  POPULAR_INDIAN_WORK_HUBS,
  type SearchCandidate,
  type GeocodingSearchResponse,
} from '../services/geocodingService';

interface MapWorkspaceProps {
  selectedLocation: GeoLocation | null;
  onSelectLocation: (loc: GeoLocation | null) => void;
  isLoadingWeather: boolean;
}

// Custom terracotta & forest-green Leaflet marker icon
const createChhaonIcon = () => {
  return L.divIcon({
    className: 'chhaon-map-marker',
    html: `
      <div style="filter: drop-shadow(0 3px 6px rgba(0,0,0,0.35));">
        <svg width="34" height="42" viewBox="0 0 34 42" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M17 0C7.61 0 0 7.61 0 17C0 29.75 17 42 17 42C17 42 34 29.75 34 17C34 7.61 26.39 0 17 0Z" fill="#C85A32"/>
          <circle cx="17" cy="16" r="8" fill="#1B4332"/>
          <circle cx="17" cy="16" r="3.5" fill="#FAF7F2"/>
        </svg>
      </div>
    `,
    iconSize: [34, 42],
    iconAnchor: [17, 42],
    popupAnchor: [0, -38],
  });
};

export const MapWorkspace: React.FC<MapWorkspaceProps> = ({
  selectedLocation,
  onSelectLocation,
  isLoadingWeather,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const searchBoxContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResponse, setSearchResponse] = useState<GeocodingSearchResponse | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [searchStatusAnnouncement, setSearchStatusAnnouncement] = useState('');
  const [_, startTransition] = useTransition();

  // Asynchronous Request Tracking ID to discard stale/out-of-order responses
  const searchRequestIdRef = useRef<number>(0);

  // Initialize Leaflet Map (Center of India: 22.9734° N, 78.6569° E, Zoom: 5)
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return; // Prevent duplicate init

    const map = L.map(mapContainerRef.current, {
      center: [22.9734, 78.6569],
      zoom: 5,
      minZoom: 4,
      maxZoom: 18,
      zoomControl: true,
      scrollWheelZoom: true,
    });

    // OpenStreetMap Standard Tiles with correct attribution
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
    }).addTo(map);

    // Map click handler to manually select arbitrary coordinates on the map
    map.on('click', async (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      setShowDropdown(false);
      // Reverse geocode clicked coordinate with explicit manual selection tag
      const resolved = await reverseGeocode(lat, lng);
      onSelectLocation(resolved);
    });

    mapInstanceRef.current = map;

    return () => {
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [onSelectLocation]);

  // Sync marker position when selectedLocation changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (!selectedLocation) {
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
      // Return map to default overview of India (center [22.9734, 78.6569], zoom 5)
      map.flyTo([22.9734, 78.6569], 5, { duration: 0.8 });
      return;
    }

    const { lat, lng, displayName, isManualSelection, matchType, fullAddress } = selectedLocation;

    const popupHtml = `
      <div class="popup-inner-title">${displayName}</div>
      <div class="popup-inner-coords">${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E</div>
      <div class="popup-badge-row">
        <span class="popup-badge ${isManualSelection ? 'badge-manual' : matchType === 'locality' ? 'badge-locality' : 'badge-exact'}">
          ${isManualSelection ? 'Manual Map Point' : matchType === 'locality' ? 'Locality Match' : 'Verified Location'}
        </span>
      </div>
      ${fullAddress ? `<div class="popup-inner-address">${fullAddress}</div>` : ''}
      <div class="popup-action-hint">Click other map point or drag pin to adjust coordinates</div>
    `;

    if (!markerRef.current) {
      markerRef.current = L.marker([lat, lng], {
        icon: createChhaonIcon(),
        draggable: true,
        title: `Worksite: ${displayName}`,
      }).addTo(map);

      // Handle marker drag: update exact latitude/longitude as manual selection
      markerRef.current.on('dragend', async (e: any) => {
        const marker = e.target;
        const position = marker.getLatLng();
        const resolved = await reverseGeocode(position.lat, position.lng);
        onSelectLocation(resolved);
      });
    } else {
      markerRef.current.setLatLng([lat, lng]);
    }

    markerRef.current.bindPopup(popupHtml).openPopup();

    // Zoom and pan directly to the selected point (zoom level 13 provides clear context)
    map.flyTo([lat, lng], Math.max(map.getZoom(), 13), {
      duration: 1.0,
    });
  }, [selectedLocation, onSelectLocation]);

  // Handle Search Input with debounce & stale-request cancellation
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed || trimmed.length < 2) {
      searchRequestIdRef.current++;
      setSearchResponse(null);
      setShowDropdown(false);
      setHighlightedIndex(-1);
      return;
    }

    const reqId = ++searchRequestIdRef.current;
    const timeout = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await searchLocationWithDetails(trimmed);
        // Abort if a newer search was initiated or cleared while awaiting response
        if (reqId !== searchRequestIdRef.current) return;

        startTransition(() => {
          setSearchResponse(response);
          setShowDropdown(true);
          setHighlightedIndex(-1);

          if (response.status === 'success') {
            if (response.fallbackUsed) {
              setSearchStatusAnnouncement(
                `No direct match found for "${trimmed}". Showing ${response.results.length} locality matches for "${response.fallbackLocality}".`
              );
            } else {
              setSearchStatusAnnouncement(
                `Found ${response.results.length} candidate locations for "${trimmed}".`
              );
            }
          } else if (response.status === 'no_results') {
            setSearchStatusAnnouncement(
              `No location matches found for "${trimmed}". You can click the map to place a manual pin.`
            );
          } else if (response.status === 'rate_limited') {
            setSearchStatusAnnouncement(
              'Location search rate limit reached. Please wait a moment or click the map.'
            );
          }
        });
      } finally {
        if (reqId === searchRequestIdRef.current) {
          setIsSearching(false);
        }
      }
    }, 450);

    return () => clearTimeout(timeout);
  }, [searchQuery]);

  // Click outside listener to dismiss search dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchBoxContainerRef.current &&
        !searchBoxContainerRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle selecting a candidate from search results
  const handleSelectCandidate = (candidate: SearchCandidate) => {
    searchRequestIdRef.current++;
    onSelectLocation(candidate.location);
    setShowDropdown(false);
    setHighlightedIndex(-1);
  };

  // Keyboard navigation for search results dropdown
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || !searchResponse || searchResponse.results.length === 0) {
      if (e.key === 'ArrowDown' && searchResponse?.results.length) {
        setShowDropdown(true);
        e.preventDefault();
      }
      return;
    }

    const candidates = searchResponse.results;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev < candidates.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : candidates.length - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < candidates.length) {
          handleSelectCandidate(candidates[highlightedIndex]);
        }
        // If no candidate is highlighted, do NOT automatically select the first candidate.
        // Ambiguity requires user choice.
        break;
      case 'Escape':
        e.preventDefault();
        setShowDropdown(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  // Clear query text from input box
  const handleClearSearchQuery = () => {
    searchRequestIdRef.current++;
    setSearchQuery('');
    setSearchResponse(null);
    setShowDropdown(false);
    setHighlightedIndex(-1);
  };

  // Clear active selected worksite location
  const handleClearSelectedLocation = () => {
    searchRequestIdRef.current++;
    onSelectLocation(null);
    setSearchQuery('');
    setSearchResponse(null);
    setShowDropdown(false);
    setHighlightedIndex(-1);
  };

  return (
    <section className="chhaon-card map-card-wrapper" aria-labelledby="map-workspace-heading">
      <div className="card-header">
        <div className="card-title-group">
          <span className="card-title-icon" aria-hidden="true">
            <MapPin size={20} />
          </span>
          <h2 id="map-workspace-heading" className="card-title">
            Worksite Location Selection
          </h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isLoadingWeather && (
            <span className="card-badge" style={{ color: 'var(--brand-terracotta)' }}>
              Fetching Weather...
            </span>
          )}
          <span className="card-badge">OpenStreetMap</span>
        </div>
      </div>

      {/* Accessible Search Input Box with Autocomplete & Keyboard Navigation */}
      <div className="location-search-box" ref={searchBoxContainerRef}>
        <div className="search-input-wrapper">
          <Search size={16} className="search-input-icon" aria-hidden="true" />
          <input
            type="text"
            className="location-search-input"
            placeholder="Search worksite (e.g. Narayana School, Maheshtala or Surat)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => {
              if (searchResponse?.results.length) setShowDropdown(true);
            }}
            onKeyDown={handleKeyDown}
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={showDropdown}
            aria-controls="search-candidates-list"
            aria-activedescendant={
              highlightedIndex >= 0 ? `candidate-opt-${highlightedIndex}` : undefined
            }
            aria-label="Search worksite location or place name in India"
          />
          {isSearching && (
            <span className="search-loading-pill" aria-hidden="true">
              Searching...
            </span>
          )}
          {searchQuery && (
            <button
              type="button"
              className="search-clear-btn"
              onClick={handleClearSearchQuery}
              aria-label="Clear search input"
              title="Clear search text"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Live region for accessibility announcements */}
        <div className="sr-only" role="status" aria-live="polite">
          {searchStatusAnnouncement}
        </div>

        {/* Dropdown Container */}
        {showDropdown && searchResponse && (
          <div className="search-dropdown-container">
            {/* 1. Successful Results List */}
            {searchResponse.status === 'success' && searchResponse.results.length > 0 && (
              <>
                {/* Fallback Notice Banner */}
                {searchResponse.fallbackUsed && (
                  <div className="search-fallback-banner" role="note">
                    <Info size={14} className="fallback-banner-icon" aria-hidden="true" />
                    <div className="fallback-banner-text">
                      <span>
                        No direct match found for <strong>"{searchResponse.query}"</strong>.
                      </span>
                      <span className="fallback-sub">
                        Showing area/locality matches for <strong>"{searchResponse.fallbackLocality}"</strong>:
                      </span>
                    </div>
                  </div>
                )}

                <ul
                  className="search-results-dropdown"
                  role="listbox"
                  id="search-candidates-list"
                  aria-label="Search candidates"
                >
                  {searchResponse.results.map((candidate, idx) => {
                    const isHighlighted = highlightedIndex === idx;
                    const isLocality = candidate.matchType === 'locality';
                    const isExact = candidate.matchType === 'exact';

                    return (
                      <li
                        key={`${candidate.location.lat}-${candidate.location.lng}-${idx}`}
                        id={`candidate-opt-${idx}`}
                        className={`search-result-item ${isHighlighted ? 'highlighted' : ''} ${
                          isLocality ? 'locality-match' : ''
                        }`}
                        role="option"
                        aria-selected={isHighlighted}
                        onClick={() => handleSelectCandidate(candidate)}
                        onMouseEnter={() => setHighlightedIndex(idx)}
                      >
                        <div className="candidate-header-row">
                          <strong className="candidate-name">
                            {candidate.location.displayName}
                          </strong>
                          <span
                            className={`candidate-match-badge ${
                              isLocality
                                ? 'badge-locality'
                                : isExact
                                ? 'badge-exact'
                                : 'badge-hub'
                            }`}
                          >
                            {candidate.relevanceTag}
                          </span>
                        </div>
                        {candidate.location.fullAddress && (
                          <span className="search-result-full-address">
                            {candidate.location.fullAddress}
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </>
            )}

            {/* 2. Honest No Results State */}
            {searchResponse.status === 'no_results' && (
              <div className="search-status-dropdown-card" role="status">
                <div className="no-res-header">
                  <AlertCircle size={16} className="no-res-icon" aria-hidden="true" />
                  <strong>No location found for "{searchResponse.query}"</strong>
                </div>
                <p className="no-res-explanation">
                  Specific schools, job sites, or unindexed institutions may not be in OpenStreetMap.
                </p>
                <div className="manual-map-hint-box">
                  <MapPin size={14} className="hint-pin-icon" aria-hidden="true" />
                  <span>
                    <strong>Manual map selection:</strong> Click anywhere on the map below to place
                    a pin at your exact worksite coordinates.
                  </span>
                </div>
              </div>
            )}

            {/* 3. Rate Limited State */}
            {searchResponse.status === 'rate_limited' && (
              <div className="search-status-dropdown-card" role="status">
                <div className="no-res-header">
                  <AlertTriangle
                    size={16}
                    style={{ color: 'var(--brand-amber)' }}
                    aria-hidden="true"
                  />
                  <strong>Search service rate limit reached</strong>
                </div>
                <p className="no-res-explanation">
                  OpenStreetMap rate limit reached. Please wait a moment or click the map directly to
                  select your worksite point.
                </p>
              </div>
            )}

            {/* 4. Error State */}
            {searchResponse.status === 'error' && (
              <div className="search-status-dropdown-card" role="status">
                <div className="no-res-header">
                  <AlertCircle
                    size={16}
                    style={{ color: 'var(--risk-high)' }}
                    aria-hidden="true"
                  />
                  <strong>Unable to connect to search service</strong>
                </div>
                <p className="no-res-explanation">
                  {searchResponse.message ||
                    'Please check your network connection or click the map directly.'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quick Pick Location Chips */}
      <div className="quick-picks-container">
        <span className="quick-pick-label">Quick Hubs:</span>
        {POPULAR_INDIAN_WORK_HUBS.map((hub) => (
          <button
            key={hub.displayName}
            type="button"
            className="quick-pick-pill"
            onClick={() => onSelectLocation(hub)}
            title={`Select ${hub.displayName} (${hub.lat.toFixed(2)}°N, ${hub.lng.toFixed(2)}°E)`}
          >
            {hub.displayName}
          </button>
        ))}
      </div>

      {/* Leaflet Map Container */}
      <div
        id="chhaon-leaflet-map"
        ref={mapContainerRef}
        className="map-container-frame"
        aria-label="Interactive map of India for selecting outdoor work location"
        role="region"
      />

      {/* Map helper / instructions banner */}
      <div className="map-instructions-pill">
        <span className="instruction-text">
          <Navigation size={13} aria-hidden="true" />
          Click anywhere on the map or drag the pin to select worksite coordinates.
        </span>
        <span className="instruction-text">
          <Compass size={13} aria-hidden="true" />
          Pan & Zoom enabled
        </span>
      </div>

      {/* Selected location display banner or search empty state */}
      {selectedLocation ? (
        <div className="selected-location-banner" aria-live="polite">
          <div className="selected-loc-left">
            <MapPin size={18} className="loc-pin-icon" aria-hidden="true" />
            <div className="loc-name-text-col">
              <div className="loc-title-row">
                <strong className="loc-title-text">{selectedLocation.displayName}</strong>
                {selectedLocation.isManualSelection ? (
                  <span className="loc-status-chip chip-manual">Manual Map Point</span>
                ) : selectedLocation.matchType === 'locality' ? (
                  <span className="loc-status-chip chip-locality">Locality Match</span>
                ) : selectedLocation.matchType === 'exact' ? (
                  <span className="loc-status-chip chip-exact">Verified Match</span>
                ) : null}
              </div>
              {selectedLocation.fullAddress && (
                <span className="loc-full-address-sub">{selectedLocation.fullAddress}</span>
              )}
            </div>
          </div>
          <div className="selected-loc-right">
            <div className="loc-coords-badge">
              {selectedLocation.lat.toFixed(4)}° N, {selectedLocation.lng.toFixed(4)}° E
            </div>
            <button
              type="button"
              className="clear-selected-loc-btn"
              onClick={handleClearSelectedLocation}
              title="Clear worksite selection and remove map pin"
              aria-label="Clear selected worksite location"
            >
              <X size={13} aria-hidden="true" />
              <span>Clear</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="empty-location-banner" aria-live="polite">
          <Search size={15} className="empty-loc-icon" aria-hidden="true" />
          <span>No worksite selected. Search above, click a Quick Hub, or select any point on the map.</span>
        </div>
      )}
    </section>
  );
};
