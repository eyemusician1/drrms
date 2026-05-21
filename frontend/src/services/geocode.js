import { buildApiUrl } from './api';
import { getAccessToken } from '../utils/auth';
import { clampToPhilippines, isWithinPhilippines } from '../utils/philippinesGeo';

const cache = new Map();

const COORD_PAIR_RE = /(-?\d+(?:\.\d+)?)\s*[,]\s*(-?\d+(?:\.\d+)?)/;

export const parseCoordinatesFromText = (value) => {
  if (!value || typeof value !== 'string') return null;
  const match = value.match(COORD_PAIR_RE);
  if (!match) return null;
  const lat = Number.parseFloat(match[1]);
  const lng = Number.parseFloat(match[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  if (!isWithinPhilippines(lat, lng)) return null;
  const clamped = clampToPhilippines(lat, lng);
  return { lat: clamped.lat, lng: clamped.lng, label: value.trim() };
};

const directNominatimFallback = async (query) => {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=ph&viewbox=116.0,21.3,127.7,4.2&q=${encodeURIComponent(query)}`;
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'Accept-Language': 'en',
    },
  });
  if (!response.ok) return null;
  const json = await response.json();
  const first = Array.isArray(json) ? json[0] : null;
  if (!first?.lat || !first?.lon) return null;
  const lat = Number(first.lat);
  const lng = Number(first.lon);
  if (!isWithinPhilippines(lat, lng)) return null;
  const clamped = clampToPhilippines(lat, lng);
  return { lat: clamped.lat, lng: clamped.lng, label: query };
};

/**
 * Resolve a Philippine place to coordinates.
 * @param {string} query - Place name or full administrative label
 * @param {{ barangay?: string, city?: string, province?: string }} [parts]
 */
export const geocodePhilippinesPlace = async (query, parts = {}) => {
  const key = [
    String(query || '').trim(),
    parts.barangay || '',
    parts.city || '',
    parts.province || '',
  ].join('|').toLowerCase();
  if (!key.replace(/\|/g, '')) return null;

  const fromText = parseCoordinatesFromText(query);
  if (fromText) {
    cache.set(key, fromText);
    return fromText;
  }

  const cached = cache.get(key);
  if (cached) return cached;

  const params = new URLSearchParams({ q: String(query || '').trim() });
  if (parts.barangay) params.set('barangay', parts.barangay);
  if (parts.city) params.set('city', parts.city);
  if (parts.province) params.set('province', parts.province);

  const token = getAccessToken();
  if (token) {
    try {
      const response = await fetch(buildApiUrl(`/api/v1/geocode/?${params}`), {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
        cache: 'no-store',
      });
      if (response.ok) {
        const payload = await response.json();
        const lat = Number(payload.lat);
        const lng = Number(payload.lng);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          const clamped = clampToPhilippines(lat, lng);
          const result = {
            lat: clamped.lat,
            lng: clamped.lng,
            label: payload.label || query,
          };
          cache.set(key, result);
          return result;
        }
      }
    } catch (err) {
      // fall through to direct Nominatim
    }
  }

  const fallbacks = [];
  const q = String(query || '').trim();
  if (parts.barangay && parts.city && parts.province) {
    fallbacks.push(`${parts.barangay}, ${parts.city}, ${parts.province}, Philippines`);
  }
  if (parts.city && parts.province) {
    fallbacks.push(`${parts.city}, ${parts.province}, Philippines`);
  }
  if (parts.city) fallbacks.push(`${parts.city}, Philippines`);
  if (q && !q.toLowerCase().includes('philippines')) {
    fallbacks.push(`${q}, Philippines`);
  }
  if (q) fallbacks.push(q);

  for (const attempt of fallbacks) {
    const result = await directNominatimFallback(attempt);
    if (result) {
      cache.set(key, result);
      return result;
    }
  }

  return null;
};
