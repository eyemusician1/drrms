import React, { useState } from 'react';
import Modal from '../../components/ui/Modal';
import LabsDropdown from '../../components/ui/LabsDropdown';
import Toast from '../../components/ui/Toast'; // <-- Import Toast
import { useRealtimeStream } from '../../hooks/useRealtimeStream';
import { useApi } from '../../hooks/useApi';
import './ManagePages.css';

const ManageEvacuation = () => {
  const [isShelterModalOpen, setShelterModalOpen] = useState(false);
  const [facilityName, setFacilityName] = useState('');
  const [capacity, setCapacity] = useState('');
  const [currentOccupancy, setCurrentOccupancy] = useState('');
  const [eventId, setEventId] = useState('');
  const [location, setLocation] = useState('');
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
    const label = event.disaster_type || eventIdValue;
    return { label, value: eventIdValue };
  });

  const pushToast = (message, type = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const clearToasts = () => {
    setToasts([]);
  };

  const sanitizeText = (value) => value.replace(/[<>]/g, '').trim();

  const validateShelter = () => {
    const nextErrors = {};
    if (!sanitizeText(eventId)) nextErrors.eventId = true;
    if (!sanitizeText(location)) nextErrors.location = true;
    if (!sanitizeText(facilityName)) nextErrors.facilityName = true;
    if (!sanitizeText(manager)) nextErrors.manager = true;
    if (!capacity || Number(capacity) <= 0) nextErrors.capacity = true;
    if (currentOccupancy !== '' && Number(currentOccupancy) < 0) nextErrors.currentOccupancy = true;

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      pushToast('Please fill out all required fields.', 'warning');
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
      const payload = {
        event_id: eventId,
        name: facilityName,
        location,
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
      } else {
        const created = await request('/api/v1/evacuation/', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setCenterData((prev) => [created, ...(Array.isArray(prev) ? prev : [])]);
        pushToast('New Safe Haven initialized in the network.', 'success');
      }
      setShelterModalOpen(false);
      resetShelterForm();
    } catch (err) {
      pushToast(err?.message || 'Failed to open shelter.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="dashboard-view fade-in">
      {/* ... Headers and Grids remain exactly the same ... */}
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
              setFacilityName(e.target.value);
              if (errors.facilityName) setErrors((prev) => ({ ...prev, facilityName: false }));
            }}
            aria-invalid={!!errors.facilityName}
          />
        </div>
        <div className="labs-form-group">
          <label>Location</label>
          <input
            type="text"
            className={`labs-input${errors.location ? ' is-invalid' : ''}`}
            placeholder="Address or Zone"
            value={location}
            maxLength={160}
            onChange={(e) => {
              setLocation(e.target.value);
              if (errors.location) setErrors((prev) => ({ ...prev, location: false }));
            }}
            aria-invalid={!!errors.location}
          />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div className="labs-form-group">
            <label>Maximum Capacity (Pax)</label>
            {/* NO NEGATIVE NUMBERS FIX */}
            <input
              type="number"
              min="1"
              onKeyDown={(e) => { if (e.key === '-' || e.key === 'e') e.preventDefault(); }}
              className={`labs-input${errors.capacity ? ' is-invalid' : ''}`}
              placeholder="0"
              value={capacity}
              onChange={(e) => {
                setCapacity(e.target.value);
                if (errors.capacity) setErrors((prev) => ({ ...prev, capacity: false }));
              }}
              aria-invalid={!!errors.capacity}
            />
          </div>
          <div className="labs-form-group">
            <label>Current Occupancy</label>
            <input
              type="number"
              min="0"
              onKeyDown={(e) => { if (e.key === '-' || e.key === 'e') e.preventDefault(); }}
              className={`labs-input${errors.currentOccupancy ? ' is-invalid' : ''}`}
              placeholder="0"
              value={currentOccupancy}
              onChange={(e) => {
                setCurrentOccupancy(e.target.value);
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
              setManager(e.target.value);
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

      {/* RENDER TOAST HERE */}
      <Toast toasts={toasts} onCloseAll={clearToasts} />
    </div>
  );
};

export default ManageEvacuation;