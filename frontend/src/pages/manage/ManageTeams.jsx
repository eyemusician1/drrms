import React, { useState } from 'react';
import Modal from '../../components/ui/Modal';
import LabsDropdown from '../../components/ui/LabsDropdown';
import Toast from '../../components/ui/Toast';
import './ManagePages.css';

const ManageTeams = () => {
  const [isTeamModalOpen, setTeamModalOpen] = useState(false);
  const [unitName, setUnitName] = useState('');
  const [teamLead, setTeamLead] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [readiness, setReadiness] = useState('');
  const [errors, setErrors] = useState({});
  const [toasts, setToasts] = useState([]);

  const [teams, setTeams] = useState([
    { id: 'RT-201', name: 'Alpha Response', lead: 'Cpt. Reyes', readiness: 'High', status: 'Deployed' },
    { id: 'RT-212', name: 'Medical Support', lead: 'Dr. Ramos', readiness: 'High', status: 'Deployed' },
    { id: 'RT-204', name: 'Coastal Unit', lead: 'Lt. Navarro', readiness: 'Medium', status: 'Standby' },
    { id: 'RT-207', name: 'Engineering Corps', lead: 'Eng. Santos', readiness: 'High', status: 'Standby' },
  ]);

  const [draggedTeam, setDraggedTeam] = useState(null);

  const handleDragStart = (e, teamId) => {
    setDraggedTeam(teamId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => setDraggedTeam(null);
  const handleDragOver = (e) => e.preventDefault();

  const handleDrop = (e, newStatus) => {
    e.preventDefault();
    if (draggedTeam) {
      setTeams(teams.map(team =>
        team.id === draggedTeam ? { ...team, status: newStatus } : team
      ));
      setDraggedTeam(null);
    }
  };

  const pushToast = (message) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts((prev) => [...prev, { id, message }]);
  };

  const clearToasts = () => {
    setToasts([]);
  };

  const sanitizeText = (value) => value.replace(/[<>]/g, '').trim();

  const validateTeam = () => {
    const nextErrors = {};
    if (!sanitizeText(unitName)) nextErrors.unitName = true;
    if (!sanitizeText(teamLead)) nextErrors.teamLead = true;
    if (!sanitizeText(specialization)) nextErrors.specialization = true;
    if (!sanitizeText(readiness)) nextErrors.readiness = true;

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      pushToast('Please fill out all required fields.');
      return false;
    }
    return true;
  };

  const resetTeamForm = () => {
    setUnitName('');
    setTeamLead('');
    setSpecialization('');
    setReadiness('');
    setErrors({});
  };

  const handleCloseTeamModal = () => {
    setTeamModalOpen(false);
    resetTeamForm();
  };

  const handleCreateTeam = () => {
    if (!validateTeam()) return;
    pushToast('New response team registered.');
    setTeamModalOpen(false);
    resetTeamForm();
  };

  const deployedCount = teams.filter(t => t.status === 'Deployed').length;
  const standbyCount = teams.filter(t => t.status === 'Standby').length;

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
              <TeamCard key={team.id} team={team} isDragging={draggedTeam === team.id} onDragStart={(e) => handleDragStart(e, team.id)} onDragEnd={handleDragEnd} />
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
              <TeamCard key={team.id} team={team} isDragging={draggedTeam === team.id} onDragStart={(e) => handleDragStart(e, team.id)} onDragEnd={handleDragEnd} />
            ))}
          </div>

        </div>
      </div>

      <Modal isOpen={isTeamModalOpen} onClose={handleCloseTeamModal} title="Register Response Team" actionText="Register Team" onAction={handleCreateTeam}>
        <div className="labs-form-group">
          <label>Unit Name</label>
          <input
            type="text"
            className={`labs-input${errors.unitName ? ' is-invalid' : ''}`}
            placeholder="e.g. Delta Search & Rescue"
            value={unitName}
            maxLength={120}
            onChange={(e) => {
              setUnitName(e.target.value);
              if (errors.unitName) setErrors((prev) => ({ ...prev, unitName: false }));
            }}
            aria-invalid={!!errors.unitName}
          />
        </div>
        <div className="labs-form-group">
          <label>Team Lead / Commander</label>
          <input
            type="text"
            className={`labs-input${errors.teamLead ? ' is-invalid' : ''}`}
            placeholder="Officer Name"
            value={teamLead}
            maxLength={120}
            onChange={(e) => {
              setTeamLead(e.target.value);
              if (errors.teamLead) setErrors((prev) => ({ ...prev, teamLead: false }));
            }}
            aria-invalid={!!errors.teamLead}
          />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div className="labs-form-group">
            <label>Specialization</label>
            <LabsDropdown
              options={["Medical", "Search & Rescue", "Logistics"]}
              value={specialization}
              onChange={(value) => {
                setSpecialization(value);
                if (errors.specialization) setErrors((prev) => ({ ...prev, specialization: false }));
              }}
              placeholder="Select Type"
              hasError={errors.specialization}
            />
          </div>
          <div className="labs-form-group">
            <label>Initial Readiness</label>
            <LabsDropdown
              options={["High", "Medium", "Low"]}
              value={readiness}
              onChange={(value) => {
                setReadiness(value);
                if (errors.readiness) setErrors((prev) => ({ ...prev, readiness: false }));
              }}
              placeholder="Select State"
              hasError={errors.readiness}
            />
          </div>
        </div>
      </Modal>

      <Toast toasts={toasts} onCloseAll={clearToasts} />
    </div>
  );
};

const TeamCard = ({ team, isDragging, onDragStart, onDragEnd }) => {
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
        <div className="mono-label" style={{ marginBottom: '6px', fontSize: '0.85rem' }}>{team.id}</div>
        <div style={{
          display: 'inline-block', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px',
          padding: '4px 10px', borderRadius: '8px', background: team.readiness === 'High' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.05)',
          color: team.readiness === 'High' ? '#ffffff' : '#a1a1aa'
        }}>
          {team.readiness} Ready
        </div>
      </div>
    </div>
  );
};

export default ManageTeams;