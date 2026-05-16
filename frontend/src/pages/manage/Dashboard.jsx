import React, { useState } from 'react';
import Modal from '../../components/ui/Modal';
import LabsDropdown from '../../components/ui/LabsDropdown'; // <-- Added
import Toast from '../../components/ui/Toast';
import './Dashboard.css';

const Dashboard = () => {
  const [isAlertModalOpen, setAlertModalOpen] = useState(false);
  const [alertType, setAlertType] = useState('');
  const [targetRegion, setTargetRegion] = useState('');
  const [telemetryMessage, setTelemetryMessage] = useState('');
  const [errors, setErrors] = useState({});
  const [toasts, setToasts] = useState([]);

  const statistics = [
    { label: 'Active Incidents', value: '03' },
    { label: 'Deployed Units', value: '14' },
    { label: 'Available Beds', value: '842' },
    { label: 'Relief Kits', value: '1.2k' }
  ];

  const recentEvents = [
    { id: 'DR-402', type: 'Severe Flood', zone: 'Zone 4, Plaridel', severity: 'Critical', status: 'Responding', x: 25, y: 40 },
    { id: 'DR-405', type: 'Typhoon', zone: 'Coastal Sector B', severity: 'High', status: 'Active', x: 75, y: 25 },
    { id: 'DR-408', type: 'Structural Fire', zone: 'Poblacion', severity: 'Moderate', status: 'Controlled', x: 50, y: 60 },
    { id: 'DR-409', type: 'Landslide', zone: 'Northern Ridge', severity: 'High', status: 'Assessing', x: 80, y: 70 },
    { id: 'DR-411', type: 'Flash Flood', zone: 'River Basin', severity: 'Critical', status: 'Evacuating', x: 35, y: 80 },
  ];

  const pushToast = (message) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts((prev) => [...prev, { id, message }]);
  };

  const clearToasts = () => {
    setToasts([]);
  };

  const sanitizeText = (value) => value.replace(/[<>]/g, '').trim();

  const validateAlert = () => {
    const nextErrors = {};
    if (!sanitizeText(alertType)) nextErrors.alertType = true;
    if (!sanitizeText(targetRegion)) nextErrors.targetRegion = true;
    if (!sanitizeText(telemetryMessage)) nextErrors.telemetryMessage = true;

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      pushToast('Please fill out all required fields.');
      return false;
    }
    return true;
  };

  const resetAlertForm = () => {
    setAlertType('');
    setTargetRegion('');
    setTelemetryMessage('');
    setErrors({});
  };

  const handleCloseAlertModal = () => {
    setAlertModalOpen(false);
    resetAlertForm();
  };

  const handleBroadcastAlert = () => {
    if (!validateAlert()) return;
    pushToast(`${sanitizeText(alertType) || 'Alert'} broadcasted to network.`);
    setAlertModalOpen(false);
    resetAlertForm();
  };

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
            <div className="incident-list">
              {recentEvents.map(event => (
                <div className={`incident-row severity-${event.severity.toLowerCase()}`} key={event.id}>
                  <div className="incident-row-header">
                    <span className="mono-label">{event.id}</span>
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
            <div className="map-grid-overlay"></div>
            {recentEvents.map(event => (
              <div key={`map-${event.id}`} className={`map-blip severity-${event.severity.toLowerCase()}`} style={{ left: `${event.x}%`, top: `${event.y}%` }}>
                <div className="blip-core"></div>
                <div className="blip-ring"></div>
                <div className="blip-label">{event.id}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Modal isOpen={isAlertModalOpen} onClose={handleCloseAlertModal} title="Broadcast System Alert" actionText="Broadcast Alert" onAction={handleBroadcastAlert}>
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
          <label>Target Region</label>
          <input
            type="text"
            className={`labs-input${errors.targetRegion ? ' is-invalid' : ''}`}
            placeholder="e.g. Sector 7, Plaridel"
            value={targetRegion}
            maxLength={120}
            onChange={(e) => {
              setTargetRegion(e.target.value);
              if (errors.targetRegion) setErrors((prev) => ({ ...prev, targetRegion: false }));
            }}
            aria-invalid={!!errors.targetRegion}
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
              setTelemetryMessage(e.target.value);
              if (errors.telemetryMessage) setErrors((prev) => ({ ...prev, telemetryMessage: false }));
            }}
            aria-invalid={!!errors.telemetryMessage}
          ></textarea>
        </div>
      </Modal>

      <Toast toasts={toasts} onCloseAll={clearToasts} />
    </div>
  );
};

export default Dashboard;