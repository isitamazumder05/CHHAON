import type { GeoLocation, LocationMatchType } from '../types';

export const POPULAR_INDIAN_WORK_HUBS: GeoLocation[] = [
  { lat: 28.6139, lng: 77.2090, displayName: 'Delhi', district: 'New Delhi', state: 'Delhi', matchType: 'hub', fullAddress: 'New Delhi, Delhi, India' },
  { lat: 30.7333, lng: 76.7794, displayName: 'Chandigarh', district: 'Chandigarh', state: 'Chandigarh', matchType: 'hub', fullAddress: 'Chandigarh, India' },
  { lat: 26.9124, lng: 75.7873, displayName: 'Jaipur', district: 'Jaipur', state: 'Rajasthan', matchType: 'hub', fullAddress: 'Jaipur, Rajasthan, India' },
  { lat: 26.8467, lng: 80.9462, displayName: 'Lucknow', district: 'Lucknow', state: 'Uttar Pradesh', matchType: 'hub', fullAddress: 'Lucknow, Uttar Pradesh, India' },
  { lat: 30.3165, lng: 78.0322, displayName: 'Dehradun', district: 'Dehradun', state: 'Uttarakhand', matchType: 'hub', fullAddress: 'Dehradun, Uttarakhand, India' },
  { lat: 34.0837, lng: 74.7973, displayName: 'Srinagar', district: 'Srinagar', state: 'Jammu & Kashmir', matchType: 'hub', fullAddress: 'Srinagar, Jammu & Kashmir, India' },
  { lat: 22.5726, lng: 88.3639, displayName: 'Kolkata', district: 'Kolkata', state: 'West Bengal', matchType: 'hub', fullAddress: 'Kolkata, West Bengal, India' },
  { lat: 25.5941, lng: 85.1376, displayName: 'Patna', district: 'Patna', state: 'Bihar', matchType: 'hub', fullAddress: 'Patna, Bihar, India' },
  { lat: 26.1445, lng: 91.7362, displayName: 'Guwahati', district: 'Kamrup Metropolitan', state: 'Assam', matchType: 'hub', fullAddress: 'Guwahati, Kamrup Metropolitan, Assam, India' },
  { lat: 23.0225, lng: 72.5714, displayName: 'Ahmedabad', district: 'Ahmedabad', state: 'Gujarat', matchType: 'hub', fullAddress: 'Ahmedabad, Gujarat, India' },
  { lat: 19.0760, lng: 72.8777, displayName: 'Mumbai', district: 'Mumbai', state: 'Maharashtra', matchType: 'hub', fullAddress: 'Mumbai, Maharashtra, India' },
  { lat: 23.2599, lng: 77.4126, displayName: 'Bhopal', district: 'Bhopal', state: 'Madhya Pradesh', matchType: 'hub', fullAddress: 'Bhopal, Madhya Pradesh, India' },
  { lat: 21.1458, lng: 79.0882, displayName: 'Nagpur', district: 'Nagpur', state: 'Maharashtra', matchType: 'hub', fullAddress: 'Nagpur, Maharashtra, India' },
  { lat: 12.9716, lng: 77.5946, displayName: 'Bengaluru', district: 'Bengaluru Urban', state: 'Karnataka', matchType: 'hub', fullAddress: 'Bengaluru, Bengaluru Urban, Karnataka, India' },
  { lat: 13.0827, lng: 80.2707, displayName: 'Chennai', district: 'Chennai', state: 'Tamil Nadu', matchType: 'hub', fullAddress: 'Chennai, Tamil Nadu, India' },
  { lat: 17.3850, lng: 78.4867, displayName: 'Hyderabad', district: 'Hyderabad', state: 'Telangana', matchType: 'hub', fullAddress: 'Hyderabad, Telangana, India' },
];

export interface SearchCandidate {
  location: GeoLocation;
  matchType: LocationMatchType;
  relevanceTag: string; // 'Exact Match' | 'Locality Match' | 'Quick Hub'
  isLocalityFallback: boolean;
}

export interface GeocodingSearchResponse {
  query: string;
  results: SearchCandidate[];
  fallbackUsed: boolean;
  fallbackLocality?: string;
  status: 'success' | 'no_results' | 'rate_limited' | 'error';
  message?: string;
}

/**
 * Extracts a candidate locality from a detailed or unindexed site query.
 * For example, "Narayana School, Maheshtala" -> "Maheshtala"
 * "Narayana School, Maheshtala, West Bengal" -> "Maheshtala, West Bengal"
 * "St. Xavier's School Ahmedabad" -> "Ahmedabad"
 */
