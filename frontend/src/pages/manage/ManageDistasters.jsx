import React, { useState, useCallback } from 'react';
import Modal from '../../components/ui/Modal';
import LabsDropdown from '../../components/ui/LabsDropdown';
import PhilippinesLocationPicker from '../../components/forms/PhilippinesLocationPicker';
import Toast from '../../components/ui/Toast';
import { useRealtimeStream } from '../../hooks/useRealtimeStream';
import { useApi } from '../../hooks/useApi';
import { coordinateOnly, digitsOnly, sanitizeTextInput } from '../../utils/formGuards';
import { locationFieldsFromDetail, toPickerValue } from '../../utils/locationValue';
import { isWithinPhilippines } from '../../utils/philippinesGeo';
import './ManagePages.css';
import useRequireAuth from '../../hooks/useRequireAuth';

// ---------------------------------------------------------------------------
// Normalize MongoDB _id — Beanie may return { $oid: "..." } or a plain string
// ---------------------------------------------------------------------------
const normalizeId = (raw) => {
  if (!raw) return '';
  if (typeof raw === 'string') return raw;
  if (typeof raw === 'object' && raw.$oid) return raw.$oid;
  return String(raw);
};

const ManageDisasters = () => {
  useRequireAuth();
  const [isIncidentModalOpen, setIncidentModalOpen] = useState(false);
  const [disasterType, setDisasterType] = useState('');
  const [severity, setSeverity] = useState('');
  const [locationLabel, setLocationLabel] = useState('');
  const [locationDetail, setLocationDetail] = useState(null);
  const [pickerValue, setPickerValue] = useState(null);
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [dateOccurred, setDateOccurred] = useState(() => new Date().toISOString().slice(0, 10));
  const [durationDays, setDurationDays] = useState('');
  const [status, setStatus] = useState('Ongoing');
  const [errors, setErrors] = useState({});
  const [toasts, setToasts] = useState([]);
  const [editingIncidentId, setEditingIncidentId] = useState('');
  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const { data: disasterEvents, setData: setDisasterEvents } = useRealtimeStream('/api/v1/stream/disasters', []);
  const { request } = useApi();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeCount = (disasterEvents || []).filter((event) => event.status === 'Ongoing').length;
  const criticalCount = (disasterEvents || []).filter((event) => event.severity_level === 'Critical').length;
  const stats = [
    { label: 'Active Incidents', value: String(activeCount).padStart(2, '0') },
    { label: 'Critical Zones', value: String(criticalCount).padStart(2, '0') },
  ];

  // FIX: normalize id via normalizeId(); keep latitude/longitude as numbers so
  // the Overview Dashboard can use them directly without re-parsing.
  const disasters = (disasterEvents || []).map((event) => {
    const id = normalizeId(event.id || event._id);
    return {
      id: id || `dr-${Math.random().toString(36).slice(2)}`,
      type: event.disaster_type || 'Unknown',
      location: event.location || 'Unknown Area',
      severity: event.severity_level || 'Moderate',
      status: event.status === 'Ongoing' ? 'Active' : (event.status || 'Monitoring'),
      // Expose numeric coords so parent/sibling pages can flyTo without geocoding
      latitude: typeof event.latitude === 'number' ? event.latitude : Number.parseFloat(event.latitude) || null,
      longitude: typeof event.longitude === 'number' ? event.longitude : Number.parseFloat(event.longitude) || null,
    };
  });

  const pushToast = (message, type = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const clearToasts = () => {
    setToasts([]);
  };

  const sanitizeText = (value) => sanitizeTextInput(value, 200).trim();

  // FIX: parse to Number, not string — prevents isWithinPhilippines receiving strings
  const parseCoordinatePair = (value) => {
    if (!value || typeof value !== 'string') return null;
    const match = value.match(/-?\d+(?:\.\d+)?/g);
    if (!match || match.length < 2) return null;
    const lat = Number.parseFloat(match[0]);
    const lng = Number.parseFloat(match[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  };

  const isValidLat = (value) => {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) && parsed >= -90 && parsed <= 90;
  };

  const isValidLng = (value) => {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) && parsed >= -180 && parsed <= 180;
  };

  const validateIncident = () => {
    const nextErrors = {};
    if (!sanitizeText(disasterType)) nextErrors.disasterType = true;
    if (!sanitizeText(severity)) nextErrors.severity = true;
    if (!isValidLat(latitude) || !isWithinPhilippines(Number.parseFloat(latitude), Number.parseFloat(longitude))) nextErrors.latitude = true;
    if (!isValidLng(longitude) || !isWithinPhilippines(Number.parseFloat(latitude), Number.parseFloat(longitude))) nextErrors.longitude = true;
    if (!sanitizeText(dateOccurred)) nextErrors.dateOccurred = true;
    if (!sanitizeText(status)) nextErrors.status = true;

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      pushToast(
        nextErrors.latitude || nextErrors.longitude
          ? 'Location must be within the Philippines with valid coordinates.'
          : 'Please fill out all required fields.',
        'warning'
      );
      return false;
    }
    return true;
  };

  const resetIncidentForm = () => {
    setDisasterType('');
    setSeverity('');
    setLocationLabel('');
    setLocationDetail(null);
    setPickerValue(null);
    setLatitude('');
    setLongitude('');
    setDateOccurred(new Date().toISOString().slice(0, 10));
    setDurationDays('');
    setStatus('Ongoing');
    setErrors({});
    setEditingIncidentId('');
  };

  const handleCloseIncidentModal = () => {
    setIncidentModalOpen(false);
    resetIncidentForm();
  };

  const handleEditIncident = (incident) => {
    setEditingIncidentId(normalizeId(incident.id || incident._id));
    setDisasterType(incident.disaster_type || '');
    setSeverity(incident.severity_level || '');
    setLocationLabel(incident.location || '');
    setLocationDetail(locationFieldsFromDetail(incident));
    setPickerValue(toPickerValue(incident));
    if (incident.latitude != null && incident.longitude != null) {
      setLatitude(String(incident.latitude));
      setLongitude(String(incident.longitude));
    } else {
      const parsed = parseCoordinatePair(incident.location || '');
      setLatitude(parsed ? String(parsed.lat) : '');
      setLongitude(parsed ? String(parsed.lng) : '');
    }
    setDateOccurred(
      incident.date_occurred
        ? new Date(incident.date_occurred).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10)
    );
    setDurationDays(incident.duration_days ? String(incident.duration_days) : '');
    setStatus(incident.status || 'Ongoing');
    setErrors({});
    setIncidentModalOpen(true);
  };

  const handleDeleteIncident = (incident) => {
    const id = normalizeId(incident?.id || incident?._id);
    if (!id) return;
    setDeleteTarget(incident);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    const incidentId = normalizeId(deleteTarget?.id || deleteTarget?._id);
    if (!incidentId) return;
    try {
      await request(`/api/v1/disasters/${incidentId}`, { method: 'DELETE' });
      setDisasterEvents((prev) => (Array.isArray(prev)
        ? prev.filter((item) => normalizeId(item.id || item._id) !== incidentId)
        : prev));
      pushToast('Incident deleted.', 'success');
    } catch (err) {
      pushToast(err?.message || 'Failed to delete incident.', 'error');
    } finally {
      setDeleteModalOpen(false);
      setDeleteTarget(null);
    }
  };

  const handleLogIncident = async () => {
    if (!validateIncident()) return;
    setIsSubmitting(true);
    try {
      const normalizedLocation = locationLabel || `${latitude}, ${longitude}`;
      const payload = {
        disaster_type: disasterType,
        location: normalizedLocation,
        ...locationFieldsFromDetail(locationDetail),
        latitude: Number.parseFloat(latitude),
        longitude: Number.parseFloat(longitude),
        date_occurred: new Date(dateOccurred).toISOString(),
        severity_level: severity,
        duration_days: durationDays ? Number(durationDays) : null,
        status,
      };
      if (editingIncidentId) {
        const updated = await request(`/api/v1/disasters/${editingIncidentId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        setDisasterEvents((prev) => (Array.isArray(prev)
          ? prev.map((item) => (normalizeId(item.id || item._id) === editingIncidentId ? updated : item))
          : prev));
        pushToast('Incident updated successfully.', 'success');
      } else {
        const created = await request('/api/v1/disasters/', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setDisasterEvents((prev) => [created, ...(Array.isArray(prev) ? prev : [])]);
        pushToast('New Incident added to Threat Directory.', 'success');
      }
      setIncidentModalOpen(false);
      resetIncidentForm();
    } catch (err) {
      pushToast(err?.message || 'Failed to add incident.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- STABLE CALLBACKS TO PREVENT INFINITE RENDERING LOOPS ---
  const handleLocationChange = useCallback((value) => {
    setLocationLabel(value);
  }, []);

  const handleLocationDetail = useCallback((detail) => {
    setLocationDetail(detail);
  }, []);

  const handleCoordinates = useCallback((coords) => {
    setLatitude(String(coords.lat));
    setLongitude(String(coords.lng));

    // Only update errors state if an error actually exists to prevent unnecessary renders
    setErrors((prev) => {
      if (prev.latitude || prev.longitude) {
        return { ...prev, latitude: false, longitude: false };
      }
      return prev;
    });
  }, []);

  return (
    <div className="dashboard-view fade-in">
      <header className="view-header">
        <div className="header-meta">
          <h1>Active Incidents</h1>
          <p>Live monitoring of environmental hazards and emergencies.</p>
        </div>
        <div className="header-actions">
          <button className="labs-btn-large" onClick={() => setIncidentModalOpen(true)}>
            <span className="material-symbols-rounded">add</span> Log Incident
          </button>
        </div>
      </header>

      <div className="typo-stats-grid">
        {stats.map((stat, i) => (
          <div className="typo-stat-card" key={i}>
            <div className="typo-value">{stat.value}</div>
            <div className="typo-label">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="labs-data-section">
        <div className="section-title">
          <h2>Threat Directory</h2>
          <button className="labs-btn-ghost">Filter Grid</button>
        </div>

        <div className="labs-scroll-area">
          <div className="incident-grid">
            {disasters.map((incident) => (
              <div className="incident-card" key={incident.id}>
                <div className="card-header-flex">
                  <span
                    className={`severity-badge severity-${incident.severity.toLowerCase()}`}
                    style={{ fontSize: '0.8rem', padding: '4px 12px' }}
                  >
                    {incident.severity}
                  </span>
                  <span className="mono-label">Incident</span>
                </div>
                <div>
                  <h3 style={{ margin: '0 0 12px 0', fontSize: '1.8rem', fontWeight: '400', color: '#fff', letterSpacing: '-1px' }}>
                    {incident.type}
                  </h3>
                  <div className="incident-location" style={{ fontSize: '1rem' }}>
                    <span className="material-symbols-rounded">location_on</span> {incident.location}
                  </div>
                </div>
                <div
                  className="card-header-flex"
                  style={{ marginTop: 'auto', paddingTop: '24px', borderTop: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <span className="incident-status" style={{ fontWeight: 500 }}>{incident.status}</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="labs-btn-ghost">Take Action</button>
                    <button
                      className="edit-icon-btn"
                      title="Edit incident"
                      onClick={() => {
                        const raw = (disasterEvents || []).find(
                          (item) => normalizeId(item.id || item._id) === incident.id
                        );
                        handleEditIncident(raw || {});
                      }}
                    >
                      <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>edit</span>
                    </button>
                    <button
                      className="delete-icon-btn"
                      title="Delete incident"
                      onClick={() => {
                        const raw = (disasterEvents || []).find(
                          (item) => normalizeId(item.id || item._id) === incident.id
                        );
                        handleDeleteIncident(raw || {});
                      }}
                    >
                      <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>delete</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Modal
        isOpen={isIncidentModalOpen}
        onClose={handleCloseIncidentModal}
        title={editingIncidentId ? 'Edit Incident' : 'Log New Incident'}
        actionText={isSubmitting ? 'Saving...' : (editingIncidentId ? 'Save Changes' : 'Initialize Tracking')}
        onAction={handleLogIncident}
      >
        <div className="labs-form-group">
          <label>Disaster Type</label>
          <LabsDropdown
            options={['Typhoon', 'Flood', 'Earthquake', 'Wildfire', 'Landslide']}
            value={disasterType}
            onChange={(value) => {
              setDisasterType(value);
              if (errors.disasterType) setErrors((prev) => ({ ...prev, disasterType: false }));
            }}
            placeholder="Select Type"
            hasError={errors.disasterType}
          />
        </div>
        <div className="labs-form-group">
          <label>Severity Level</label>
          <LabsDropdown
            options={['Low', 'Moderate', 'High', 'Critical']}
            value={severity}
            onChange={(value) => {
              setSeverity(value);
              if (errors.severity) setErrors((prev) => ({ ...prev, severity: false }));
            }}
            placeholder="Select Severity"
            hasError={errors.severity}
          />
        </div>
        <PhilippinesLocationPicker
          value={pickerValue}
          onChange={handleLocationChange}
          onLocationDetail={handleLocationDetail}
          onCoordinates={handleCoordinates}
        />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div className="labs-form-group">
            <label>Latitude</label>
            <input
              type="text"
              inputMode="decimal"
              className={`labs-input${errors.latitude ? ' is-invalid' : ''}`}
              placeholder="e.g. 14.5995"
              value={latitude}
              onChange={(e) => {
                setLatitude(coordinateOnly(e.target.value, 12));
                if (errors.latitude) setErrors((prev) => ({ ...prev, latitude: false }));
              }}
              aria-invalid={!!errors.latitude}
            />
          </div>
          <div className="labs-form-group">
            <label>Longitude</label>
            <input
              type="text"
              inputMode="decimal"
              className={`labs-input${errors.longitude ? ' is-invalid' : ''}`}
              placeholder="e.g. 120.9842"
              value={longitude}
              onChange={(e) => {
                setLongitude(coordinateOnly(e.target.value, 12));
                if (errors.longitude) setErrors((prev) => ({ ...prev, longitude: false }));
              }}
              aria-invalid={!!errors.longitude}
            />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div className="labs-form-group">
            <label>Date Occurred</label>
            <input
              type="date"
              className={`labs-input${errors.dateOccurred ? ' is-invalid' : ''}`}
              value={dateOccurred}
              onChange={(e) => {
                setDateOccurred(e.target.value);
                if (errors.dateOccurred) setErrors((prev) => ({ ...prev, dateOccurred: false }));
              }}
              aria-invalid={!!errors.dateOccurred}
            />
          </div>
          <div className="labs-form-group">
            <label>Duration (Days)</label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              className="labs-input"
              placeholder="Optional"
              value={durationDays}
              onChange={(e) => setDurationDays(digitsOnly(e.target.value, 3))}
            />
          </div>
        </div>
        <div className="labs-form-group">
          <label>Status</label>
          <LabsDropdown
            options={['Ongoing', 'Resolved']}
            value={status}
            onChange={(value) => {
              setStatus(value);
              if (errors.status) setErrors((prev) => ({ ...prev, status: false }));
            }}
            placeholder="Select Status"
            hasError={errors.status}
          />
        </div>
      </Modal>

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setDeleteTarget(null);
        }}
        title="Delete Incident"
        actionText="Delete Incident"
        onAction={handleConfirmDelete}
      >
        <div className="delete-modal-message">
          This incident will be permanently removed from the directory.
          <div className="delete-modal-meta">
            {deleteTarget?.disaster_type || deleteTarget?.location || 'Selected incident'}
          </div>
        </div>
      </Modal>

      <Toast toasts={toasts} onCloseAll={clearToasts} />
    </div>
  );
};

export default ManageDisasters;