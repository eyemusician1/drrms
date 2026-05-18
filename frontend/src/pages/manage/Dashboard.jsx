import React, { useState } from 'react';
import Modal from '../../components/ui/Modal';
import LabsDropdown from '../../components/ui/LabsDropdown'; // <-- Added
import Toast from '../../components/ui/Toast';
import { useRealtimeStream } from '../../hooks/useRealtimeStream';
import { useApi } from '../../hooks/useApi';
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
  const { request } = useApi();
  const [isSubmitting, setIsSubmitting] = useState(false);

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


  const pushToast = (message, type = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const clearToasts = () => {
    setToasts([]);
  };

  const sanitizeText = (value) => value.replace(/[<>]/g, '').trim();

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
                        <span className="mono-label">{alert.id}</span>
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
            {deleteTarget?.warning_type || deleteTarget?.id || deleteTarget?._id || 'Selected alert'}
          </div>
        </div>
      </Modal>

      <Toast toasts={toasts} onCloseAll={clearToasts} />
    </div>
  );
};

export default Dashboard;