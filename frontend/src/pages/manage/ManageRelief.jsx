import React, { useState } from 'react';
import Modal from '../../components/ui/Modal';
import LabsDropdown from '../../components/ui/LabsDropdown';
import Toast from '../../components/ui/Toast'; // <-- Import Toast
import { useRealtimeStream } from '../../hooks/useRealtimeStream';
import { useApi } from '../../hooks/useApi';
import './ManagePages.css';

const ManageRelief = () => {
  const [isSupplyModalOpen, setSupplyModalOpen] = useState(false);
  const [category, setCategory] = useState('');
  const [eventId, setEventId] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [beneficiaries, setBeneficiaries] = useState('');
  const [resourcesDistributed, setResourcesDistributed] = useState('');
  const [handledByTeamId, setHandledByTeamId] = useState('');
  const [errors, setErrors] = useState({});
  const [toasts, setToasts] = useState([]);
  const { data: reliefOperations, setData: setReliefOperations } = useRealtimeStream('/api/v1/stream/relief', []);
  const { data: disasterEvents } = useRealtimeStream('/api/v1/stream/disasters', []);
  const { request } = useApi();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingOperationId, setEditingOperationId] = useState('');
  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const inventory = (reliefOperations || []).map((operation) => {
    const quantityValue = operation.beneficiaries ?? 0;
    return {
      id: operation.id || operation._id || 'INV-000',
      category: operation.operation_type || 'Relief',
      quantity: quantityValue.toLocaleString(),
      cap: Math.max(quantityValue, 1000),
      color: quantityValue > 0 ? '#ffffff' : '#ef4444',
    };
  });

  const criticalShortages = (reliefOperations || []).filter((operation) => (operation.beneficiaries ?? 0) === 0).length;
  const stats = [
    { label: 'Inventory Health', value: inventory.length ? '100%' : '0%' },
    { label: 'Critical Shortages', value: String(criticalShortages).padStart(2, '0') },
  ];
  const eventOptions = (disasterEvents || []).map((event) => {
    const eventIdValue = event.id || event._id || 'DR-000';
    const label = event.disaster_type || eventIdValue;
    return { label, value: eventIdValue };
  });

  const pushToast = (message, type = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const clearToasts = () => {
    setToasts([]);
  };

  const sanitizeText = (value) => value.replace(/[<>]/g, '').trim();

  const validateSupply = () => {
    const nextErrors = {};
    if (!sanitizeText(category)) nextErrors.category = true;
    if (!sanitizeText(eventId)) nextErrors.eventId = true;
    if (!sanitizeText(date)) nextErrors.date = true;
    if (!beneficiaries || Number(beneficiaries) < 0) nextErrors.beneficiaries = true;
    if (!sanitizeText(resourcesDistributed)) nextErrors.resourcesDistributed = true;

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      pushToast('Please fill out all required fields.', 'warning');
      return false;
    }
    return true;
  };

  const resetSupplyForm = () => {
    setCategory('');
    setEventId('');
    setDate(new Date().toISOString().slice(0, 10));
    setBeneficiaries('');
    setResourcesDistributed('');
    setHandledByTeamId('');
    setErrors({});
    setEditingOperationId('');
  };

  const handleCloseSupplyModal = () => {
    setSupplyModalOpen(false);
    resetSupplyForm();
  };

  const handleEditOperation = (operation) => {
    setEditingOperationId(operation.id || operation._id || '');
    setCategory(operation.operation_type || '');
    setEventId(operation.event_id || '');
    setDate(
      operation.date ? new Date(operation.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)
    );
    setBeneficiaries(operation.beneficiaries ? String(operation.beneficiaries) : '');
    setResourcesDistributed(operation.resources_distributed || '');
    setHandledByTeamId(operation.handled_by_team_id || '');
    setErrors({});
    setSupplyModalOpen(true);
  };

  const handleDeleteOperation = (operation) => {
    if (!operation?.id && !operation?._id) return;
    setDeleteTarget(operation);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    const operationId = deleteTarget?.id || deleteTarget?._id;
    if (!operationId) return;
    try {
      await request(`/api/v1/relief/${operationId}`, { method: 'DELETE' });
      setReliefOperations((prev) => (Array.isArray(prev)
        ? prev.filter((item) => (item.id || item._id) !== operationId)
        : prev));
      pushToast('Relief operation deleted.', 'success');
    } catch (err) {
      pushToast(err?.message || 'Failed to delete operation.', 'error');
    } finally {
      setDeleteModalOpen(false);
      setDeleteTarget(null);
    }
  };

  const handleRequestSupply = async () => {
    if (!validateSupply()) return;
    setIsSubmitting(true);
    try {
      const payload = {
        event_id: eventId,
        operation_type: category,
        date: new Date(date).toISOString(),
        beneficiaries: Number(beneficiaries || 0),
        resources_distributed: resourcesDistributed,
        handled_by_team_id: sanitizeText(handledByTeamId) || null,
      };
      if (editingOperationId) {
        const updated = await request(`/api/v1/relief/${editingOperationId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        setReliefOperations((prev) => (Array.isArray(prev)
          ? prev.map((item) => ((item.id || item._id) === editingOperationId ? updated : item))
          : prev));
        pushToast('Relief operation updated.', 'success');
      } else {
        const created = await request('/api/v1/relief/', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setReliefOperations((prev) => [created, ...(Array.isArray(prev) ? prev : [])]);
        pushToast(`Logistics request for ${sanitizeText(category) || 'supplies'} submitted.`, 'success');
      }
      setSupplyModalOpen(false);
      resetSupplyForm();
    } catch (err) {
      pushToast(err?.message || 'Failed to submit request.', 'error');
    } finally {
      setIsSubmitting(false);
    }
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
                  <div style={{ display: 'flex', gap: '8px', justifySelf: 'end' }}>
                    <button
                      className="labs-btn-ghost"
                      onClick={() => pushToast('Dispatch initiated.', 'info')}
                    >
                      Dispatch
                    </button>
                    <button
                      className="edit-icon-btn"
                      title="Edit operation"
                      onClick={() => handleEditOperation((reliefOperations || []).find((op) => (op.id || op._id) === item.id) || {})}
                    >
                      <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>edit</span>
                    </button>
                    <button
                      className="delete-icon-btn"
                      title="Delete operation"
                      onClick={() => handleDeleteOperation((reliefOperations || []).find((op) => (op.id || op._id) === item.id) || {})}
                    >
                      <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>delete</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <Modal
        isOpen={isSupplyModalOpen}
        onClose={handleCloseSupplyModal}
        title={editingOperationId ? 'Edit Relief Operation' : 'Request Stock Replenishment'}
        actionText={isSubmitting ? "Saving..." : (editingOperationId ? 'Save Changes' : 'Submit Request')}
        onAction={handleRequestSupply}
      >
        <div className="labs-form-group">
          <label>Event ID</label>
          <LabsDropdown
            options={eventOptions}
            value={eventId}
            onChange={(value) => {
              setEventId(value);
              if (errors.eventId) setErrors((prev) => ({ ...prev, eventId: false }));
            }}
            placeholder={eventOptions.length ? 'Select event' : 'No active events'}
            hasError={errors.eventId}
          />
        </div>
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
            <label>Operation Date</label>
            <input
              type="date"
              className={`labs-input${errors.date ? ' is-invalid' : ''}`}
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                if (errors.date) setErrors((prev) => ({ ...prev, date: false }));
              }}
              aria-invalid={!!errors.date}
            />
          </div>
          <div className="labs-form-group">
            <label>Beneficiaries</label>
            <input
              type="number"
              min="0"
              onKeyDown={(e) => { if (e.key === '-' || e.key === 'e') e.preventDefault(); }}
              className={`labs-input${errors.beneficiaries ? ' is-invalid' : ''}`}
              placeholder="0"
              value={beneficiaries}
              onChange={(e) => {
                setBeneficiaries(e.target.value);
                if (errors.beneficiaries) setErrors((prev) => ({ ...prev, beneficiaries: false }));
              }}
              aria-invalid={!!errors.beneficiaries}
            />
          </div>
        </div>
        <div className="labs-form-group">
          <label>Resources Distributed</label>
          <input
            type="text"
            className={`labs-input${errors.resourcesDistributed ? ' is-invalid' : ''}`}
            placeholder="e.g. 200 food packs, 50 blankets"
            value={resourcesDistributed}
            maxLength={200}
            onChange={(e) => {
              setResourcesDistributed(e.target.value);
              if (errors.resourcesDistributed) setErrors((prev) => ({ ...prev, resourcesDistributed: false }));
            }}
            aria-invalid={!!errors.resourcesDistributed}
          />
        </div>
        <div className="labs-form-group">
          <label>Handled By Team ID (Optional)</label>
          <input
            type="text"
            className="labs-input"
            placeholder="Response Team ID"
            value={handledByTeamId}
            onChange={(e) => setHandledByTeamId(e.target.value)}
          />
        </div>
      </Modal>

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setDeleteTarget(null);
        }}
        title="Delete Relief Operation"
        actionText="Delete Operation"
        onAction={handleConfirmDelete}
      >
        <div className="delete-modal-message">
          This relief operation will be permanently removed from the manifest.
          <div className="delete-modal-meta">
            {deleteTarget?.operation_type || deleteTarget?.id || deleteTarget?._id || 'Selected operation'}
          </div>
        </div>
      </Modal>

      {/* RENDER TOAST HERE */}
      <Toast toasts={toasts} onCloseAll={clearToasts} />
    </div>
  );
};

export default ManageRelief;