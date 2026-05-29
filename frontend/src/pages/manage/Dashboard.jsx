import React, { useEffect, useMemo, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import Modal from '../../components/ui/Modal';
import LabsDropdown from '../../components/ui/LabsDropdown'; // <-- Added
import PhilippinesLocationPicker from '../../components/forms/PhilippinesLocationPicker';
import Toast from '../../components/ui/Toast';
import { useRealtimeStream } from '../../hooks/useRealtimeStream';
import { useApi } from '../../hooks/useApi';
import { sanitizeTextInput } from '../../utils/formGuards';
import { geocodePhilippinesPlace, parseCoordinatesFromText } from '../../services/geocode';
import {
  PHILIPPINES_BOUNDS,
  PHILIPPINES_CENTER,
  PHILIPPINES_DEFAULT_ZOOM,
} from '../../utils/philippinesGeo';
import './Dashboard.css';
import useRequireAuth from '../../hooks/useRequireAuth';

const Dashboard = () => {
  useRequireAuth();
  const [isAlertModalOpen, setAlertModalOpen] = useState(false);
  const [alertType, setAlertType] = useState('');
  const [targetRegion, setTargetRegion] = useState('');
  const [disasterType, setDisasterType] = useState('');
  const [telemetryMessage, setTelemetryMessage] = useState('');
  const [errors, setErrors] = useState({});
  const [toasts, setToasts] = useState([]);
  const [editingWarningId, setEditingWarningId] = useState('');
  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const { data: reportData } = useRealtimeStream('/api/v1/stream/reports', null);
  const { data: warningsData, setData: setWarningsData } = useRealtimeStream('/api/v1/stream/warnings', []);
  const { data: disasterData } = useRealtimeStream('/api/v1/stream/disasters', []);
  const { data: evacuationData } = useRealtimeStream('/api/v1/stream/evacuation', []);
  const { request } = useApi();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const mapReadyRef = useRef(false);
  const hasFitBoundsRef = useRef(false);
  const [eventFeatures, setEventFeatures] = useState([]);
  const [centerFeatures, setCenterFeatures] = useState([]);
  const [routeFeature, setRouteFeature] = useState(null);
  const [routeLabelFeature, setRouteLabelFeature] = useState(null);
  const [manualRouteRequest, setManualRouteRequest] = useState(null);
  const [isAlertsExpanded, setIsAlertsExpanded] = useState(false);
  const [isIncidentsExpanded, setIsIncidentsExpanded] = useState(false);
  const [highlightFeature, setHighlightFeature] = useState(null);
  const [selectedFeedKey, setSelectedFeedKey] = useState('');
  const [isLocatingFeed, setIsLocatingFeed] = useState(false);
  const [pendingFlyTo, setPendingFlyTo] = useState(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const philippinesBounds = PHILIPPINES_BOUNDS;

  const totals = reportData?.totals || {};
  const statistics = [
    { label: 'Active Incidents', value: String(totals.active_disasters ?? 0).padStart(2, '0') },
    { label: 'Deployed Units', value: String(totals.response_teams ?? 0).padStart(2, '0') },
    { label: 'Available Beds', value: String(totals.evacuation_centers ?? 0).padStart(2, '0') },
    { label: 'Relief Kits', value: String(totals.relief_operations ?? 0).padStart(2, '0') },
  ];

  const normalizeId = (raw) => {
  if (!raw) return '';
  if (typeof raw === 'string') return raw;
  if (typeof raw === 'object' && raw.$oid) return raw.$oid;
  return String(raw);
};

  const disasterList = useMemo(
    () => (Array.isArray(disasterData) && disasterData.length
      ? disasterData
      : (reportData?.recent?.disaster_events || [])),
    [disasterData, reportData]
  );

  const recentEvents = useMemo(() => disasterList.map((event) => {
  const id = normalizeId(event.id || event._id);
  return {
    id: id || `dr-${Math.random().toString(36).slice(2)}`,
    type: event.disaster_type || 'Unknown',
    zone: event.location || 'Unknown Area',
    severity: event.severity_level || 'Moderate',
    status: event.status || 'Ongoing',
    latitude: typeof event.latitude === 'number' ? event.latitude : null,
    longitude: typeof event.longitude === 'number' ? event.longitude : null,
    raw: event,
  };
}), [disasterList]);

  const findDisasterById = (eventId) => disasterList.find(
    (item) => normalizeId(item.id || item._id) === normalizeId(eventId)
  );

  const routeCacheRef = useRef(new Map());

  const haversineDistance = (a, b) => {
    const toRad = (value) => (value * Math.PI) / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const h = Math.sin(dLat / 2) ** 2
      + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    return 6371 * 2 * Math.asin(Math.sqrt(h));
  };

  const fetchRoute = async (origin, destination) => {
    if (!origin || !destination) return null;
    const key = `${origin.lat},${origin.lng}-${destination.lat},${destination.lng}`;
    const cached = routeCacheRef.current.get(key);
    if (cached) return cached;
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson`;
      const response = await fetch(url);
      const json = await response.json();
      const route = json?.routes?.[0];
      const geometry = route?.geometry;
      const duration = route?.duration; // seconds
      const distance = route?.distance; // meters
      if (!geometry) {
        const fallback = buildFallbackRoute(origin, destination);
        if (fallback) {
          routeCacheRef.current.set(key, fallback);
        }
        return fallback;
      }

      // Line feature
      const lineFeature = {
        type: 'Feature',
        geometry,
        properties: {
          distance,
          duration,
        },
      };

      // Create a midpoint label feature for ETA display
      const coords = Array.isArray(geometry.coordinates) ? geometry.coordinates : [];
      const midIndex = Math.floor(coords.length / 2) || 0;
      const labelPoint = {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: coords[midIndex] || [origin.lng, origin.lat] },
        properties: {
          label: duration ? `${Math.round(duration / 60)} min` : null,
          distance,
          duration,
        },
      };

      const payload = { lineFeature, labelPoint };
      routeCacheRef.current.set(key, payload);
      return payload;
    } catch (err) {
      const fallback = buildFallbackRoute(origin, destination);
      if (fallback) {
        routeCacheRef.current.set(key, fallback);
      }
      return fallback;
    }
  };

  const buildFallbackRoute = (origin, destination) => {
    if (!origin || !destination) return null;
    const coordinates = [
      [origin.lng, origin.lat],
      [destination.lng, destination.lat],
    ];
    const distanceKm = haversineDistance(origin, destination);
    const lineFeature = {
      type: 'Feature',
      geometry: { type: 'LineString', coordinates },
      properties: {
        distance: distanceKm * 1000,
        duration: null,
      },
    };
    const labelPoint = {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: coordinates[1] },
      properties: {
        label: `${distanceKm.toFixed(1)} km`,
        distance: distanceKm * 1000,
        duration: null,
      },
    };
    return { lineFeature, labelPoint };
  };

  const routeRequestKey = manualRouteRequest
    ? `${manualRouteRequest.origin.lat},${manualRouteRequest.origin.lng}-${manualRouteRequest.destination.lat},${manualRouteRequest.destination.lng}`
    : '';

  const toggleAlertsFeed = () => {
    setIsAlertsExpanded((value) => {
      const nextValue = !value;
      if (nextValue) setIsIncidentsExpanded(false);
      return nextValue;
    });
  };

  const toggleIncidentsFeed = () => {
    setIsIncidentsExpanded((value) => {
      const nextValue = !value;
      if (nextValue) setIsAlertsExpanded(false);
      return nextValue;
    });
  };

  const buildEventFeatures = (events) => {
    const list = Array.isArray(events) ? events.slice(0, 120) : [];
    const sorted = [...list].sort((a, b) => {
      const aTime = new Date(a.created_at || a.date_occurred || 0).getTime();
      const bTime = new Date(b.created_at || b.date_occurred || 0).getTime();
      return bTime - aTime;
    });
    const latest = sorted[0];
    return sorted
      .filter((event) => Number.isFinite(event.latitude) && Number.isFinite(event.longitude))
      .map((event) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [event.longitude, event.latitude] },
        properties: {
          id: normalizeId(event.id || event._id),
          label: event.disaster_type || 'Event',
          severity: event.severity_level || 'Moderate',
          kind: 'event',
          is_latest: latest
            ? normalizeId(latest.id || latest._id) === normalizeId(event.id || event._id)
            : false,
        },
      }));
  };

  const buildCenterFeatures = (centers) => {
    const list = Array.isArray(centers) ? centers.slice(0, 120) : [];
    return list
      .filter((center) => Number.isFinite(center.latitude) && Number.isFinite(center.longitude))
      .map((center) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [center.longitude, center.latitude] },
        properties: {
          id: center.id || center._id || '',
          label: center.name || 'Center',
          kind: 'center',
        },
      }));
  };

  const featureCollection = (features) => ({
    type: 'FeatureCollection',
    features: Array.isArray(features) ? features : [],
  });


  const parseRegionParts = (region) => {
    const parts = String(region || '').split(',').map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 3) {
      return { barangay: parts[0], city: parts[1], province: parts.slice(2).join(', ') };
    }
    if (parts.length === 2) {
      return { city: parts[0], province: parts[1] };
    }
    if (parts.length === 1) {
      return { city: parts[0] };
    }
    return {};
  };

  const findDisasterByRegion = (region) => {
    const needle = String(region || '').trim().toLowerCase();
    if (!needle) return null;
    const parts = needle.split(',').map((p) => p.trim()).filter(Boolean);
    const scored = disasterList
      .map((event) => {
        const location = String(event.location || '').toLowerCase();
        let score = 0;
        if (location === needle) score += 100;
        if (location.includes(needle)) score += 50;
        parts.forEach((part) => {
          if (part && location.includes(part)) score += 20;
        });
        return { event, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);
    return scored[0]?.event || null;
  };

  const coordsFromDisaster = (event) => {
    if (!event) return null;
    const lat = typeof event.latitude === 'number' ? event.latitude : parseFloat(event.latitude);
    const lng = typeof event.longitude === 'number' ? event.longitude : parseFloat(event.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return {
      lat,
      lng,
      label: event.location || event.disaster_type || 'Incident',
    };
  };

  const flyToCoordinates = (coords, { zoom = 13 } = {}) => {
    if (!mapRef.current || !coords) return;
    mapRef.current.flyTo({
      center: [coords.lng, coords.lat],
      zoom,
      duration: 1400,
      essential: true,
    });
    setHighlightFeature({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [coords.lng, coords.lat] },
      properties: { label: coords.label || 'Selected' },
    });
  };

  const handleFlyToDetail = async (detail, { persist = true } = {}) => {
    if (!detail) return;
    if (persist) {
      sessionStorage.setItem('drrms:pendingFlyTo', JSON.stringify(detail));
    }
    if (!isMapReady || !mapRef.current) {
      setPendingFlyTo(detail);
      return;
    }
    try {
      if (detail.lat != null && detail.lng != null) {
        flyToCoordinates(
          {
            lat: Number(detail.lat),
            lng: Number(detail.lng),
            label: detail.label || detail.region || 'Selected',
          },
          { zoom: detail.zoom || 13 }
        );
        setPendingFlyTo(null);
        sessionStorage.removeItem('drrms:pendingFlyTo');
        return;
      }

      if (detail.region) {
        const parsed = parseCoordinatesFromText(detail.region);
        if (parsed) {
          flyToCoordinates(parsed, { zoom: detail.zoom || 13 });
          setPendingFlyTo(null);
          sessionStorage.removeItem('drrms:pendingFlyTo');
          return;
        }
        const parts = parseRegionParts(detail.region);
        const coords = await geocodePhilippinesPlace(detail.region, parts);
        if (coords) {
          flyToCoordinates(coords, { zoom: detail.zoom || 13 });
          setPendingFlyTo(null);
          sessionStorage.removeItem('drrms:pendingFlyTo');
          return;
        }
      }
      pushToast('Could not resolve location for map.', 'warning');
    } catch (err) {
      pushToast('Map locate failed.', 'error');
    }
  };

  // Global handler to allow other components to request the map to fly to a location
  React.useEffect(() => {
    const handler = async (e) => {
      const d = e.detail || {};
      handleFlyToDetail(d);
    };
    window.addEventListener('drrms:flyTo', handler);
    return () => window.removeEventListener('drrms:flyTo', handler);
  }, []);

  const resolveAlertCoordinates = async (warning) => {
    const region = warning.region || '';
    const fromText = parseCoordinatesFromText(region);
    if (fromText) return fromText;

    if (warning.linked_event_id) {
      const linked = coordsFromDisaster(findDisasterById(warning.linked_event_id));
      if (linked) return linked;
    }
    const matched = coordsFromDisaster(findDisasterByRegion(region));
    if (matched) return matched;
    return geocodePhilippinesPlace(region, parseRegionParts(region));
  };

  const resolveIncidentCoordinates = async (event) => {
  // 1. Already have valid coords on the mapped event object
  if (Number.isFinite(event.latitude) && Number.isFinite(event.longitude)) {
    return { lat: event.latitude, lng: event.longitude, label: event.zone };
  }

  // 2. Try parsing from zone label string (e.g. legacy "14.5, 121.0" labels)
  const zone = event.zone || '';
  const fromText = parseCoordinatesFromText(zone);
  if (fromText) return fromText;

  // 3. Fall back to geocoding (network call — show loading state)
  return geocodePhilippinesPlace(zone, parseRegionParts(zone));
};

  const handleFeedLocate = async (feedKey, resolver) => {
    setSelectedFeedKey(feedKey);
    setIsLocatingFeed(true);
    setIsAlertsExpanded(false);
    setIsIncidentsExpanded(false);
    try {
      const coords = await resolver();
      if (!coords) {
        pushToast('Could not find that location on the map.', 'warning');
        setHighlightFeature(null);
        return;
      }
      flyToCoordinates(coords);
    } finally {
      setIsLocatingFeed(false);
    }
  };

  const handleAlertClick = (alert) => {
    handleFeedLocate(`alert:${alert.id}`, () => resolveAlertCoordinates(alert.raw));
  };

  const handleIncidentClick = (event) => {
    handleFeedLocate(`incident:${event.id}`, () => resolveIncidentCoordinates(event));
  };

  const pushToast = (message, type = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const clearToasts = () => {
    setToasts([]);
  };

  const sanitizeText = (value) => sanitizeTextInput(value, 300).trim();

  useEffect(() => {
    const events = buildEventFeatures(disasterData || reportData?.recent?.disaster_events || []);
    setEventFeatures(events);
  }, [disasterData, reportData]);

  useEffect(() => {
    const centers = buildCenterFeatures(evacuationData || []);
    setCenterFeatures(centers);
  }, [evacuationData]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return undefined;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '&copy; OpenStreetMap contributors',
          },
        },
        layers: [
          { id: 'osm', type: 'raster', source: 'osm' },
        ],
      },
      center: [PHILIPPINES_CENTER.lng, PHILIPPINES_CENTER.lat],
      zoom: PHILIPPINES_DEFAULT_ZOOM,
      minZoom: 4.5,
      maxZoom: 16,
      maxBounds: philippinesBounds,
      renderWorldCopies: false,
      attributionControl: true,
    });

    mapRef.current = map;

    const handleResize = () => map.resize();
    window.addEventListener('resize', handleResize);

    map.on('load', () => {
      mapReadyRef.current = true;
      setIsMapReady(true);

      map.addSource('events', {
        type: 'geojson',
        data: featureCollection([]),
        cluster: true,
        clusterRadius: 50,
        clusterMaxZoom: 12,
      });

      map.addSource('centers', {
        type: 'geojson',
        data: featureCollection([]),
        cluster: true,
        clusterRadius: 50,
        clusterMaxZoom: 12,
      });

      map.addSource('route', {
        type: 'geojson',
        data: featureCollection([]),
      });

      map.addSource('highlight', {
        type: 'geojson',
        data: featureCollection([]),
      });

      map.addLayer({
        id: 'event-clusters',
        type: 'circle',
        source: 'events',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': 'rgba(239, 68, 68, 0.35)',
          'circle-radius': ['step', ['get', 'point_count'], 22, 10, 28, 30, 36],
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 2,
          'circle-opacity-transition': { duration: 300 },
          'circle-radius-transition': { duration: 300 },
        },
      });

      map.addLayer({
        id: 'event-cluster-count',
        type: 'symbol',
        source: 'events',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': '{point_count_abbreviated}',
          'text-size': 12,
          'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'],
        },
        paint: {
          'text-color': '#ffffff',
          'text-opacity': 0.8,
        },
      });

      map.addLayer({
        id: 'event-points',
        type: 'circle',
        source: 'events',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-radius': [
            'match',
            ['get', 'severity'],
            'Critical', 14,
            'High', 12,
            'Moderate', 11,
            'Low', 10,
            11,
          ],
          'circle-color': [
            'match',
            ['get', 'severity'],
            'Critical', '#ef4444',
            'High', '#f97316',
            'Moderate', '#fbbf24',
            'Low', '#38bdf8',
            '#f87171',
          ],
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 3,
          'circle-opacity': 1,
          'circle-opacity-transition': { duration: 300 },
          'circle-radius-transition': { duration: 300 },
        },
      });

      map.addLayer({
        id: 'event-latest-ring',
        type: 'circle',
        source: 'events',
        filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'is_latest'], true]],
        paint: {
          'circle-radius': 26,
          'circle-color': 'rgba(239, 68, 68, 0.2)',
          'circle-stroke-color': '#ef4444',
          'circle-stroke-width': 2,
          'circle-opacity': 1,
          'circle-opacity-transition': { duration: 400 },
        },
      });

      map.addLayer({
        id: 'event-labels',
        type: 'symbol',
        source: 'events',
        filter: ['!', ['has', 'point_count']],
        minzoom: 5,
        layout: {
          'text-field': ['get', 'label'],
          'text-size': 11,
          'text-offset': [0, 1.2],
        },
        paint: {
          'text-color': '#e2e8f0',
          'text-opacity': 0.7,
        },
      });

      map.addLayer({
        id: 'center-clusters',
        type: 'circle',
        source: 'centers',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': 'rgba(168,199,250,0.2)',
          'circle-radius': ['step', ['get', 'point_count'], 14, 10, 18, 30, 26],
          'circle-stroke-color': 'rgba(168,199,250,0.6)',
          'circle-stroke-width': 1,
          'circle-opacity-transition': { duration: 300 },
          'circle-radius-transition': { duration: 300 },
        },
      });

      map.addLayer({
        id: 'center-cluster-count',
        type: 'symbol',
        source: 'centers',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': '{point_count_abbreviated}',
          'text-size': 12,
          'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'],
        },
        paint: {
          'text-color': '#ffffff',
          'text-opacity': 0.9,
        },
      });

      map.addLayer({
        id: 'center-points',
        type: 'circle',
        source: 'centers',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-radius': 11,
          'circle-color': '#60a5fa',
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 3,
          'circle-opacity': 1,
          'circle-opacity-transition': { duration: 300 },
          'circle-radius-transition': { duration: 300 },
        },
      });

      map.addLayer({
        id: 'center-labels',
        type: 'symbol',
        source: 'centers',
        filter: ['!', ['has', 'point_count']],
        minzoom: 5,
        layout: {
          'text-field': ['get', 'label'],
          'text-size': 11,
          'text-offset': [0, 1.2],
        },
        paint: {
          'text-color': '#a8c7fa',
          'text-opacity': 0.8,
        },
      });

      map.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'route',
        paint: {
          'line-color': 'rgba(168,199,250,0.95)',
          'line-width': 6,
          'line-opacity': 0.95,
          'line-gap-width': 0,
          'line-opacity-transition': { duration: 400 },
        },
      });

      // Glow / outline underneath for better visibility
      map.addLayer({
        id: 'route-outline',
        type: 'line',
        source: 'route',
        paint: {
          'line-color': 'rgba(20,30,40,0.85)',
          'line-width': 12,
          'line-opacity': 0.6,
        },
        beforeId: 'route-line',
      });

      // Symbol layer for route ETA label (uses the point feature in the same source)
      map.addLayer({
        id: 'route-label',
        type: 'symbol',
        source: 'route',
        layout: {
          'text-field': ['coalesce', ['get', 'label'], ''],
          'text-size': 14,
          'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'],
          'text-offset': [0, -1.2],
          'text-anchor': 'bottom',
          'icon-image': 'marker-15',
        },
        paint: {
          'text-color': '#ffffff',
          'text-halo-color': 'rgba(0,0,0,0.7)',
          'text-halo-width': 1.5,
        },
      });

      map.addLayer({
        id: 'highlight-pulse-outer',
        type: 'circle',
        source: 'highlight',
        paint: {
          'circle-radius': 36,
          'circle-color': 'rgba(239, 68, 68, 0.18)',
          'circle-stroke-color': '#ef4444',
          'circle-stroke-width': 2,
          'circle-opacity': 0.95,
        },
      });

      map.addLayer({
        id: 'highlight-pulse-mid',
        type: 'circle',
        source: 'highlight',
        paint: {
          'circle-radius': 22,
          'circle-color': 'rgba(239, 68, 68, 0.45)',
          'circle-stroke-color': '#fca5a5',
          'circle-stroke-width': 3,
          'circle-opacity': 1,
        },
      });

      map.addLayer({
        id: 'highlight-core',
        type: 'circle',
        source: 'highlight',
        paint: {
          'circle-radius': 12,
          'circle-color': '#ef4444',
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 4,
          'circle-opacity': 1,
        },
      });

      window.setTimeout(() => map.resize(), 150);
    });

    return () => {
      window.removeEventListener('resize', handleResize);
      mapReadyRef.current = false;
      map.remove();
      mapRef.current = null;
      hasFitBoundsRef.current = false;
    };
  }, []);

  useEffect(() => {
    const storedFlyTo = sessionStorage.getItem('drrms:pendingFlyTo');
    if (storedFlyTo) {
      try {
        const parsed = JSON.parse(storedFlyTo);
        setPendingFlyTo(parsed);
      } catch (err) {
        sessionStorage.removeItem('drrms:pendingFlyTo');
      }
    }
  }, []);

  useEffect(() => {
    if (!pendingFlyTo || !isMapReady) return;
    handleFlyToDetail(pendingFlyTo, { persist: false });
  }, [pendingFlyTo, isMapReady]);

  const syncMapSource = (sourceName, features) => {
    const map = mapRef.current;
    if (!map) return;
    const apply = () => {
      const source = map.getSource(sourceName);
      if (source?.setData) source.setData(featureCollection(features));
    };
    if (mapReadyRef.current) {
      apply();
    } else {
      map.once('load', apply);
    }
  };

  useEffect(() => {
    syncMapSource('events', eventFeatures);
  }, [eventFeatures]);

useEffect(() => {
  syncMapSource('centers', centerFeatures);
}, [centerFeatures]);

  useEffect(() => {
  if (hasFitBoundsRef.current) return;
  const points = [...eventFeatures, ...centerFeatures];
  if (!points.length) return;

  const doFit = () => {
    if (!mapRef.current) return;
    const bounds = points.reduce(
      (acc, feature) => acc.extend(feature.geometry.coordinates),
      new maplibregl.LngLatBounds(
        points[0].geometry.coordinates,
        points[0].geometry.coordinates,
      ),
    );
    mapRef.current.fitBounds(bounds, { padding: 60, duration: 800, maxZoom: 9 });
    hasFitBoundsRef.current = true;
  };

  if (mapReadyRef.current) {
    doFit();
  } else if (mapRef.current) {
    mapRef.current.once('load', doFit);
  }
}, [eventFeatures, centerFeatures]);

  useEffect(() => {
    let isActive = true;
    const buildRoute = async () => {
      if (manualRouteRequest?.origin && manualRouteRequest?.destination) {
        const route = await fetchRoute(manualRouteRequest.origin, manualRouteRequest.destination);
        if (isActive) {
          if (route) {
            setRouteFeature(route.lineFeature || null);
            setRouteLabelFeature(route.labelPoint || null);
          } else {
            setRouteFeature(null);
            setRouteLabelFeature(null);
          }
        }
        return;
      }
      if (!eventFeatures.length || !centerFeatures.length) {
        if (isActive) {
          setRouteFeature(null);
          setRouteLabelFeature(null);
        }
        return;
      }
      const origin = eventFeatures.find((feature) => feature.properties?.is_latest) || eventFeatures[0];
      const originCoords = {
        lat: origin.geometry.coordinates[1],
        lng: origin.geometry.coordinates[0],
      };
      let nearest = null;
      let nearestDistance = Number.POSITIVE_INFINITY;
      centerFeatures.forEach((feature) => {
        const coords = {
          lat: feature.geometry.coordinates[1],
          lng: feature.geometry.coordinates[0],
        };
        const distance = haversineDistance(originCoords, coords);
        if (distance < nearestDistance) {
          nearest = coords;
          nearestDistance = distance;
        }
      });
      if (!nearest) {
        if (isActive) setRouteFeature(null);
        return;
      }
      const route = await fetchRoute(originCoords, nearest);
      if (isActive) {
        if (route) {
          setRouteFeature(route.lineFeature || null);
          setRouteLabelFeature(route.labelPoint || null);
        } else {
          setRouteFeature(null);
          setRouteLabelFeature(null);
        }
      }
    };
    buildRoute();
    return () => {
      isActive = false;
    };
  }, [eventFeatures, centerFeatures, manualRouteRequest, routeRequestKey]);

  useEffect(() => {
    const storedRoute = sessionStorage.getItem('drrms:pendingRoute');
    if (storedRoute) {
      try {
        const parsed = JSON.parse(storedRoute);
        if (parsed?.origin && parsed?.destination) {
          setManualRouteRequest(parsed);
        }
      } catch (err) {
        // Ignore malformed persisted route data.
      }
      sessionStorage.removeItem('drrms:pendingRoute');
    }

    const handler = (e) => {
      const detail = e.detail || {};
      const { origin, destination } = detail;
      if (!origin || !destination) return;
      sessionStorage.setItem('drrms:pendingRoute', JSON.stringify({ origin, destination }));
      setManualRouteRequest({ origin, destination });
    };
    window.addEventListener('drrms:showRoute', handler);
    return () => window.removeEventListener('drrms:showRoute', handler);
  }, []);

  useEffect(() => {
    if (!mapReadyRef.current || !mapRef.current) return;
    const source = mapRef.current.getSource('route');
    if (source?.setData) {
      const features = [];
      if (routeFeature) features.push(routeFeature);
      if (routeLabelFeature) features.push(routeLabelFeature);
      source.setData(featureCollection(features));
    }
  }, [routeFeature, routeLabelFeature]);

  useEffect(() => {
    if (!manualRouteRequest || !mapReadyRef.current || !mapRef.current) return;
    const map = mapRef.current;
    const coords = [];
    if (routeFeature?.geometry?.coordinates?.length) {
      coords.push(...routeFeature.geometry.coordinates);
    } else {
      const origin = manualRouteRequest.origin;
      const destination = manualRouteRequest.destination;
      if (origin) coords.push([origin.lng, origin.lat]);
      if (destination) coords.push([destination.lng, destination.lat]);
    }
    if (!coords.length) return;
    const bounds = coords.reduce(
      (acc, point) => acc.extend(point),
      new maplibregl.LngLatBounds(coords[0], coords[0])
    );
    map.fitBounds(bounds, { padding: 80, duration: 900, maxZoom: 13 });
  }, [manualRouteRequest, routeFeature]);

  useEffect(() => {
    if (!mapReadyRef.current || !mapRef.current) return;
    const source = mapRef.current.getSource('highlight');
    if (source?.setData) {
      source.setData(
        highlightFeature ? featureCollection([highlightFeature]) : featureCollection([])
      );
    }
  }, [highlightFeature]);

  useEffect(() => {
    if (!mapContainerRef.current || !mapRef.current) return undefined;
    const observer = new ResizeObserver(() => {
      mapRef.current?.resize();
    });
    observer.observe(mapContainerRef.current);
    return () => observer.disconnect();
  }, []);

  const validateAlert = () => {
    const nextErrors = {};
    if (!sanitizeText(alertType)) nextErrors.alertType = true;
    if (!sanitizeText(targetRegion)) nextErrors.targetRegion = true;
    if (!sanitizeText(disasterType)) nextErrors.disasterType = true;
    if (!sanitizeText(telemetryMessage)) nextErrors.telemetryMessage = true;

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      pushToast('Please fill out all required fields.', 'warning');
      return false;
    }
    return true;
  };

  const resetAlertForm = () => {
    setAlertType('');
    setTargetRegion('');
    setDisasterType('');
    setTelemetryMessage('');
    setErrors({});
    setEditingWarningId('');
  };

  const handleCloseAlertModal = () => {
    setAlertModalOpen(false);
    resetAlertForm();
  };

  const handleEditAlert = (warning) => {
    setEditingWarningId(warning.id || warning._id || '');
    setAlertType(warning.warning_type || '');
    setTargetRegion(warning.region || '');
    setDisasterType(warning.disaster_type || '');
    setTelemetryMessage(warning.message || '');
    setErrors({});
    setAlertModalOpen(true);
  };

  const handleDeleteAlert = (warning) => {
    if (!warning?.id && !warning?._id) return;
    setDeleteTarget(warning);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    const warningId = deleteTarget?.id || deleteTarget?._id;
    if (!warningId) return;
    try {
      await request(`/api/v1/warnings/${warningId}`, { method: 'DELETE' });
      setWarningsData((prev) => (Array.isArray(prev)
        ? prev.filter((item) => (item.id || item._id) !== warningId)
        : prev));
      pushToast('Alert deleted.', 'success');
    } catch (err) {
      pushToast(err?.message || 'Failed to delete alert.', 'error');
    } finally {
      setDeleteModalOpen(false);
      setDeleteTarget(null);
    }
  };

  const handleBroadcastAlert = async () => {
    if (!validateAlert()) return;
    setIsSubmitting(true);
    try {
      const payload = {
        warning_type: alertType,
        region: targetRegion,
        disaster_type: disasterType,
        message: telemetryMessage,
      };
      if (editingWarningId) {
        const updated = await request(`/api/v1/warnings/${editingWarningId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        setWarningsData((prev) => (Array.isArray(prev)
          ? prev.map((item) => ((item.id || item._id) === editingWarningId ? updated : item))
          : prev));
        pushToast('Alert updated successfully.', 'success');
      } else {
        const created = await request('/api/v1/warnings/', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setWarningsData((prev) => [created, ...(Array.isArray(prev) ? prev : [])]);
        pushToast(`${sanitizeText(alertType) || 'Alert'} broadcasted to network.`, 'success');
      }
      setAlertModalOpen(false);
      resetAlertForm();
    } catch (err) {
      pushToast(err?.message || 'Failed to broadcast alert.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const recentAlerts = (warningsData || []).slice(0, 5).map((warning) => ({
    id: warning.id || warning._id || 'AL-000',
    type: warning.warning_type || 'Alert',
    region: warning.region || 'Unknown',
    disaster: warning.disaster_type || 'Unknown',
    label: warning.warning_type || 'Alert',
    raw: warning,
  }));

  return (
    <div className="dashboard-view fade-in">
      <header className="view-header">
        <div className="header-meta">
          <h1>Network Overview</h1>
          <p>Global situational awareness and resource telemetry.</p>
        </div>
        <div className="header-actions">
          <button className="labs-btn-large" onClick={() => setAlertModalOpen(true)}>
            <span className="material-symbols-rounded">add</span>
            New Alert
          </button>
        </div>
      </header>

      <div className="typo-stats-grid">
        {statistics.map((stat, i) => (
          <div className="typo-stat-card" key={i}>
            <div className="typo-value">{stat.value}</div>
            <div className="typo-label">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="telemetry-section">
        <div className="section-title">
          <h2>Live Telemetry Feed</h2>
          <button className="labs-btn-ghost">Export Log</button>
        </div>

        <div className="telemetry-layout">
          <div className="feed-panel">
            <div className={`feed-column alert-panel${isAlertsExpanded ? ' is-expanded' : ' is-collapsed'}`}>
              <button
                type="button"
                className="feed-dropdown-trigger"
                aria-expanded={isAlertsExpanded}
                onClick={toggleAlertsFeed}
              >
                <span className="feed-dropdown-title">System Alerts</span>
                <span className="feed-dropdown-meta">{recentAlerts.length} items</span>
                <span className="material-symbols-rounded">{isAlertsExpanded ? 'expand_less' : 'expand_more'}</span>
              </button>
              {isAlertsExpanded && (
                <div className="feed-dropdown-body">
                  <div className="incident-list">
                    {recentAlerts.length === 0 ? (
                      <div className="incident-row">
                        <div className="incident-row-header">
                          <span className="mono-label">No alerts yet</span>
                        </div>
                        <div className="incident-type">Broadcast an alert to populate this feed.</div>
                      </div>
                    ) : (
                      recentAlerts.map((alert) => (
                        <div
                          className={`incident-row${selectedFeedKey === `alert:${alert.id}` ? ' is-selected' : ''}${isLocatingFeed && selectedFeedKey === `alert:${alert.id}` ? ' is-locating' : ''}`}
                          key={alert.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => handleAlertClick(alert)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              handleAlertClick(alert);
                            }
                          }}
                        >
                          <div className="incident-row-header">
                            <span className="mono-label">{alert.label}</span>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              <span className="alert-badge">{alert.disaster}</span>
                              <button
                                type="button"
                                className="edit-icon-btn"
                                title="Edit alert"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditAlert(alert.raw);
                                }}
                              >
                                <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>edit</span>
                              </button>
                              <button
                                type="button"
                                className="delete-icon-btn"
                                title="Delete alert"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteAlert(alert.raw);
                                }}
                              >
                                <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>delete</span>
                              </button>
                            </div>
                          </div>
                          <div className="incident-type">{alert.type}</div>
                          <div className="incident-location">
                            <span className="material-symbols-rounded">campaign</span>
                            {alert.region}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className={`feed-column${isIncidentsExpanded ? ' is-expanded' : ' is-collapsed'}`}>
              <button
                type="button"
                className="feed-dropdown-trigger"
                aria-expanded={isIncidentsExpanded}
                onClick={toggleIncidentsFeed}
              >
                <span className="feed-dropdown-title">Incident Feed</span>
                <span className="feed-dropdown-meta">{recentEvents.length} items</span>
                <span className="material-symbols-rounded">{isIncidentsExpanded ? 'expand_less' : 'expand_more'}</span>
              </button>
              {isIncidentsExpanded && (
                <div className="feed-dropdown-body">
                  <div className="incident-list">
                    {recentEvents.length === 0 ? (
                      <div className="incident-row">
                        <div className="incident-row-header">
                          <span className="mono-label">No incidents</span>
                        </div>
                        <div className="incident-type">Log an incident to see it here and on the map.</div>
                      </div>
                    ) : (
                      recentEvents.map((event) => (
                        <div
                          className={`incident-row severity-${event.severity.toLowerCase()}${selectedFeedKey === `incident:${event.id}` ? ' is-selected' : ''}${isLocatingFeed && selectedFeedKey === `incident:${event.id}` ? ' is-locating' : ''}`}
                          key={event.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => handleIncidentClick(event)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              handleIncidentClick(event);
                            }
                          }}
                        >
                          <div className="incident-row-header">
                            <span className="mono-label">{event.type}</span>
                            <span className="severity-badge">{event.severity}</span>
                          </div>
                          <div className="incident-type">{event.type}</div>
                          <div className="incident-location">
                            <span className="material-symbols-rounded">my_location</span>
                            {event.zone}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="map-panel">
            <div ref={mapContainerRef} className="realtime-map" />
          </div>
        </div>
      </div>

      <Modal
        isOpen={isAlertModalOpen}
        onClose={handleCloseAlertModal}
        title={editingWarningId ? 'Edit System Alert' : 'Broadcast System Alert'}
        actionText={isSubmitting ? "Saving..." : (editingWarningId ? 'Save Changes' : 'Broadcast Alert')}
        onAction={handleBroadcastAlert}
      >
        <div className="labs-form-group">
          <label>Alert Type</label>
          <LabsDropdown
            options={["Severe Weather Warning", "Evacuation Notice", "System Infrastructure Failure"]}
            value={alertType}
            onChange={(value) => {
              setAlertType(value);
              if (errors.alertType) setErrors((prev) => ({ ...prev, alertType: false }));
            }}
            placeholder="Select an alert type..."
            hasError={errors.alertType}
          />
        </div>
        <div className="labs-form-group">
          <label>Disaster Type</label>
          <LabsDropdown
            options={["Typhoon", "Flood", "Earthquake", "Wildfire", "Landslide"]}
            value={disasterType}
            onChange={(value) => {
              setDisasterType(value);
              if (errors.disasterType) setErrors((prev) => ({ ...prev, disasterType: false }));
            }}
            placeholder="Select a disaster type..."
            hasError={errors.disasterType}
          />
        </div>
        <div className="labs-form-group">
          <label>Target Region</label>
          <PhilippinesLocationPicker
            label=""
            onChange={(value) => {
              setTargetRegion(value);
              if (errors.targetRegion) setErrors((prev) => ({ ...prev, targetRegion: false }));
            }}
          />
        </div>
        <div className="labs-form-group">
          <label>Telemetry Message</label>
          <textarea
            className={`labs-input${errors.telemetryMessage ? ' is-invalid' : ''}`}
            rows="3"
            placeholder="Enter situation report..."
            style={{ resize: 'none' }}
            value={telemetryMessage}
            maxLength={300}
            onChange={(e) => {
              setTelemetryMessage(sanitizeTextInput(e.target.value, 300));
              if (errors.telemetryMessage) setErrors((prev) => ({ ...prev, telemetryMessage: false }));
            }}
            aria-invalid={!!errors.telemetryMessage}
          ></textarea>
        </div>
      </Modal>

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setDeleteTarget(null);
        }}
        title="Delete Alert"
        actionText="Delete Alert"
        onAction={handleConfirmDelete}
      >
        <div className="delete-modal-message">
          This alert will be permanently removed from the feed.
          <div className="delete-modal-meta">
            {deleteTarget?.warning_type || deleteTarget?.region || 'Selected alert'}
          </div>
        </div>
      </Modal>

      <Toast toasts={toasts} onCloseAll={clearToasts} />
    </div>
  );
};

export default Dashboard;