import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../../components/ui/Modal';
import LabsDropdown from '../../components/ui/LabsDropdown';
import PhilippinesLocationPicker from '../../components/forms/PhilippinesLocationPicker';
import Toast from '../../components/ui/Toast'; // <-- Import Toast
import { useRealtimeStream } from '../../hooks/useRealtimeStream';
import { useApi } from '../../hooks/useApi';
import { coordinateOnly, digitsOnly, sanitizeTextInput } from '../../utils/formGuards';
import { locationFieldsFromDetail, toPickerValue } from '../../utils/locationValue';
import { isWithinPhilippines } from '../../utils/philippinesGeo';
import './ManagePages.css';
import useRequireAuth from '../../hooks/useRequireAuth';

const ManageEvacuation = () => {
  useRequireAuth();
  const [isShelterModalOpen, setShelterModalOpen] = useState(false);
  const [facilityName, setFacilityName] = useState('');
  const [capacity, setCapacity] = useState('');
  const [currentOccupancy, setCurrentOccupancy] = useState('');
  const [eventId, setEventId] = useState('');
  const [location, setLocation] = useState('');
  const [locationDetail, setLocationDetail] = useState(null);
  const [pickerValue, setPickerValue] = useState(null);
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [manager, setManager] = useState('');
  const [errors, setErrors] = useState({});
  const [toasts, setToasts] = useState([]);
  const { data: centerData, setData: setCenterData } = useRealtimeStream('/api/v1/stream/evacuation', []);
  const { data: disasterEvents } = useRealtimeStream('/api/v1/stream/disasters', []);
  const { request } = useApi();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCenterId, setEditingCenterId] = useState('');
  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const navigate = useNavigate();

  const shelters = (centerData || []).map((center) => ({
    id: center.id || center._id || 'EV-000',
    name: center.name || 'Unnamed Center',
    current: center.current_occupancy ?? 0,
    capacity: center.capacity ?? 0,
  }));

  const totalEvacuees = shelters.reduce((sum, shelter) => sum + (shelter.current || 0), 0);
  const stats = [
    { label: 'Active Centers', value: String(shelters.length).padStart(2, '0') },
    { label: 'Total Evacuees', value: totalEvacuees.toLocaleString() },
  ];
  const eventOptions = (disasterEvents || []).map((event) => {
    const eventIdValue = event.id || event._id || 'DR-000';
    const loc = event.location || (Number.isFinite(event.latitude) && Number.isFinite(event.longitude)
      ? `${Number(event.latitude).toFixed(4)}, ${Number(event.longitude).toFixed(4)}`
      : 'Unknown area');
    const type = event.disaster_type || 'Event';
    const label = `${type} — ${loc}`;
    return { label, value: eventIdValue };
  });

  const pushToast = (message, type = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const clearToasts = () => {
    setToasts([]);
  };

  const sanitizeText = (value) => sanitizeTextInput(value, 200).trim();

  const parseCoordinatePair = (value) => {
    if (!value || typeof value !== 'string') return null;
    const match = value.match(/-?\d+(?:\.\d+)?/g);
    if (!match || match.length < 2) return null;
    return { lat: match[0], lng: match[1] };
  };

  const isValidLat = (value) => {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) && parsed >= -90 && parsed <= 90;
  };

  const isValidLng = (value) => {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) && parsed >= -180 && parsed <= 180;
  };

  const validateShelter = () => {
    const nextErrors = {};
    if (!sanitizeText(eventId)) nextErrors.eventId = true;
    if (!sanitizeText(location)) nextErrors.location = true;
    if (!sanitizeText(facilityName)) nextErrors.facilityName = true;
    if (!sanitizeText(manager)) nextErrors.manager = true;
    if (!isValidLat(latitude) || !isWithinPhilippines(latitude, longitude)) nextErrors.latitude = true;
    if (!isValidLng(longitude) || !isWithinPhilippines(latitude, longitude)) nextErrors.longitude = true;
    if (!capacity || Number(capacity) <= 0) nextErrors.capacity = true;
    if (currentOccupancy !== '' && Number(currentOccupancy) < 0) nextErrors.currentOccupancy = true;

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

  const resetShelterForm = () => {
    setFacilityName('');
    setCapacity('');
    setCurrentOccupancy('');
    setEventId('');
    setLocation('');
    setLocationDetail(null);
    setPickerValue(null);
    setLatitude('');
    setLongitude('');
    setManager('');
    setErrors({});
    setEditingCenterId('');
  };

  const handleCloseShelterModal = () => {
    setShelterModalOpen(false);
    resetShelterForm();
  };

  const handleEditShelter = (center) => {
    setEditingCenterId(center.id || center._id || '');
    setEventId(center.event_id || '');
    setFacilityName(center.name || '');
    setLocation(center.location || '');
    setLocationDetail(locationFieldsFromDetail(center));
    setPickerValue(toPickerValue(center));
    if (center.latitude != null && center.longitude != null) {
      setLatitude(String(center.latitude));
      setLongitude(String(center.longitude));
    } else {
      const parsed = parseCoordinatePair(center.location || '');
      setLatitude(parsed?.lat || '');
      setLongitude(parsed?.lng || '');
    }
    setCapacity(center.capacity ? String(center.capacity) : '');
    setCurrentOccupancy(center.current_occupancy ? String(center.current_occupancy) : '');
    setManager(center.managing_personnel || '');
    setErrors({});
    setShelterModalOpen(true);
  };

  const handleDeleteShelter = (center) => {
    if (!center?.id && !center?._id) return;
    setDeleteTarget(center);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    const centerId = deleteTarget?.id || deleteTarget?._id;
    if (!centerId) return;
    try {
      await request(`/api/v1/evacuation/${centerId}`, { method: 'DELETE' });
      setCenterData((prev) => (Array.isArray(prev)
        ? prev.filter((item) => (item.id || item._id) !== centerId)
        : prev));
      pushToast('Evacuation center deleted.', 'success');
    } catch (err) {
      pushToast(err?.message || 'Failed to delete center.', 'error');
    } finally {
      setDeleteModalOpen(false);
      setDeleteTarget(null);
    }
  };

  const handleOpenShelter = async () => {
    if (!validateShelter()) return;
    setIsSubmitting(true);
    try {
      const selectedEvent = (disasterEvents || []).find((event) => (event.id || event._id) === eventId);
      const normalizedLocation = location || `${latitude}, ${longitude}`;
      const payload = {
        event_id: eventId,
        name: facilityName,
        location: normalizedLocation,
        ...locationFieldsFromDetail(locationDetail),
        latitude: Number.parseFloat(latitude),
        longitude: Number.parseFloat(longitude),
        capacity: Number(capacity),
        current_occupancy: currentOccupancy ? Number(currentOccupancy) : 0,
        managing_personnel: manager,
      };
      if (editingCenterId) {
        const updated = await request(`/api/v1/evacuation/${editingCenterId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        setCenterData((prev) => (Array.isArray(prev)
          ? prev.map((item) => ((item.id || item._id) === editingCenterId ? updated : item))
          : prev));
        pushToast('Evacuation center updated.', 'success');
        if (selectedEvent && Number.isFinite(Number(updated?.latitude)) && Number.isFinite(Number(updated?.longitude))) {
          sessionStorage.setItem('drrms:pendingRoute', JSON.stringify({
            origin: {
              lat: Number(selectedEvent.latitude),
              lng: Number(selectedEvent.longitude),
              label: selectedEvent.location || selectedEvent.disaster_type || 'Incident',
            },
            destination: {
              lat: Number(updated.latitude),
              lng: Number(updated.longitude),
              label: updated.location || updated.name || 'Evacuation Center',
            },
          }));
          navigate('/manage/dashboard');
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('drrms:showRoute', {
              detail: {
                origin: {
                  lat: Number(selectedEvent.latitude),
                  lng: Number(selectedEvent.longitude),
                  label: selectedEvent.location || selectedEvent.disaster_type || 'Incident',
                },
                destination: {
                  lat: Number(updated.latitude),
                  lng: Number(updated.longitude),
                  label: updated.location || updated.name || 'Evacuation Center',
                },
              },
            }));
          }, 220);
        }
      } else {
        const created = await request('/api/v1/evacuation/', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setCenterData((prev) => [created, ...(Array.isArray(prev) ? prev : [])]);
        pushToast('New Safe Haven initialized in the network.', 'success');
        if (selectedEvent && Number.isFinite(Number(created?.latitude)) && Number.isFinite(Number(created?.longitude))) {
          sessionStorage.setItem('drrms:pendingRoute', JSON.stringify({
            origin: {
              lat: Number(selectedEvent.latitude),
              lng: Number(selectedEvent.longitude),
              label: selectedEvent.location || selectedEvent.disaster_type || 'Incident',
            },
            destination: {
              lat: Number(created.latitude),
              lng: Number(created.longitude),
              label: created.location || created.name || 'Evacuation Center',
            },
          }));
          navigate('/manage/dashboard');
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('drrms:showRoute', {
              detail: {
                origin: {
                  lat: Number(selectedEvent.latitude),
                  lng: Number(selectedEvent.longitude),
                  label: selectedEvent.location || selectedEvent.disaster_type || 'Incident',
                },
                destination: {
                  lat: Number(created.latitude),
                  lng: Number(created.longitude),
                  label: created.location || created.name || 'Evacuation Center',
                },
              },
            }));
          }, 220);
        }
      }
      setShelterModalOpen(false);
      resetShelterForm();
    } catch (err) {
      pushToast(err?.message || 'Failed to open shelter.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- STABLE CALLBACKS TO PREVENT INFINITE RENDERING LOOPS ---
  const handleLocationChange = useCallback((value) => {
    setLocation(value);
    setErrors((prev) => {
      if (prev.location) return { ...prev, location: false };
      return prev;
    });
  }, []);

  const handleLocationDetail = useCallback((detail) => {
    setLocationDetail(detail);
  }, []);

  const handleCoordinates = useCallback((coords) => {
    setLatitude(String(coords.lat));
    setLongitude(String(coords.lng));
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
          <h1>Evacuation Centers</h1>
          <p>Real-time shelter capacity and safe-haven tracking.</p>
        </div>
        <button className="labs-btn-large" onClick={() => setShelterModalOpen(true)}>
          <span className="material-symbols-rounded">door_open</span> Open Shelter
        </button>
      </header>

      <div className="typo-stats-grid">
        {stats.map((stat, i) => (
           <div className="typo-stat-card" key={i}><div className="typo-value">{stat.value}</div><div className="typo-label">{stat.label}</div></div>
        ))}
      </div>

      <div className="labs-data-section">
        <div className="section-title"><h2>Active Safe Havens</h2></div>
        <div className="labs-scroll-area">
          <div className="facility-grid">
            {shelters.map(shelter => {
              const percent = (shelter.current / shelter.capacity) * 100;
              const isFull = percent >= 95;
              return (
                <div className="facility-card" key={shelter.id}>
                  <div className="card-header-flex" style={{ marginBottom: '40px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 400, color: '#fff' }}>{shelter.name}</h3>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span className="mono-label" style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.1)', borderRadius: '99px' }}>Safe Haven</span>
                      <button
                        className="edit-icon-btn"
                        title="Locate on map"
                        aria-label={`Locate ${shelter.name} on map`}
                        onClick={() => {
                          const center = (centerData || []).find((item) => (item.id || item._id) === shelter.id) || {};
                          const linkedEvent = (disasterEvents || []).find((event) => (event.id || event._id) === center.event_id);
                          const shelterLat = center.latitude;
                          const shelterLng = center.longitude;
                          const shelterLabel = center.location || center.name || shelter.name || '';
                          const originLat = linkedEvent?.latitude;
                          const originLng = linkedEvent?.longitude;
                          const originLabel = linkedEvent?.location || linkedEvent?.disaster_type || 'Incident';
                          navigate('/manage/dashboard');
                          setTimeout(() => {
                            if (
                              Number.isFinite(Number(originLat))
                              && Number.isFinite(Number(originLng))
                              && Number.isFinite(Number(shelterLat))
                              && Number.isFinite(Number(shelterLng))
                            ) {
                              const routePayload = {
                                origin: {
                                  lat: Number(originLat),
                                  lng: Number(originLng),
                                  label: originLabel,
                                },
                                destination: {
                                  lat: Number(shelterLat),
                                  lng: Number(shelterLng),
                                  label: shelterLabel,
                                },
                              };
                              sessionStorage.setItem('drrms:pendingRoute', JSON.stringify(routePayload));
                              window.dispatchEvent(new CustomEvent('drrms:showRoute', { detail: routePayload }));
                              return;
                            }
                            if (Number.isFinite(Number(shelterLat)) && Number.isFinite(Number(shelterLng))) {
                              window.dispatchEvent(new CustomEvent('drrms:flyTo', { detail: { lat: Number(shelterLat), lng: Number(shelterLng), label: shelterLabel } }));
                              return;
                            }
                            if (shelterLabel) {
                              window.dispatchEvent(new CustomEvent('drrms:flyTo', { detail: { region: shelterLabel } }));
                              return;
                            }
                            pushToast('No location data available for this shelter.', 'warning');
                          }, 220);
                        }}
                      >
                        <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>my_location</span>
                      </button>
                      <button
                        className="edit-icon-btn"
                        title="Edit center"
                        onClick={() => handleEditShelter((centerData || []).find((item) => (item.id || item._id) === shelter.id) || {})}
                      >
                        <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>edit</span>
                      </button>
                      <button
                        className="delete-icon-btn"
                        title="Delete center"
                        onClick={() => handleDeleteShelter((centerData || []).find((item) => (item.id || item._id) === shelter.id) || {})}
                      >
                        <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>delete</span>
                      </button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
                    <span style={{ fontSize: '5rem', fontWeight: 300, color: isFull ? '#ef4444' : '#fff', lineHeight: 1, letterSpacing: '-3px' }}>
                      {shelter.current}
                    </span>
                    <span className="mono-label" style={{ fontSize: '1.2rem' }}>/ {shelter.capacity} Pax</span>
                  </div>
                  <div className="bar-container" style={{ height: '12px', marginTop: '32px', background: 'rgba(255,255,255,0.05)' }}>
                    <div className="bar-fill" style={{ width: `${percent}%`, background: isFull ? '#ef4444' : '#ffffff', boxShadow: isFull ? '0 0 16px rgba(239, 68, 68, 0.4)' : '0 0 16px rgba(255, 255, 255, 0.2)' }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <Modal
        isOpen={isShelterModalOpen}
        onClose={handleCloseShelterModal}
        title={editingCenterId ? 'Edit Evacuation Center' : 'Initialize New Safe Haven'}
        actionText={isSubmitting ? "Saving..." : (editingCenterId ? 'Save Changes' : 'Open Shelter')}
        onAction={handleOpenShelter}
      >
        <div className="labs-form-group">
          <label>Event ID</label>
          <LabsDropdown
            options={eventOptions}
            value={eventId}
            onChange={(value) => {
              setEventId(value);
              if (errors.eventId) setErrors((prev) => ({ ...prev, eventId: false }));
            }}
            placeholder={eventOptions.length ? 'Select event' : 'No active events'}
            hasError={errors.eventId}
          />
        </div>
        <div className="labs-form-group">
          <label>Facility Name</label>
          <input
            type="text"
            className={`labs-input${errors.facilityName ? ' is-invalid' : ''}`}
            placeholder="e.g. Public Gymnasium"
            value={facilityName}
            maxLength={120}
            onChange={(e) => {
              setFacilityName(sanitizeTextInput(e.target.value, 120));
              if (errors.facilityName) setErrors((prev) => ({ ...prev, facilityName: false }));
            }}
            aria-invalid={!!errors.facilityName}
          />
        </div>
        <PhilippinesLocationPicker
          value={pickerValue}
          onChange={handleLocationChange}
          onLocationDetail={handleLocationDetail}
          onCoordinates={handleCoordinates}
        />
        <div className="labs-form-group">
          <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Selected Location</span>
            <button
              type="button"
              className="labs-btn-ghost"
              onClick={() => {
                if (latitude && longitude) {
                  window.dispatchEvent(new CustomEvent('drrms:flyTo', { detail: { lat: Number(latitude), lng: Number(longitude), label: location || '' } }));
                  return;
                }
                const label = locationDetail ? [locationDetail.barangay, locationDetail.city, locationDetail.province].filter(Boolean).join(', ') : location;
                if (label) {
                  window.dispatchEvent(new CustomEvent('drrms:flyTo', { detail: { region: label } }));
                  return;
                }
                pushToast('No coordinates or location available to locate on map.', 'warning');
              }}
            >Locate</button>
          </label>
          <div
            className="labs-input labs-input--readonly"
            style={{ minHeight: '40px', display: 'flex', alignItems: 'center', gap: '8px' }}
            aria-live="polite"
          >
            {(() => {
              if (locationDetail) {
                const parts = [];
                if (locationDetail.barangay) parts.push(locationDetail.barangay);
                if (locationDetail.city) parts.push(locationDetail.city);
                if (locationDetail.province) parts.push(locationDetail.province);
                return parts.length ? parts.join(', ') : (location || `${latitude || ''}${latitude && longitude ? ', ' : ''}${longitude || ''}` || 'Not set');
              }
              if (location) return location;
              if (latitude && longitude) return `${latitude}, ${longitude}`;
              return 'Not set';
            })()}
          </div>
        </div>
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
            <label>Maximum Capacity (Pax)</label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              className={`labs-input${errors.capacity ? ' is-invalid' : ''}`}
              placeholder="0"
              value={capacity}
              onChange={(e) => {
                setCapacity(digitsOnly(e.target.value, 5));
                if (errors.capacity) setErrors((prev) => ({ ...prev, capacity: false }));
              }}
              aria-invalid={!!errors.capacity}
            />
          </div>
          <div className="labs-form-group">
            <label>Current Occupancy</label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              className={`labs-input${errors.currentOccupancy ? ' is-invalid' : ''}`}
              placeholder="0"
              value={currentOccupancy}
              onChange={(e) => {
                const nextValue = digitsOnly(e.target.value, 5);
                if (capacity && Number(nextValue) > Number(capacity)) {
                  setCurrentOccupancy(capacity);
                  return;
                }
                setCurrentOccupancy(nextValue);
                if (errors.currentOccupancy) setErrors((prev) => ({ ...prev, currentOccupancy: false }));
              }}
              aria-invalid={!!errors.currentOccupancy}
            />
          </div>
        </div>
        <div className="labs-form-group">
          <label>Managing Personnel</label>
          <input
            type="text"
            className={`labs-input${errors.manager ? ' is-invalid' : ''}`}
            placeholder="Officer Name"
            value={manager}
            maxLength={120}
            onChange={(e) => {
              setManager(sanitizeTextInput(e.target.value, 120));
              if (errors.manager) setErrors((prev) => ({ ...prev, manager: false }));
            }}
            aria-invalid={!!errors.manager}
          />
        </div>
      </Modal>

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setDeleteTarget(null);
        }}
        title="Delete Evacuation Center"
        actionText="Delete Center"
        onAction={handleConfirmDelete}
      >
        <div className="delete-modal-message">
          This evacuation center will be permanently removed.
          <div className="delete-modal-meta">
            {deleteTarget?.name || deleteTarget?.location || 'Selected center'}
          </div>
        </div>
      </Modal>

      <Toast toasts={toasts} onCloseAll={clearToasts} />
    </div>
  );
};

export default ManageEvacuation;