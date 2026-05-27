import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../../components/ui/Modal';
import LabsDropdown from '../../components/ui/LabsDropdown';
import TypeaheadInput from '../../components/ui/TypeaheadInput'; // ➕ NEW: separate file for the typeahead input
import PhilippinesLocationPicker from '../../components/forms/PhilippinesLocationPicker';
import Toast from '../../components/ui/Toast';
import { useRealtimeStream } from '../../hooks/useRealtimeStream';
import { useApi } from '../../hooks/useApi';
import { sanitizeTextInput } from '../../utils/formGuards';
import './ManagePages.css';
import useRequireAuth from '../../hooks/useRequireAuth';

const ManageTeams = () => {
  useRequireAuth();
  const [isTeamModalOpen, setTeamModalOpen] = useState(false);
  const [unitName, setUnitName] = useState('');
  const [contact, setContact] = useState('');
  const [teamType, setTeamType] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [assignedEventId, setAssignedEventId] = useState('');
  const [operationZone, setOperationZone] = useState('');
  const [operationZoneDetail, setOperationZoneDetail] = useState(null);
  const [operationZoneCoords, setOperationZoneCoords] = useState({ lat: null, lng: null });
  const [errors, setErrors] = useState({});
  const [toasts, setToasts] = useState([]);
  const { request } = useApi();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingTeamId, setEditingTeamId] = useState('');
  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data: teamData, setData: setTeamData } = useRealtimeStream('/api/v1/stream/teams', []);
  const { data: disasterEvents } = useRealtimeStream('/api/v1/stream/disasters', []);
  const [teams, setTeams] = useState([]);

  const [draggedTeam, setDraggedTeam] = useState(null);

  useEffect(() => {
    const mapped = (teamData || []).map((team) => ({
      id: team.id || team._id || 'RT-000',
      name: team.team_name || 'Unnamed Team',
      lead: team.contact || 'Unassigned',
      readiness: team.specialization || 'General',
      status: team.operation_zone ? 'Deployed' : 'Standby',
    }));
    setTeams(mapped);
  }, [teamData]);

  const handleDragStart = (e, teamId) => {
    setDraggedTeam(teamId);
    e.dataTransfer.setData('text/plain', teamId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => setDraggedTeam(null);
  const handleDragOver = (e) => e.preventDefault();

  const handleDrop = async (e, newStatus) => {
    e.preventDefault();
    const teamId = draggedTeam || e.dataTransfer.getData('text/plain');
    if (!teamId) return;
    setTeams((prev) => prev.map(team =>
      team.id === teamId ? { ...team, status: newStatus } : team
    ));
    setDraggedTeam(null);
    const rawTeam = (teamData || []).find((item) => (item.id || item._id) === teamId);
    if (!rawTeam) return;
    const nextOperationZone = newStatus === 'Deployed' ? (rawTeam.operation_zone || 'Active Zone') : null;
    try {
      await request(`/api/v1/teams/${teamId}`, {
        method: 'PATCH',
        body: JSON.stringify({ operation_zone: nextOperationZone }),
      });
    } catch (err) {
      pushToast(err?.message || 'Failed to update deployment status.', 'error');
    }
  };

  const pushToast = (message, type = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const clearToasts = () => {
    setToasts([]);
  };

  const sanitizeText = (value) => sanitizeTextInput(value, 200).trim();

  const validateTeam = () => {
    const nextErrors = {};
    if (!sanitizeText(unitName)) nextErrors.unitName = true;
    if (!sanitizeText(contact)) nextErrors.contact = true;
    if (!sanitizeText(teamType)) nextErrors.teamType = true;
    if (!sanitizeText(specialization)) nextErrors.specialization = true;

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      pushToast('Please fill out all required fields.', 'warning');
      return false;
    }
    return true;
  };

  const resetTeamForm = () => {
    setUnitName('');
    setContact('');
    setTeamType('');
    setSpecialization('');
    setAssignedEventId('');
    setOperationZone('');
    setErrors({});
    setEditingTeamId('');
  };

  const handleCloseTeamModal = () => {
    setTeamModalOpen(false);
    resetTeamForm();
  };

  const handleEditTeam = (team) => {
    setEditingTeamId(team.id || team._id || '');
    setUnitName(team.team_name || '');
    setContact(team.contact || '');
    setTeamType(team.team_type || '');
    setSpecialization(team.specialization || '');
    setAssignedEventId(team.assigned_event_id || '');
    setOperationZone(team.operation_zone || '');
    setErrors({});
    setTeamModalOpen(true);
  };

  const handleDeleteTeam = (team) => {
    if (!team?.id && !team?._id) return;
    setDeleteTarget(team);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    const teamId = deleteTarget?.id || deleteTarget?._id;
    if (!teamId) return;
    try {
      await request(`/api/v1/teams/${teamId}`, { method: 'DELETE' });
      setTeamData((prev) => (Array.isArray(prev)
        ? prev.filter((item) => (item.id || item._id) !== teamId)
        : prev));
      pushToast('Team deleted.', 'success');
    } catch (err) {
      pushToast(err?.message || 'Failed to delete team.', 'error');
    } finally {
      setDeleteModalOpen(false);
      setDeleteTarget(null);
    }
  };

  const handleCreateTeam = async () => {
    if (!validateTeam()) return;
    setIsSubmitting(true);
    try {
      const payload = {
        team_name: unitName,
        team_type: teamType,
        specialization,
        contact,
        assigned_event_id: sanitizeText(assignedEventId) || null,
        operation_zone: sanitizeText(operationZone) || null,
      };
      if (editingTeamId) {
        const updated = await request(`/api/v1/teams/${editingTeamId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        setTeamData((prev) => (Array.isArray(prev)
          ? prev.map((item) => ((item.id || item._id) === editingTeamId ? updated : item))
          : prev));
        pushToast('Team updated successfully.', 'success');
      } else {
        const created = await request('/api/v1/teams/', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setTeamData((prev) => [created, ...(Array.isArray(prev) ? prev : [])]);
        pushToast('New response team registered.', 'success');
      }
      setTeamModalOpen(false);
      resetTeamForm();
    } catch (err) {
      pushToast(err?.message || 'Failed to register team.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const deployedCount = teams.filter(t => t.status === 'Deployed').length;
  const standbyCount = teams.filter(t => t.status === 'Standby').length;
  const eventOptions = (disasterEvents || []).map((event) => {
    const eventId = event.id || event._id || 'DR-000';
    const loc = event.location || (Number.isFinite(event.latitude) && Number.isFinite(event.longitude)
      ? `${Number(event.latitude).toFixed(4)}, ${Number(event.longitude).toFixed(4)}`
      : 'Unknown area');
    const type = event.disaster_type || 'Event';
    const label = `${type} — ${loc}`;
    return { label, value: eventId };
  });

  const selectedAssignedEvent = (disasterEvents || []).find((e) => (e.id || e._id) === assignedEventId);
  const navigate = useNavigate();

  // --- STABLE CALLBACK TO PREVENT INFINITE RENDERING LOOPS ---
  const handleOperationZoneChange = useCallback((value) => {
    setOperationZone(value);
  }, []);

  return (
    <div className="dashboard-view fade-in">
      <header className="view-header">
        <div className="header-meta">
          <h1>Response Teams</h1>
          <p>Drag and drop units to instantly update deployment telemetry.</p>
        </div>
        <button className="labs-btn-large" onClick={() => setTeamModalOpen(true)}>
          <span className="material-symbols-rounded">add</span> Create Team
        </button>
      </header>

      <div className="typo-stats-grid">
        <div className="typo-stat-card">
          <div className="typo-value">{deployedCount + standbyCount}</div>
          <div className="typo-label">Total Teams</div>
        </div>
        <div className="typo-stat-card">
          <div className="typo-value" style={{color: '#ffffff'}}>{deployedCount}</div>
          <div className="typo-label">Active Deployments</div>
        </div>
      </div>

      <div className="labs-data-section" style={{ padding: '40px', background: 'transparent', border: 'none' }}>
        <div className="kanban-board" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>

          <div
            className="kanban-column"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, 'Deployed')}
            style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '32px', padding: '32px', border: '1px dashed rgba(255,255,255,0.1)' }}
          >
            <h3 style={{ display: 'flex', justifyContent: 'space-between', color: '#fff', fontSize: '1.4rem', fontWeight: 400, marginTop: 0, marginBottom: '24px' }}>
              Deployed Units
              <span style={{ background: '#ffffff', color: '#000000', padding: '2px 12px', borderRadius: '99px', fontSize: '1rem', fontWeight: 600 }}>
                {deployedCount}
              </span>
            </h3>
            {teams.filter(t => t.status === 'Deployed').map(team => (
              <TeamCard
                key={team.id}
                team={team}
                isDragging={draggedTeam === team.id}
                onDragStart={(e) => handleDragStart(e, team.id)}
                onDragEnd={handleDragEnd}
                onEdit={() => handleEditTeam((teamData || []).find((item) => (item.id || item._id) === team.id) || {})}
                onDelete={() => handleDeleteTeam((teamData || []).find((item) => (item.id || item._id) === team.id) || {})}
              />
            ))}
          </div>

          <div
            className="kanban-column"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, 'Standby')}
            style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '32px', padding: '32px', border: '1px dashed rgba(255,255,255,0.1)' }}
          >
            <h3 style={{ display: 'flex', justifyContent: 'space-between', color: '#a1a1aa', fontSize: '1.4rem', fontWeight: 400, marginTop: 0, marginBottom: '24px' }}>
              Standby Units
              <span style={{ background: 'rgba(255,255,255,0.1)', color: '#ffffff', padding: '2px 12px', borderRadius: '99px', fontSize: '1rem', fontWeight: 600 }}>
                {standbyCount}
              </span>
            </h3>
            {teams.filter(t => t.status === 'Standby').map(team => (
              <TeamCard
                key={team.id}
                team={team}
                isDragging={draggedTeam === team.id}
                onDragStart={(e) => handleDragStart(e, team.id)}
                onDragEnd={handleDragEnd}
                onEdit={() => handleEditTeam((teamData || []).find((item) => (item.id || item._id) === team.id) || {})}
                onDelete={() => handleDeleteTeam((teamData || []).find((item) => (item.id || item._id) === team.id) || {})}
              />
            ))}
          </div>

        </div>
      </div>

      <Modal
        isOpen={isTeamModalOpen}
        onClose={handleCloseTeamModal}
        title={editingTeamId ? 'Edit Response Team' : 'Register Response Team'}
        actionText={isSubmitting ? "Saving..." : (editingTeamId ? 'Save Changes' : 'Register Team')}
        onAction={handleCreateTeam}
      >
        <div className="labs-form-group">
          <label>Unit Name</label>
          <input
            type="text"
            className={`labs-input${errors.unitName ? ' is-invalid' : ''}`}
            placeholder="e.g. Delta Search & Rescue"
            value={unitName}
            maxLength={120}
            onChange={(e) => {
                setUnitName(sanitizeTextInput(e.target.value, 120, 8));
              if (errors.unitName) setErrors((prev) => ({ ...prev, unitName: false }));
            }}
            aria-invalid={!!errors.unitName}
          />
        </div>
        <div className="labs-form-group">
          <label>Contact</label>
          <input
            type="text"
            className={`labs-input${errors.contact ? ' is-invalid' : ''}`}
            placeholder="Contact Person"
            value={contact}
            maxLength={120}
            onChange={(e) => {
                setContact(sanitizeTextInput(e.target.value, 120, 8));
              if (errors.contact) setErrors((prev) => ({ ...prev, contact: false }));
            }}
            aria-invalid={!!errors.contact}
          />
        </div>
        <div className="labs-form-grid">
          <div className="labs-form-group">
            <label>Team Type</label>
            <LabsDropdown
              options={["Government", "NGO", "Volunteer"]}
              value={teamType}
              onChange={(value) => {
                setTeamType(value);
                if (errors.teamType) setErrors((prev) => ({ ...prev, teamType: false }));
              }}
              placeholder="Select Team Type"
              hasError={errors.teamType}
            />
          </div>
          <div className="labs-form-group">
            <label>Specialization</label>
            <LabsDropdown
              options={["Rescue", "Medical", "Logistics", "Relief"]}
              value={specialization}
              onChange={(value) => {
                setSpecialization(value);
                if (errors.specialization) setErrors((prev) => ({ ...prev, specialization: false }));
              }}
              placeholder="Select Specialization"
              hasError={errors.specialization}
            />
          </div>
        </div>
        <div className="labs-form-group">
          <label>Assigned Event</label>
          {/* replaced LabsDropdown with TypeaheadInput */}
          <TypeaheadInput
            options={eventOptions}
            value={assignedEventId}
            onChange={(value) => setAssignedEventId(value)}
            placeholder={eventOptions.length ? 'Type to search event...' : 'No active events'}
          />
        </div>
        <div className="labs-form-group">
          <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Assigned Event Location</span>
            <button
              type="button"
              className="labs-btn-ghost"
              onClick={() => {
                if (!selectedAssignedEvent) {
                  pushToast('No event selected.', 'warning');
                  return;
                }
                const lat = selectedAssignedEvent.latitude;
                const lng = selectedAssignedEvent.longitude;
                const label = selectedAssignedEvent.location || selectedAssignedEvent.disaster_type || '';
                navigate('/manage/dashboard');
                setTimeout(() => {
                  if (lat != null && lng != null) {
                    window.dispatchEvent(new CustomEvent('drrms:flyTo', { detail: { lat: Number(lat), lng: Number(lng), label } }));
                  } else if (label) {
                    window.dispatchEvent(new CustomEvent('drrms:flyTo', { detail: { region: label } }));
                  } else {
                    pushToast('Event has no location data.', 'warning');
                  }
                }, 220);
              }}
            >Locate</button>
          </label>
          <div className="labs-input labs-input--readonly" style={{ minHeight: '36px', display: 'flex', alignItems: 'center' }}>
            {selectedAssignedEvent ? (selectedAssignedEvent.location || (selectedAssignedEvent.latitude && selectedAssignedEvent.longitude ? `${selectedAssignedEvent.latitude}, ${selectedAssignedEvent.longitude}` : 'Location not available')) : 'No event selected'}
          </div>
        </div>
        <PhilippinesLocationPicker
          label="Operation Zone (Optional)"
          includeBarangay={false}
          autoResolveCoordinates={false}
          onChange={handleOperationZoneChange}
          onLocationDetail={(d) => setOperationZoneDetail(d)}
          onCoordinates={(c) => setOperationZoneCoords(c)}
        />
        <div className="labs-form-group" style={{ marginTop: '0.5rem' }}>
          <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Selected Operation Zone</span>
            <button
              type="button"
              className="labs-btn-ghost"
              onClick={() => {
                const { lat, lng } = operationZoneCoords;
                const label = operationZoneDetail ? [operationZoneDetail.barangay, operationZoneDetail.city, operationZoneDetail.province].filter(Boolean).join(', ') : operationZone;
                navigate('/manage/dashboard');
                setTimeout(() => {
                  if (lat && lng) {
                    window.dispatchEvent(new CustomEvent('drrms:flyTo', { detail: { lat: Number(lat), lng: Number(lng), label } }));
                    return;
                  }
                  if (label) {
                    window.dispatchEvent(new CustomEvent('drrms:flyTo', { detail: { region: label } }));
                    return;
                  }
                  pushToast('No operation zone coordinates available.', 'warning');
                }, 220);
              }}
            >Locate</button>
          </label>
          <div className="labs-input labs-input--readonly" style={{ minHeight: '36px', display: 'flex', alignItems: 'center' }}>
            {(() => {
              if (operationZoneDetail) {
                const parts = [];
                if (operationZoneDetail.barangay) parts.push(operationZoneDetail.barangay);
                if (operationZoneDetail.city) parts.push(operationZoneDetail.city);
                if (operationZoneDetail.province) parts.push(operationZoneDetail.province);
                return parts.length ? parts.join(', ') : (operationZone || (operationZoneCoords.lat && operationZoneCoords.lng ? `${operationZoneCoords.lat}, ${operationZoneCoords.lng}` : 'Not set'));
              }
              if (operationZone) return operationZone;
              if (operationZoneCoords.lat && operationZoneCoords.lng) return `${operationZoneCoords.lat}, ${operationZoneCoords.lng}`;
              return 'Not set';
            })()}
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setDeleteTarget(null);
        }}
        title="Delete Response Team"
        actionText="Delete Team"
        onAction={handleConfirmDelete}
      >
        <div className="delete-modal-message">
          This team will be permanently removed from the network.
          <div className="delete-modal-meta">
            {deleteTarget?.team_name || deleteTarget?.contact || deleteTarget?.name || 'Selected team'}
          </div>
        </div>
      </Modal>

      <Toast toasts={toasts} onCloseAll={clearToasts} />
    </div>
  );
};

const TeamCard = ({ team, isDragging, onDragStart, onDragEnd, onEdit, onDelete }) => {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      style={{
        display: 'flex', alignItems: 'center', gap: '16px', background: 'rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '20px 24px', marginBottom: '16px', cursor: 'grab',
        opacity: isDragging ? 0.4 : 1, transform: isDragging ? 'scale(0.98)' : 'scale(1)',
        transition: 'opacity 0.2s, transform 0.2s, background 0.2s, box-shadow 0.2s',
        boxShadow: isDragging ? 'none' : '0 4px 12px rgba(0,0,0,0.2)'
      }}
      onMouseEnter={(e) => { if(!isDragging) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)' }}
      onMouseLeave={(e) => { if(!isDragging) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)' }}
    >
      <span className="material-symbols-rounded" style={{ color: '#71717a', cursor: 'grab' }}>drag_indicator</span>
      <div style={{ flex: 1 }}>
        <h4 style={{ margin: '0 0 4px', fontSize: '1.25rem', fontWeight: 400, color: '#ffffff' }}>{team.name}</h4>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#a1a1aa', fontSize: '0.9rem' }}>
          <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>account_circle</span> {team.lead}
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div className="mono-label" style={{ marginBottom: '6px', fontSize: '0.85rem' }}>{team.status}</div>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginBottom: '8px' }}>
          <button
            className="edit-icon-btn"
            title="Edit team"
            onClick={(e) => {
              e.stopPropagation();
              if (onEdit) onEdit();
            }}
          >
            <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>edit</span>
          </button>
          <button
            className="delete-icon-btn"
            title="Delete team"
            onClick={(e) => {
              e.stopPropagation();
              if (onDelete) onDelete();
            }}
          >
            <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>delete</span>
          </button>
        </div>
        <div style={{
          display: 'inline-block', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px',
          padding: '4px 10px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.08)',
          color: '#ffffff'
        }}>
          {team.readiness}
        </div>
      </div>
    </div>
  );
};

export default ManageTeams;