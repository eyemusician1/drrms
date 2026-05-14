import React from 'react';

const ManageTeams = () => {
  const stats = [ { label: 'Active Teams', value: '06' }, { label: 'On Standby', value: '02' } ];

  const activeTeams = [
    { id: 'RT-201', name: 'Alpha Response', lead: 'Cpt. Reyes', readiness: 'High' },
    { id: 'RT-212', name: 'Medical Support', lead: 'Dr. Ramos', readiness: 'High' },
  ];
  const standbyTeams = [
    { id: 'RT-204', name: 'Coastal Unit', lead: 'Lt. Navarro', readiness: 'Medium' },
  ];

  return (
    <div className="dashboard-view fade-in">
      <header className="view-header">
        <div className="header-meta">
          <h1>Response Teams</h1>
          <p>Unit readiness, deployment status, and team leadership.</p>
        </div>
        <button className="labs-btn-large">+ Create Team</button>
      </header>

      <div className="typo-stats-grid">
        {stats.map((stat, i) => (
          <div className="typo-stat-card" key={i}><div className="typo-value">{stat.value}</div><div className="typo-label">{stat.label}</div></div>
        ))}
      </div>

      <div className="labs-data-section">
        {/* UNIQUE LAYOUT: KANBAN BOARD */}
        <div className="kanban-board">
          <div className="kanban-column">
            <h3>Deployed Units <span className="mono-label">{activeTeams.length}</span></h3>
            {activeTeams.map(team => (
              <div className="team-card active" key={team.id}>
                <div>
                  <h4 style={{ margin: '0 0 4px', fontSize: '1.1rem' }}>{team.name}</h4>
                  <span className="incident-location">{team.lead}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className="mono-label">{team.id}</span>
                  <div className="incident-status" style={{color: '#4ade80'}}>Active</div>
                </div>
              </div>
            ))}
          </div>

          <div className="kanban-column">
            <h3>Standby Units <span className="mono-label">{standbyTeams.length}</span></h3>
            {standbyTeams.map(team => (
              <div className="team-card standby" key={team.id}>
                <div>
                  <h4 style={{ margin: '0 0 4px', fontSize: '1.1rem' }}>{team.name}</h4>
                  <span className="incident-location">{team.lead}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className="mono-label">{team.id}</span>
                  <div className="incident-status">Awaiting Orders</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
export default ManageTeams;