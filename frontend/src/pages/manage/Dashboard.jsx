import React from 'react';
import './Dashboard.css';

const Dashboard = () => {
  const statistics = [
    { label: 'Active Incidents', value: '03' },
    { label: 'Deployed Units', value: '14' },
    { label: 'Available Beds', value: '842' },
    { label: 'Relief Kits', value: '1.2k' }
  ];

  // Added x/y coordinates to plot them on our minimalist radar map
  const recentEvents = [
    { id: 'DR-402', type: 'Severe Flood', zone: 'Zone 4, Plaridel', severity: 'Critical', status: 'Responding', x: 25, y: 40 },
    { id: 'DR-405', type: 'Typhoon', zone: 'Coastal Sector B', severity: 'High', status: 'Active', x: 75, y: 25 },
    { id: 'DR-408', type: 'Structural Fire', zone: 'Poblacion', severity: 'Moderate', status: 'Controlled', x: 50, y: 60 },
    { id: 'DR-409', type: 'Landslide', zone: 'Northern Ridge', severity: 'High', status: 'Assessing', x: 80, y: 70 },
    { id: 'DR-411', type: 'Flash Flood', zone: 'River Basin', severity: 'Critical', status: 'Evacuating', x: 35, y: 80 },
  ];

  return (
    <div className="dashboard-view fade-in">
      <header className="view-header">
        <div className="header-meta">
          <h1>Network Overview</h1>
          <p>Global situational awareness and resource telemetry.</p>
        </div>
        <div className="header-actions">
          <button className="labs-btn-large">
            <span className="material-symbols-rounded">add</span>
            New Alert
          </button>
        </div>
      </header>

      {/* Overview Stats */}
      <div className="typo-stats-grid">
        {statistics.map((stat, i) => (
          <div className="typo-stat-card" key={i}>
            <div className="typo-value">{stat.value}</div>
            <div className="typo-label">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Split Telemetry Feed + Map Section */}
      <div className="telemetry-section">
        <div className="section-title">
          <h2>Live Telemetry Feed</h2>
          <button className="labs-btn-ghost">Export Log</button>
        </div>

        <div className="telemetry-layout">

          {/* LEFT: Scrolling Feed */}
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

          {/* RIGHT: Minimalist Radar Map */}
          <div className="map-panel">
            <div className="map-grid-overlay"></div>
            {recentEvents.map(event => (
              <div
                key={`map-${event.id}`}
                className={`map-blip severity-${event.severity.toLowerCase()}`}
                style={{ left: `${event.x}%`, top: `${event.y}%` }}
              >
                <div className="blip-core"></div>
                <div className="blip-ring"></div>
                <div className="blip-label">{event.id}</div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
};

export default Dashboard;