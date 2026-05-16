import React, { useState } from 'react';
import Modal from '../../components/ui/Modal';
import Toast from '../../components/ui/Toast'; // <-- Import Toast
import './ManagePages.css';

const ManageEvacuation = () => {
  const [isShelterModalOpen, setShelterModalOpen] = useState(false);
  const [facilityName, setFacilityName] = useState('');
  const [capacity, setCapacity] = useState('');
  const [manager, setManager] = useState('');
  const [errors, setErrors] = useState({});
  const [toasts, setToasts] = useState([]);

  const stats = [ { label: 'Active Centers', value: '03' }, { label: 'Total Evacuees', value: '1,030' } ];

  const shelters = [
    { id: 'EV-01', name: 'Plaridel Central School', current: 480, capacity: 500 },
    { id: 'EV-02', name: 'Civic Center Complex', current: 350, capacity: 1200 },
    { id: 'EV-03', name: 'Northern Parish Hall', current: 200, capacity: 200 },
    { id: 'EV-04', name: 'Westside Gymnasium', current: 0, capacity: 800 },
  ];

  const pushToast = (message) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts((prev) => [...prev, { id, message }]);
  };

  const clearToasts = () => {
    setToasts([]);
  };

  const sanitizeText = (value) => value.replace(/[<>]/g, '').trim();

  const validateShelter = () => {
    const nextErrors = {};
    if (!sanitizeText(facilityName)) nextErrors.facilityName = true;
    if (!sanitizeText(manager)) nextErrors.manager = true;
    if (!capacity || Number(capacity) <= 0) nextErrors.capacity = true;

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      pushToast('Please fill out all required fields.');
      return false;
    }
    return true;
  };

  const resetShelterForm = () => {
    setFacilityName('');
    setCapacity('');
    setManager('');
    setErrors({});
  };

  const handleCloseShelterModal = () => {
    setShelterModalOpen(false);
    resetShelterForm();
  };

  const handleOpenShelter = () => {
    if (!validateShelter()) return;
    pushToast('New Safe Haven initialized in the network.');
    setShelterModalOpen(false);
    resetShelterForm();
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
                    <span className="mono-label" style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.1)', borderRadius: '99px' }}>{shelter.id}</span>
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

      <Modal isOpen={isShelterModalOpen} onClose={handleCloseShelterModal} title="Initialize New Safe Haven" actionText="Open Shelter" onAction={handleOpenShelter}>
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
        </div>
      </Modal>

      {/* RENDER TOAST HERE */}
      <Toast toasts={toasts} onCloseAll={clearToasts} />
    </div>
  );
};

export default ManageEvacuation;