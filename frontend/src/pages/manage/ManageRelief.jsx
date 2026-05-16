import React, { useState } from 'react';
import Modal from '../../components/ui/Modal';
import LabsDropdown from '../../components/ui/LabsDropdown';
import Toast from '../../components/ui/Toast'; // <-- Import Toast
import './ManagePages.css';

const ManageRelief = () => {
  const [isSupplyModalOpen, setSupplyModalOpen] = useState(false);
  const [category, setCategory] = useState('');
  const [quantity, setQuantity] = useState('');
  const [destination, setDestination] = useState('');
  const [errors, setErrors] = useState({});
  const [toasts, setToasts] = useState([]);

  const stats = [ { label: 'Inventory Health', value: '84%' }, { label: 'Critical Shortages', value: '01' } ];

  const inventory = [
    { id: 'INV-101', category: 'Food Packs', quantity: '2,400', cap: 3000, color: '#ffffff' },
    { id: 'INV-102', category: 'Medical Kits', quantity: '150', cap: 1000, color: '#ef4444' },
    { id: 'INV-103', category: 'Clean Water (L)', quantity: '5,000', cap: 5000, color: '#ffffff' },
  ];

  const pushToast = (message) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts((prev) => [...prev, { id, message }]);
  };

  const clearToasts = () => {
    setToasts([]);
  };

  const sanitizeText = (value) => value.replace(/[<>]/g, '').trim();

  const validateSupply = () => {
    const nextErrors = {};
    if (!sanitizeText(category)) nextErrors.category = true;
    if (!quantity || Number(quantity) <= 0) nextErrors.quantity = true;
    if (!sanitizeText(destination)) nextErrors.destination = true;

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      pushToast('Please fill out all required fields.');
      return false;
    }
    return true;
  };

  const resetSupplyForm = () => {
    setCategory('');
    setQuantity('');
    setDestination('');
    setErrors({});
  };

  const handleCloseSupplyModal = () => {
    setSupplyModalOpen(false);
    resetSupplyForm();
  };

  const handleRequestSupply = () => {
    if (!validateSupply()) return;
    pushToast(`Logistics request for ${sanitizeText(category) || 'supplies'} submitted.`);
    setSupplyModalOpen(false);
    resetSupplyForm();
  };

  return (
    <div className="dashboard-view fade-in">
      {/* ... Headers and Grids remain exactly the same ... */}
      <header className="view-header">
        <div className="header-meta">
          <h1>Relief Logistics</h1>
          <p>Stockpile monitoring and supply chain tracking.</p>
        </div>
        <button className="labs-btn-large" onClick={() => setSupplyModalOpen(true)}>
          <span className="material-symbols-rounded">local_shipping</span> Request Supply
        </button>
      </header>

      <div className="typo-stats-grid">
        {stats.map((stat, i) => (
           <div className="typo-stat-card" key={i}><div className="typo-value">{stat.value}</div><div className="typo-label">{stat.label}</div></div>
        ))}
      </div>

      <div className="labs-data-section" style={{ padding: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div className="section-title" style={{ padding: '40px 40px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', margin: 0, flexShrink: 0 }}>
          <h2 style={{ margin: 0 }}>Warehouse Manifest</h2>
        </div>
        <div className="labs-scroll-area" style={{ padding: '0 40px' }}>
          <div style={{ paddingBottom: '40px' }}>
            {inventory.map(item => {
              const percent = (parseInt(item.quantity.replace(',','')) / item.cap) * 100;
              return (
                <div className="inventory-row" key={item.id}>
                  <span className="mono-label" style={{ fontSize: '1rem' }}>{item.id}</span>
                  <span className="incident-type" style={{ fontSize: '1.2rem', margin: 0 }}>{item.category}</span>
                  <div style={{ paddingRight: '40px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', marginBottom: '4px', color: '#a1a1aa' }}>
                      <span>{item.quantity} / {item.cap}</span>
                      <span className="mono-label">{Math.round(percent)}%</span>
                    </div>
                    <div className="bar-container">
                      <div className="bar-fill" style={{ width: `${percent}%`, background: item.color, boxShadow: `0 0 10px ${item.color}40` }}></div>
                    </div>
                  </div>
                  <button
                    className="labs-btn-ghost"
                    style={{ justifySelf: 'end' }}
                    onClick={() => pushToast('Dispatch initiated.')}
                  >
                    Dispatch
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <Modal isOpen={isSupplyModalOpen} onClose={handleCloseSupplyModal} title="Request Stock Replenishment" actionText="Submit Request" onAction={handleRequestSupply}>
        <div className="labs-form-group">
          <label>Resource Category</label>
          <LabsDropdown
            options={["Food Packs", "Clean Water (L)", "Medical Kits", "Shelter Materials"]}
            value={category}
            onChange={(value) => {
              setCategory(value);
              if (errors.category) setErrors((prev) => ({ ...prev, category: false }));
            }}
            placeholder="Select Category"
            hasError={errors.category}
          />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div className="labs-form-group">
            <label>Quantity Requested</label>
            {/* NO NEGATIVE NUMBERS FIX */}
            <input
              type="number"
              min="1"
              onKeyDown={(e) => { if (e.key === '-' || e.key === 'e') e.preventDefault(); }}
              className={`labs-input${errors.quantity ? ' is-invalid' : ''}`}
              placeholder="0"
              value={quantity}
              onChange={(e) => {
                setQuantity(e.target.value);
                if (errors.quantity) setErrors((prev) => ({ ...prev, quantity: false }));
              }}
              aria-invalid={!!errors.quantity}
            />
          </div>
          <div className="labs-form-group">
            <label>Destination Hub</label>
            <input
              type="text"
              className={`labs-input${errors.destination ? ' is-invalid' : ''}`}
              placeholder="e.g. Main Hub"
              value={destination}
              maxLength={120}
              onChange={(e) => {
                setDestination(e.target.value);
                if (errors.destination) setErrors((prev) => ({ ...prev, destination: false }));
              }}
              aria-invalid={!!errors.destination}
            />
          </div>
        </div>
      </Modal>

      {/* RENDER TOAST HERE */}
      <Toast toasts={toasts} onCloseAll={clearToasts} />
    </div>
  );
};

export default ManageRelief;