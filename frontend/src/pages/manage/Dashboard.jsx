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
import './Dashboard.css';

const Dashboard = () => {
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
  const philippinesBounds = [[116.0, 4.2], [127.7, 21.3]];

  const hashToPercent = (value, offset) => {
    const seed = `${value}-${offset}`;
    let hash = 0;
    for (let i = 0; i < seed.length; i += 1) {
      hash = (hash * 31 + seed.charCodeAt(i)) % 100;
    }
    return Math.max(8, Math.min(92, hash));
  };

  const totals = reportData?.totals || {};
  const statistics = [
    { label: 'Active Incidents', value: String(totals.active_disasters ?? 0).padStart(2, '0') },
    { label: 'Deployed Units', value: String(totals.response_teams ?? 0).padStart(2, '0') },
    { label: 'Available Beds', value: String(totals.evacuation_centers ?? 0).padStart(2, '0') },
    { label: 'Relief Kits', value: String(totals.relief_operations ?? 0).padStart(2, '0') },
  ];

  const recentEvents = (reportData?.recent?.disaster_events || []).map((event) => {
    const id = event.id || event._id || 'DR-000';
    return {
      id,
      type: event.disaster_type || 'Unknown',
      zone: event.location || 'Unknown Area',
      severity: event.severity_level || 'Moderate',
      status: event.status || 'Ongoing',
      x: hashToPercent(id, 13),
      y: hashToPercent(id, 47),
    };
  });

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
      const geometry = json?.routes?.[0]?.geometry;
      if (!geometry) return null;
      const feature = {
        type: 'Feature',
        geometry,
        properties: {},
      };
      routeCacheRef.current.set(key, feature);
      return feature;
    } catch (err) {
      return null;
    }
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
          id: event.id || event._id || '',
          label: event.disaster_type || 'Event',
          severity: event.severity_level || 'Moderate',
          kind: 'event',
          is_latest: latest ? (latest.id || latest._id) === (event.id || event._id) : false,
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
      center: [121.0, 14.6],
      zoom: 5.2,
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

      map.addLayer({
        id: 'event-clusters',
        type: 'circle',
        source: 'events',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': 'rgba(255,255,255,0.12)',
          'circle-radius': ['step', ['get', 'point_count'], 14, 10, 18, 30, 26],
          'circle-stroke-color': 'rgba(255,255,255,0.4)',
          'circle-stroke-width': 1,
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
          'circle-radius': 5,
          'circle-color': [
            'match',
            ['get', 'severity'],
            'Critical', '#ffffff',
            'High', 'rgba(255,255,255,0.8)',
            'Moderate', 'rgba(255,255,255,0.55)',
            'Low', 'rgba(255,255,255,0.35)',
            'rgba(255,255,255,0.5)'
          ],
          'circle-stroke-color': 'rgba(255,255,255,0.4)',
          'circle-stroke-width': 1,
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
          'circle-radius': 16,
          'circle-color': 'rgba(255,255,255,0.05)',
          'circle-stroke-color': 'rgba(255,255,255,0.7)',
          'circle-stroke-width': 1,
          'circle-opacity': 0.8,
          'circle-opacity-transition': { duration: 400 },
        },
      });

      map.addLayer({
        id: 'event-labels',
        type: 'symbol',
        source: 'events',
        filter: ['!', ['has', 'point_count']],
        minzoom: 8,
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
          'circle-radius': 5,
          'circle-color': 'rgba(168,199,250,0.85)',
          'circle-stroke-color': 'rgba(168,199,250,0.9)',
          'circle-stroke-width': 1,
          'circle-opacity-transition': { duration: 300 },
          'circle-radius-transition': { duration: 300 },
        },
      });

      map.addLayer({
        id: 'center-labels',
        type: 'symbol',
        source: 'centers',
        filter: ['!', ['has', 'point_count']],
        minzoom: 8,
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
          'line-color': 'rgba(168,199,250,0.9)',
          'line-width': 3,
          'line-opacity': 0.85,
          'line-opacity-transition': { duration: 400 },
        },
      });
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
    if (!mapReadyRef.current || !mapRef.current) return;
    const source = mapRef.current.getSource('events');
    if (source?.setData) {
      source.setData(featureCollection(eventFeatures));
    }
  }, [eventFeatures]);

  useEffect(() => {
    if (!mapReadyRef.current || !mapRef.current) return;
    const source = mapRef.current.getSource('centers');
    if (source?.setData) {
      source.setData(featureCollection(centerFeatures));
    }
  }, [centerFeatures]);

  useEffect(() => {
    if (!mapReadyRef.current || !mapRef.current || hasFitBoundsRef.current) return;
    const points = [...eventFeatures, ...centerFeatures];
    if (!points.length) return;
    const bounds = points.reduce((acc, feature) => {
      const [lng, lat] = feature.geometry.coordinates;
      return acc.extend([lng, lat]);
    }, new maplibregl.LngLatBounds(points[0].geometry.coordinates, points[0].geometry.coordinates));
    mapRef.current.fitBounds(bounds, { padding: 60, duration: 800, maxZoom: 9 });
    hasFitBoundsRef.current = true;
  }, [eventFeatures, centerFeatures]);

  useEffect(() => {
    let isActive = true;
    const buildRoute = async () => {
      if (!eventFeatures.length || !centerFeatures.length) {
        if (isActive) setRouteFeature(null);
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
      if (isActive) setRouteFeature(route);
    };
    buildRoute();
    return () => {
      isActive = false;
    };
  }, [eventFeatures, centerFeatures]);

  useEffect(() => {
    if (!mapReadyRef.current || !mapRef.current) return;
    const source = mapRef.current.getSource('route');
    if (source?.setData) {
      source.setData(routeFeature ? featureCollection([routeFeature]) : featureCollection([]));
    }
  }, [routeFeature]);

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
            <div className="alert-panel">
              <div className="section-title" style={{ marginBottom: '12px' }}>
                <h2>System Alerts</h2>
              </div>
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
                    <div className="incident-row" key={alert.id}>
                      <div className="incident-row-header">
                        <span className="mono-label">{alert.label}</span>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <span className="alert-badge">{alert.disaster}</span>
                          <button
                            className="edit-icon-btn"
                            title="Edit alert"
                            onClick={() => handleEditAlert(alert.raw)}
                          >
                            <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>edit</span>
                          </button>
                          <button
                            className="delete-icon-btn"
                            title="Delete alert"
                            onClick={() => handleDeleteAlert(alert.raw)}
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
            <div className="section-title" style={{ marginTop: '16px' }}>
              <h2>Incident Feed</h2>
            </div>
            <div className="incident-list">
              {recentEvents.map(event => (
                <div className={`incident-row severity-${event.severity.toLowerCase()}`} key={event.id}>
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
              ))}
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