import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PhilippinesLocationPicker from './PhilippinesLocationPicker';

const DisasterForm = ({ onSubmit, onCancel, initialData = null }) => {
  // 1. Standard Form State
  const [formData, setFormData] = useState({
    disaster_type: initialData?.disaster_type || '',
    date_occurred: initialData?.date_occurred ? new Date(initialData.date_occurred).toISOString().slice(0, 16) : '',
    severity_level: initialData?.severity_level || '',
    duration_days: initialData?.duration_days || '',
    status: initialData?.status || 'Ongoing',
  });

  // 2. Spatial & Location State (Crucial for the Map)
  const [locationLabel, setLocationLabel] = useState(initialData?.location || '');
  const [locationDetails, setLocationDetails] = useState({
    province_code: initialData?.province_code || null,
    city_municipality_code: initialData?.city_municipality_code || null,
    city_municipality_type: initialData?.city_municipality_type || null,
    barangay_code: initialData?.barangay_code || null,
  });
  const [coordinates, setCoordinates] = useState({
    lat: initialData?.latitude || null,
    lng: initialData?.longitude || null,
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // 3. Construct the exact payload expected by the FastAPI backend
    const payload = {
      ...formData,
      duration_days: formData.duration_days ? parseInt(formData.duration_days, 10) : null,

      // Merge in the location text
      location: locationLabel,

      // Merge in the PSGC Codes
      province_code: locationDetails.province_code,
      city_municipality_code: locationDetails.city_municipality_code,
      city_municipality_type: locationDetails.city_municipality_type,
      barangay_code: locationDetails.barangay_code,

      // Merge in the Coordinates (This fixes the map issue!)
      latitude: coordinates.lat,
      longitude: coordinates.lng,

      // Ensure date is formatted correctly for Python datetime
      date_occurred: new Date(formData.date_occurred).toISOString(),
    };

    onSubmit(payload);
  };
  const navigate = useNavigate();

  return (
    <form onSubmit={handleSubmit} className="labs-form">
      <div className="labs-form-grid">
        <div className="labs-form-group">
          <label>Disaster Type</label>
          <select
            name="disaster_type"
            className="labs-input"
            value={formData.disaster_type}
            onChange={handleChange}
            required
          >
            <option value="">Select Type...</option>
            <option value="Typhoon">Typhoon</option>
            <option value="Flood">Flood</option>
            <option value="Earthquake">Earthquake</option>
            <option value="Wildfire">Wildfire</option>
            <option value="Landslide">Landslide</option>
          </select>
        </div>

        <div className="labs-form-group">
          <label>Severity Level</label>
          <select
            name="severity_level"
            className="labs-input"
            value={formData.severity_level}
            onChange={handleChange}
            required
          >
            <option value="">Select Severity...</option>
            <option value="Low">Low</option>
            <option value="Moderate">Moderate</option>
            <option value="High">High</option>
            <option value="Critical">Critical</option>
          </select>
        </div>
      </div>

      {/* LOCATION PICKER INTEGRATION */}
      <div className="labs-form-group" style={{ marginTop: '1rem', marginBottom: '1rem' }}>
        <PhilippinesLocationPicker
          label="Incident Location"
          value={locationLabel}
          onChange={(label) => setLocationLabel(label)}
          onLocationDetail={(details) => setLocationDetails(details)}
          onCoordinates={(coords) => setCoordinates(coords)}
        />
        <div className="labs-form-group" style={{ marginTop: '0.5rem' }}>
          <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Selected Location</span>
            <button
              type="button"
              className="labs-btn-ghost"
              onClick={() => {
                const { lat, lng } = coordinates;
                const label = locationLabel || (locationDetails && (locationDetails.barangay || locationDetails.city || locationDetails.province)) || '';
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
                  pushToast('No coordinates or location available to locate on map.', 'warning');
                }, 220);
              }}
            >Locate on map</button>
          </label>
          <div
            className="labs-input labs-input--readonly"
            style={{ minHeight: '36px', display: 'flex', alignItems: 'center', gap: '8px' }}
            aria-live="polite"
          >
            {(() => {
              if (locationDetails) {
                const parts = [];
                if (locationDetails.barangay) parts.push(locationDetails.barangay);
                if (locationDetails.city) parts.push(locationDetails.city);
                if (locationDetails.province) parts.push(locationDetails.province);
                return parts.length ? parts.join(', ') : (locationLabel || (coordinates.lat && coordinates.lng ? `${coordinates.lat}, ${coordinates.lng}` : 'Not set'));
              }
              if (locationLabel) return locationLabel;
              if (coordinates.lat && coordinates.lng) return `${coordinates.lat}, ${coordinates.lng}`;
              return 'Not set';
            })()}
          </div>
        </div>
      </div>

      <div className="labs-form-grid">
        <div className="labs-form-group">
          <label>Date Occurred</label>
          <input
            type="datetime-local"
            name="date_occurred"
            className="labs-input"
            value={formData.date_occurred}
            onChange={handleChange}
            required
          />
        </div>

        <div className="labs-form-group">
          <label>Duration (Days)</label>
          <input
            type="number"
            name="duration_days"
            className="labs-input"
            placeholder="e.g. 3"
            value={formData.duration_days}
            onChange={handleChange}
            min="1"
          />
        </div>
      </div>

      <div className="labs-form-group" style={{ marginTop: '1rem' }}>
        <label>Status</label>
        <select
          name="status"
          className="labs-input"
          value={formData.status}
          onChange={handleChange}
          required
        >
          <option value="Ongoing">Ongoing</option>
          <option value="Resolved">Resolved</option>
        </select>
      </div>

      <div className="labs-form-actions" style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '2rem' }}>
        <button type="button" className="labs-btn-ghost" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="labs-btn-primary">
          Log Incident
        </button>
      </div>
    </form>
  );
};

export default DisasterForm;