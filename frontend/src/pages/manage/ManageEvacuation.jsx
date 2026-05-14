import React from 'react';

const ManageEvacuation = () => {
  const stats = [ { label: 'Active Centers', value: '03' }, { label: 'Total Evacuees', value: '1,030' } ];

  const shelters = [
    { id: 'EV-01', name: 'Plaridel Central School', current: 480, capacity: 500 },
    { id: 'EV-02', name: 'Civic Center Complex', current: 350, capacity: 1200 },
    { id: 'EV-03', name: 'Northern Parish Hall', current: 200, capacity: 200 },
  ];

  return (
    <div className="dashboard-view fade-in">
      <header className="view-header">
        <div className="header-meta">
          <h1>Evacuation Centers</h1>
          <p>Real-time shelter capacity and safe-haven tracking.</p>
        </div>
        <button className="labs-btn-large">+ Open Shelter</button>
      </header>

      <div className="typo-stats-grid">
        {stats.map((stat, i) => (
           <div className="typo-stat-card" key={i}><div className="typo-value">{stat.value}</div><div className="typo-label">{stat.label}</div></div>
        ))}
      </div>

      <div className="labs-data-section">
        <div className="section-title"><h2>Active Safe Havens</h2></div>

        {/* UNIQUE LAYOUT: CAPACITY FACILITY CARDS */}
        <div className="facility-grid">
          {shelters.map(shelter => {
            const percent = (shelter.current / shelter.capacity) * 100;
            const isFull = percent >= 95;
            return (
              <div className="facility-card" key={shelter.id}>
                <div className="card-header-flex" style={{ marginBottom: '24px' }}>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 500 }}>{shelter.name}</h3>
                  <span className="mono-label">{shelter.id}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  <span style={{ fontSize: '3rem', fontWeight: 300, color: isFull ? '#ef4444' : '#fff' }}>{shelter.current}</span>
                  <span className="mono-label">/ {shelter.capacity} Pax</span>
                </div>

                <div className="bar-container" style={{ height: '12px', marginTop: '16px' }}>
                  <div className="bar-fill" style={{ width: `${percent}%`, background: isFull ? '#ef4444' : '#ffffff' }}></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
export default ManageEvacuation;