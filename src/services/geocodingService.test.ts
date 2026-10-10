import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  extractLocalityCandidate,
  parseNominatimResults,
  POPULAR_INDIAN_WORK_HUBS,
  type SearchCandidate,
} from './geocodingService.ts';

describe('geocodingService worksite search & selection methodology', () => {
  describe('extractLocalityCandidate', () => {
    it('extracts locality from comma-separated site queries (e.g. "Narayana School, Maheshtala")', () => {
      const result = extractLocalityCandidate('Narayana School, Maheshtala');
      assert.equal(result, 'Maheshtala');
    });

    it('extracts multi-part locality from comma-separated site queries (e.g. "Narayana School, Maheshtala, West Bengal")', () => {
      const result = extractLocalityCandidate('Narayana School, Maheshtala, West Bengal');
      assert.equal(result, 'Maheshtala, West Bengal');
    });

    it('extracts locality from keyword-based landmark queries without commas (e.g. "Narayana School Maheshtala")', () => {
      const result = extractLocalityCandidate('Narayana School Maheshtala');
      assert.equal(result, 'Maheshtala');
    });

    it('extracts locality from hospital/factory/site keywords', () => {
      const result = extractLocalityCandidate('Apollo Hospital Ahmedabad');
      assert.equal(result, 'Ahmedabad');

      const resultSite = extractLocalityCandidate('Metro Construction Site Surat');
      assert.equal(resultSite, 'Surat');
    });

    it('returns null for single city names or generic queries without a distinct locality', () => {
      assert.equal(extractLocalityCandidate('Surat'), null);
      assert.equal(extractLocalityCandidate('Nagpur'), null);
      assert.equal(extractLocalityCandidate(''), null);
    });
  });

  describe('parseNominatimResults categorization & labeling', () => {
    const mockNominatimRaw = [
      {
        place_id: 101,
        lat: '22.5021',
        lon: '88.2415',
        name: 'Maheshtala',
        display_name: 'Maheshtala, South 24 Parganas, West Bengal, 700141, India',
        address: {
          city: 'Maheshtala',
          state_district: 'South 24 Parganas',
          state: 'West Bengal',
          country: 'India',
        },
      },
      {
        place_id: 102,
        lat: '22.5100',
        lon: '88.2500',
        name: 'Batanagar',
        display_name: 'Batanagar, Maheshtala, South 24 Parganas, West Bengal, India',
        address: {
          suburb: 'Batanagar',
          city: 'Maheshtala',
          state: 'West Bengal',
        },
      },
    ];

    it('correctly formats and labels exact search matches', () => {
      const candidates = parseNominatimResults(mockNominatimRaw, 'exact', 'Maheshtala');
      assert.equal(candidates.length, 2);

      const first = candidates[0];
      assert.equal(first.matchType, 'exact');
      assert.equal(first.relevanceTag, 'Exact Match');
      assert.equal(first.isLocalityFallback, false);
      assert.equal(first.location.displayName, 'Maheshtala');
      assert.equal(first.location.lat, 22.5021);
      assert.equal(first.location.lng, 88.2415);
      assert.equal(first.location.state, 'West Bengal');
      assert.equal(first.location.isManualSelection, false);
    });

    it('labels fallback results as locality matches and not verified school/site matches', () => {
      const candidates = parseNominatimResults(
        mockNominatimRaw,
        'locality',
        'Narayana School, Maheshtala'
      );
      assert.equal(candidates.length, 2);

      const first = candidates[0];
      assert.equal(first.matchType, 'locality');
      assert.equal(first.relevanceTag, 'Locality Match');
      assert.equal(first.isLocalityFallback, true);
      // Display name explicitly identifies locality match
      assert.ok(first.location.displayName.includes('Locality Match'));
      assert.equal(first.location.originalQuery, 'Narayana School, Maheshtala');
      assert.equal(first.location.fullAddress, 'Maheshtala, South 24 Parganas, West Bengal, 700141, India');
    });

    it('preserves multiple candidates without auto-selecting the first candidate', () => {
      const candidates = parseNominatimResults(mockNominatimRaw, 'exact', 'Maheshtala');
      assert.equal(candidates.length, 2);
      assert.notEqual(candidates[0].location.lat, candidates[1].location.lat);
      assert.equal(candidates[1].location.displayName, 'Batanagar');
    });

    it('handles empty or malformed Nominatim responses gracefully', () => {
      assert.deepEqual(parseNominatimResults([], 'exact', 'test'), []);
      assert.deepEqual(parseNominatimResults(null as any, 'exact', 'test'), []);
    });
  });

  describe('POPULAR_INDIAN_WORK_HUBS validity', () => {
    it('contains documented Indian work hubs with valid geographical coordinates', () => {
      assert.ok(POPULAR_INDIAN_WORK_HUBS.length >= 10);
      for (const hub of POPULAR_INDIAN_WORK_HUBS) {
        assert.ok(hub.lat >= 8.0 && hub.lat <= 37.0, `Latitude out of Indian bounds: ${hub.displayName}`);
        assert.ok(hub.lng >= 68.0 && hub.lng <= 98.0, `Longitude out of Indian bounds: ${hub.displayName}`);
        assert.ok(hub.displayName.length > 0);
        assert.equal(hub.matchType, 'hub');
      }
    });
  });
});