export function extractLocalityCandidate(query: string): string | null {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 3) return null;

  // 1. Comma-separated query: extract place components after the venue name
  if (trimmed.includes(',')) {
    const parts = trimmed.split(',').map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 2) {
      const localityPart = parts.slice(1).join(', ').trim();
      if (localityPart.length >= 2) {
        return localityPart;
      }
    }
  }

  // 2. Keyword-based pattern for landmark/institution names without commas
  const landmarkRegex =
    /^(?:the\s+)?(.+?)\s+(?:school|vidyalaya|academy|college|hospital|clinic|site|works|factory|plant|depot|station|terminal|yard|project|campus|university|complex)\b(?:\s+(?:in|at|near|around|,)\s+|\s+)(.+)$/i;
  const match = trimmed.match(landmarkRegex);
  if (match && match[2]) {
    const candidate = match[2].trim();
    if (candidate.length >= 2) {
      return candidate;
    }
  }

  return null;
}

/**
 * Parses raw Nominatim search items into structured candidates.
 */
export function parseNominatimResults(
  data: any[],
  matchType: LocationMatchType,
  originalQuery: string
): SearchCandidate[] {
  if (!Array.isArray(data)) return [];

  return data.map((item: any) => {
    const address = item.address || {};
    const rawDisplayName = item.display_name || '';
    const parts = rawDisplayName.split(',').map((s: string) => s.trim()).filter(Boolean);

    // Prefer explicit name field or first 1-2 address segments
    const placeTitle = item.name || (parts.length > 2 ? parts.slice(0, 2).join(', ') : parts[0] || 'Selected Place');
    const district = address.state_district || address.county || address.city || address.town || address.district;
    const state = address.state;

    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);
    const isLocality = matchType === 'locality';

    return {
      location: {
        lat,
        lng,
        displayName: isLocality ? `${placeTitle} (Locality Match)` : placeTitle,
        fullAddress: rawDisplayName,
        district,
        state,
        matchType,
        originalQuery,
        isManualSelection: false,
      },
      matchType,
      relevanceTag: isLocality ? 'Locality Match' : 'Exact Match',
      isLocalityFallback: isLocality,
    };
  });
}

// In-memory cache to respect Nominatim policy and avoid duplicate network calls
const geocodingCache = new Map<string, GeocodingSearchResponse>();

// Minimum interval (ms) between consecutive network calls to respect Nominatim rate limit
let lastRequestTimestamp = 0;
const MIN_REQUEST_INTERVAL_MS = 600;

async function rateLimitedFetch(url: string, signal?: AbortSignal): Promise<Response> {
  const now = Date.now();
  const timeSinceLast = now - lastRequestTimestamp;
  if (timeSinceLast < MIN_REQUEST_INTERVAL_MS) {
    await new Promise((r) => setTimeout(r, MIN_REQUEST_INTERVAL_MS - timeSinceLast));
  }
  lastRequestTimestamp = Date.now();

  return fetch(url, {
    signal,
    headers: {
      Accept: 'application/json',
      'User-Agent': 'CHHAON-HeatRisk-Screening/1.0',
    },
  });
}

/**
 * Searches for a worksite location with exact-first strategy and locality fallback.
 * Never silently substitutes unrequested cities.
 */
export async function searchLocationWithDetails(
  query: string,
  options?: { signal?: AbortSignal }
): Promise<GeocodingSearchResponse> {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) {
    return {
      query: trimmed,
      results: [],
      fallbackUsed: false,
      status: 'no_results',
    };
  }

  const cacheKey = trimmed.toLowerCase();
  if (geocodingCache.has(cacheKey)) {
    return geocodingCache.get(cacheKey)!;
  }

  try {
    // 1. Search EXACT user query first
    const exactParams = new URLSearchParams({
      q: trimmed,
      format: 'json',
      addressdetails: '1',
      limit: '5',
      countrycodes: 'in',
    });

    const exactUrl = `https://nominatim.openstreetmap.org/search?${exactParams.toString()}`;
    const exactRes = await rateLimitedFetch(exactUrl, options?.signal);

    if (exactRes.status === 429) {
      return {
        query: trimmed,
        results: [],
        fallbackUsed: false,
        status: 'rate_limited',
        message: 'OpenStreetMap rate limit reached. Please wait a moment before searching again.',
      };
    }

    if (!exactRes.ok) {
      return {
        query: trimmed,
        results: [],
        fallbackUsed: false,
        status: 'error',
        message: `Geocoding service returned status ${exactRes.status}.`,
      };
    }

    const exactData = await exactRes.json();
    if (Array.isArray(exactData) && exactData.length > 0) {
      const candidates = parseNominatimResults(exactData, 'exact', trimmed);
      const response: GeocodingSearchResponse = {
        query: trimmed,
        results: candidates,
        fallbackUsed: false,
        status: 'success',
      };
      geocodingCache.set(cacheKey, response);
      return response;
    }

    // 2. Exact match returned no results: check for Locality Fallback
    const localityCandidate = extractLocalityCandidate(trimmed);
    if (localityCandidate) {
      const fallbackParams = new URLSearchParams({
        q: localityCandidate,
        format: 'json',
        addressdetails: '1',
        limit: '5',
        countrycodes: 'in',
      });

      const fallbackUrl = `https://nominatim.openstreetmap.org/search?${fallbackParams.toString()}`;
      const fallbackRes = await rateLimitedFetch(fallbackUrl, options?.signal);

      if (fallbackRes.status === 429) {
        return {
          query: trimmed,
          results: [],
          fallbackUsed: false,
          status: 'rate_limited',
          message: 'OpenStreetMap rate limit reached. Please wait a moment before searching again.',
        };
      }

      if (fallbackRes.ok) {
        const fallbackData = await fallbackRes.json();
        if (Array.isArray(fallbackData) && fallbackData.length > 0) {
          const candidates = parseNominatimResults(fallbackData, 'locality', trimmed);
          const response: GeocodingSearchResponse = {
            query: trimmed,
            results: candidates,
            fallbackUsed: true,
            fallbackLocality: localityCandidate,
            status: 'success',
          };
          geocodingCache.set(cacheKey, response);
          return response;
        }
      }
    }

    // 3. Direct Quick Hub match ONLY if query directly matches a known hub name (e.g. user typed "Surat" or "Ahmedabad")
    const directHubMatch = POPULAR_INDIAN_WORK_HUBS.filter(
      (hub) => hub.displayName.toLowerCase() === trimmed.toLowerCase()
    );
    if (directHubMatch.length > 0) {
      const hubCandidates: SearchCandidate[] = directHubMatch.map((hub) => ({
        location: hub,
        matchType: 'hub',
        relevanceTag: 'Quick Hub',
        isLocalityFallback: false,
      }));
      const response: GeocodingSearchResponse = {
        query: trimmed,
        results: hubCandidates,
        fallbackUsed: false,
        status: 'success',
      };
      geocodingCache.set(cacheKey, response);
      return response;
    }

    // 4. Honest No Results State
    const noResultsResp: GeocodingSearchResponse = {
      query: trimmed,
      results: [],
      fallbackUsed: false,
      status: 'no_results',
      message: `No exact or locality match found for "${trimmed}". Specific schools, buildings, or worksites may not be indexed in OpenStreetMap.`,
    };
    geocodingCache.set(cacheKey, noResultsResp);
    return noResultsResp;
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      return {
        query: trimmed,
        results: [],
        fallbackUsed: false,
        status: 'error',
        message: 'Search request cancelled or timed out.',
      };
    }
    return {
      query: trimmed,
      results: [],
      fallbackUsed: false,
      status: 'error',
      message: err?.message || 'Unable to connect to location search service.',
    };
  }
}

/**
 * Legacy/Simple search location wrapper returning GeoLocation array.
 */
export async function searchLocation(
  query: string,
  options?: { signal?: AbortSignal }
): Promise<GeoLocation[]> {
  const resp = await searchLocationWithDetails(query, options);
  return resp.results.map((r) => r.location);
}

/**
 * Reverse geocodes coordinates to a human-readable area name.
 * Marks the location explicitly as a manually selected map point.
 */
export async function reverseGeocode(
  lat: number,
  lng: number,
  signal?: AbortSignal
): Promise<GeoLocation> {
  const coordLabel = `${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E`;

  try {
    const params = new URLSearchParams({
      lat: lat.toFixed(5),
      lon: lng.toFixed(5),
      format: 'json',
      addressdetails: '1',
      zoom: '14',
    });

    const res = await rateLimitedFetch(
      `https://nominatim.openstreetmap.org/reverse?${params.toString()}`,
      signal
    );

    if (res.ok) {
      const data = await res.json();
      const addr = data.address || {};
      const place =
        addr.suburb ||
        addr.neighbourhood ||
        addr.village ||
        addr.town ||
        addr.city ||
        addr.county ||
        'Area';
      const district = addr.state_district || addr.county || addr.city;
      const state = addr.state || 'India';
      const fullAddr = data.display_name || `${place}, ${district || ''}, ${state}`;

      return {
        lat,
        lng,
        displayName: `Manually selected map point (${place})`,
        fullAddress: fullAddr,
        district,
        state,
        matchType: 'manual',
        isManualSelection: true,
      };
    }
  } catch {
    // Offline / network failure fallback
  }

  return {
    lat,
    lng,
    displayName: 'Manually selected map point',
    fullAddress: `Coordinates: ${coordLabel}`,
    matchType: 'manual',
    isManualSelection: true,
  };
}
