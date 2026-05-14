import React from 'react';

const ManageRelief = () => {
  const stats = [ { label: 'Inventory Health', value: '84%' }, { label: 'Critical Shortages', value: '01' } ];

  const inventory = [
    { id: 'INV-101', category: 'Food Packs', quantity: '2,400', cap: 3000, color: '#ffffff' },
    { id: 'INV-102', category: 'Medical Kits', quantity: '150', cap: 1000, color: '#ef4444' },
    { id: 'INV-103', category: 'Clean Water (L)', quantity: '5,000', cap: 5000, color: '#ffffff' },
  ];

  return (
    <div className="dashboard-view fade-in">
      <header className="view-header">
        <div className="header-meta">
          <h1>Relief Logistics</h1>
          <p>Stockpile monitoring and supply chain tracking.</p>
        </div>
        <button className="labs-btn-large">+ Request Supply</button>
      </header>

      <div className="typo-stats-grid">
        {stats.map((stat, i) => (
           <div className="typo-stat-card" key={i}><div className="typo-value">{stat.value}</div><div className="typo-label">{stat.label}</div></div>
        ))}
      </div>

      <div className="labs-data-section" style={{ padding: '24px 0' }}>
        <h2 style={{ padding: '0 32px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Warehouse Manifest</h2>

        {/* UNIQUE LAYOUT: PROGRESS BARS */}
        <div>
          {inventory.map(item => {
            const percent = (parseInt(item.quantity.replace(',','')) / item.cap) * 100;
            return (
              <div className="inventory-row" key={item.id}>
                <span className="mono-label">{item.id}</span>
                <span className="incident-type">{item.category}</span>
                <div style={{ paddingRight: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span>{item.quantity} units</span>
                    <span className="mono-label">{Math.round(percent)}%</span>
                  </div>
                  <div className="bar-container">
                    <div className="bar-fill" style={{ width: `${percent}%`, background: item.color }}></div>
                  </div>
                </div>
                <button className="labs-btn-ghost" style={{ justifySelf: 'end' }}>Dispatch</button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
export default ManageRelief;