import React from 'react';

const ManageDisasters = () => {
  const stats = [
    { label: 'Active Incidents', value: '03' },
    { label: 'Critical Zones', value: '01' }
  ];

  const disasters = [
    { id: 'DR-402', type: 'Severe Flooding', location: 'Zone 4, Plaridel', severity: 'Critical', status: 'Active' },
    { id: 'DR-403', type: 'Landslide', location: 'Northern Ridge', severity: 'High', status: 'Active' },
    { id: 'DR-404', type: 'Typhoon', location: 'Coastal Sector', severity: 'Moderate', status: 'Monitoring' },
  ];

  return (
    <div className="dashboard-view fade-in">
      <header className="view-header">
        <div className="header-meta">
          <h1>Active Incidents</h1>
          <p>Live monitoring of environmental hazards and emergencies.</p>
        </div>
        <div className="header-actions">
          <button className="labs-btn-large">
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
          <button className="labs-btn-ghost">Filter</button>
        </div>

        {/* UNIQUE LAYOUT: GRID CARDS */}
        <div className="incident-grid">
          {disasters.map(incident => (
            <div className="incident-card" key={incident.id}>
              <div className="card-header-flex">
                <span className={`severity-badge severity-${incident.severity.toLowerCase()}`}>{incident.severity}</span>
                <span className="mono-label">{incident.id}</span>
              </div>
              <div>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '1.4rem', fontWeight: '500' }}>{incident.type}</h3>
                <div className="incident-location">
                  <span className="material-symbols-rounded">location_on</span> {incident.location}
                </div>
              </div>
              <div className="card-header-flex" style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <span className="incident-status">{incident.status}</span>
                <button className="labs-btn-ghost" style={{ padding: '4px 12px' }}>View</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
export default ManageDisasters;