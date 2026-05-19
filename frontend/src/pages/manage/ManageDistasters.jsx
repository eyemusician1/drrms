import React, { useState, useEffect } from 'react';
import DisasterForm from '../../components/forms/DisasterForm';

//get the apis of disasters, it can be POST, CREATE or DELETE
const API = 'http://localhost:8000/api/v1/disasters';
//get the access_token 
const getToken = () => localStorage.getItem('access_token');

const ManageDisasters = () => {
  const [disasters, setDisasters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

  const fetchDisasters = async () => {
    setLoading(true);
    try {
      const res = await fetch(API, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      if (!res.ok) throw new Error('Failed to fetch');
      setDisasters(await res.json());
    } catch (err) {
      setError('Could not load disasters. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDisasters(); }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this disaster record?')) return;
    try {
      const res = await fetch(`${API}/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      if (!res.ok) throw new Error('Failed to delete');
      fetchDisasters();
    } catch {
      setError('Could not delete disaster.');
    }
  };

  const activeCount = disasters.filter(d => d.status === 'Ongoing').length;
  const criticalCount = disasters.filter(d => d.severity_level === 'Critical').length;

  return (
    <div className="dashboard-view fade-in">
      <header className="view-header">
        <div className="header-meta">
          <h1>Active Incidents</h1>
          <p>Live monitoring of environmental hazards and emergencies.</p>
        </div>
        <div className="header-actions">
          <button className="labs-btn-large" onClick={() => setShowForm(!showForm)}>
            <span className="material-symbols-rounded">add</span> Log Incident
          </button>
        </div>
      </header>

      <div className="typo-stats-grid">
        <div className="typo-stat-card">
          <div className="typo-value">{String(activeCount).padStart(2, '0')}</div>
          <div className="typo-label">Active Incidents</div>
        </div>
        <div className="typo-stat-card">
          <div className="typo-value">{String(criticalCount).padStart(2, '0')}</div>
          <div className="typo-label">Critical Zones</div>
        </div>
      </div>

      {/* Form is now a separate component */}
      {showForm && (
        <DisasterForm
          onSuccess={() => { setShowForm(false); fetchDisasters(); }}
          onCancel={() => setShowForm(false)}
        />
      )}

      <div className="labs-data-section">
        <div className="section-title">
          <h2>Threat Directory</h2>
        </div>

        {error && <p style={{ color: 'salmon' }}>{error}</p>}

        {loading ? (
          <p style={{ opacity: 0.5 }}>Loading incidents...</p>
        ) : disasters.length === 0 ? (
          <p style={{ opacity: 0.5 }}>No incidents recorded yet. Click "Log Incident" to add one.</p>
        ) : (
          <div className="incident-grid">
            {disasters.map(incident => (
              <div className="incident-card" key={incident._id}>
                <div className="card-header-flex">
                  <span className={`severity-badge severity-${incident.severity_level.toLowerCase()}`}>
                    {incident.severity_level}
                  </span>
                  <span className="mono-label">{incident._id.slice(-6).toUpperCase()}</span>
                </div>
                <div>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '1.4rem', fontWeight: '500' }}>
                    {incident.disaster_type}
                  </h3>
                  <div className="incident-location">
                    <span className="material-symbols-rounded">location_on</span> {incident.location}
                  </div>
                </div>
                <div className="card-header-flex" style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                  <span className="incident-status">{incident.status}</span>
                  <button
                    className="labs-btn-ghost"
                    style={{ padding: '4px 12px', color: 'salmon' }}
                    onClick={() => handleDelete(incident._id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageDisasters;