import React, { useState } from 'react';

const DISASTER_TYPES = ['Typhoon', 'Flood', 'Earthquake', 'Wildfire', 'Landslide', 'Tsunami'];
const SEVERITY_LEVELS = ['Low', 'Moderate', 'High', 'Critical'];

const initialForm = {
  disaster_type: 'Flood',
  location: '',
  date_occurred: '',
  severity_level: 'Moderate',
  duration_days: '',
  status: 'Ongoing',
};

const DisasterForm = ({ onSuccess, onCancel }) => {
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const payload = {
        ...form,
        date_occurred: new Date(form.date_occurred).toISOString(),
        duration_days: form.duration_days ? parseInt(form.duration_days) : null,
      };

      const res = await fetch('http://localhost:8000/api/v1/disasters', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Failed to create disaster');
      }

      setForm(initialForm);   // reset form
      onSuccess();            // tell the parent to refresh the list

    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="labs-data-section" style={{ marginBottom: '24px' }}>
      <h2 style={{ marginBottom: '16px' }}>Log New Incident</h2>

      {error && <p style={{ color: 'salmon', marginBottom: '12px' }}>{error}</p>}

      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '12px', maxWidth: '500px' }}>
        <select name="disaster_type" value={form.disaster_type} onChange={handleChange} required>
          {DISASTER_TYPES.map(t => <option key={t}>{t}</option>)}
        </select>

        <input
          name="location"
          placeholder="Location"
          value={form.location}
          onChange={handleChange}
          required
        />

        <input
          name="date_occurred"
          type="datetime-local"
          value={form.date_occurred}
          onChange={handleChange}
          required
        />

        <select name="severity_level" value={form.severity_level} onChange={handleChange}>
          {SEVERITY_LEVELS.map(s => <option key={s}>{s}</option>)}
        </select>

        <input
          name="duration_days"
          placeholder="Duration (days, optional)"
          type="number"
          value={form.duration_days}
          onChange={handleChange}
        />

        <select name="status" value={form.status} onChange={handleChange}>
          <option>Ongoing</option>
          <option>Resolved</option>
        </select>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button type="submit" className="labs-btn-large" disabled={submitting}>
            {submitting ? 'Saving...' : 'Save Incident'}
          </button>
          <button type="button" className="labs-btn-ghost" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default DisasterForm;