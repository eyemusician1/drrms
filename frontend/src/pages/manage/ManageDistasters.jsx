import React, { useState } from 'react';
import Modal from '../../components/ui/Modal';
import LabsDropdown from '../../components/ui/LabsDropdown';
import Toast from '../../components/ui/Toast';
import './ManagePages.css';

const ManageDisasters = () => {
  const [isIncidentModalOpen, setIncidentModalOpen] = useState(false);
  const [threatType, setThreatType] = useState('');
  const [severity, setSeverity] = useState('');
  const [epicenter, setEpicenter] = useState('');
  const [errors, setErrors] = useState({});
  const [toasts, setToasts] = useState([]);

  const stats = [ { label: 'Active Incidents', value: '03' }, { label: 'Critical Zones', value: '01' } ];

  const disasters = [
    { id: 'DR-402', type: 'Severe Flooding', location: 'Zone 4, Plaridel', severity: 'Critical', status: 'Active' },
    { id: 'DR-403', type: 'Landslide', location: 'Northern Ridge', severity: 'High', status: 'Active' },
    { id: 'DR-404', type: 'Typhoon', location: 'Coastal Sector', severity: 'Moderate', status: 'Monitoring' },
  ];

  const pushToast = (message) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts((prev) => [...prev, { id, message }]);
  };

  const clearToasts = () => {
    setToasts([]);
  };

  const sanitizeText = (value) => value.replace(/[<>]/g, '').trim();

  const validateIncident = () => {
    const nextErrors = {};
    if (!sanitizeText(threatType)) nextErrors.threatType = true;
    if (!sanitizeText(severity)) nextErrors.severity = true;
    if (!sanitizeText(epicenter)) nextErrors.epicenter = true;

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      pushToast('Please fill out all required fields.');
      return false;
    }
    return true;
  };

  const resetIncidentForm = () => {
    setThreatType('');
    setSeverity('');
    setEpicenter('');
    setErrors({});
  };

  const handleCloseIncidentModal = () => {
    setIncidentModalOpen(false);
    resetIncidentForm();
  };

  const handleLogIncident = () => {
    if (!validateIncident()) return;
    pushToast('New Incident added to Threat Directory.');
    setIncidentModalOpen(false);
    resetIncidentForm();
  };

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
          <div className="typo-stat-card" key={i}><div className="typo-value">{stat.value}</div><div className="typo-label">{stat.label}</div></div>
        ))}
      </div>

      <div className="labs-data-section">
        <div className="section-title">
          <h2>Threat Directory</h2>
          <button className="labs-btn-ghost">Filter Grid</button>
        </div>

        <div className="labs-scroll-area">
          <div className="incident-grid">
            {disasters.map(incident => (
              <div className="incident-card" key={incident.id}>
                <div className="card-header-flex">
                  <span className={`severity-badge severity-${incident.severity.toLowerCase()}`} style={{ fontSize: '0.8rem', padding: '4px 12px' }}>{incident.severity}</span>
                  <span className="mono-label">{incident.id}</span>
                </div>
                <div>
                  <h3 style={{ margin: '0 0 12px 0', fontSize: '1.8rem', fontWeight: '400', color: '#fff', letterSpacing: '-1px' }}>{incident.type}</h3>
                  <div className="incident-location" style={{ fontSize: '1rem' }}>
                    <span className="material-symbols-rounded">location_on</span> {incident.location}
                  </div>
                </div>
                <div className="card-header-flex" style={{ marginTop: 'auto', paddingTop: '24px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                  <span className="incident-status" style={{ fontWeight: 500 }}>{incident.status}</span>
                  <button className="labs-btn-ghost">Take Action</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Modal isOpen={isIncidentModalOpen} onClose={handleCloseIncidentModal} title="Log New Incident" actionText="Initialize Tracking" onAction={handleLogIncident}>
        <div className="labs-form-group">
          <label>Threat Designation (Type)</label>
          <input
            type="text"
            className={`labs-input${errors.threatType ? ' is-invalid' : ''}`}
            placeholder="e.g. Flash Flood, Landslide"
            value={threatType}
            maxLength={120}
            onChange={(e) => {
              setThreatType(e.target.value);
              if (errors.threatType) setErrors((prev) => ({ ...prev, threatType: false }));
            }}
            aria-invalid={!!errors.threatType}
          />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div className="labs-form-group">
            <label>Severity Level</label>
            <LabsDropdown
              options={["Moderate", "High", "Critical"]}
              value={severity}
              onChange={(value) => {
                setSeverity(value);
                if (errors.severity) setErrors((prev) => ({ ...prev, severity: false }));
              }}
              placeholder="Select Severity"
              hasError={errors.severity}
            />
          </div>
          <div className="labs-form-group">
            <label>Epicenter / Location</label>
            <input
              type="text"
              className={`labs-input${errors.epicenter ? ' is-invalid' : ''}`}
              placeholder="Zone or Coordinates"
              value={epicenter}
              maxLength={120}
              onChange={(e) => {
                setEpicenter(e.target.value);
                if (errors.epicenter) setErrors((prev) => ({ ...prev, epicenter: false }));
              }}
              aria-invalid={!!errors.epicenter}
            />
          </div>
        </div>
      </Modal>

      <Toast toasts={toasts} onCloseAll={clearToasts} />
    </div>
  );
};

export default ManageDisasters;