import React, { useEffect, useMemo, useRef, useState } from 'react';
import LabsDropdown from '../ui/LabsDropdown';

const PSGC_BASE_URL = 'https://psgc.gitlab.io/api';

const fetchCachedJson = async (cacheKey, url) => {
  const cached = sessionStorage.getItem(cacheKey);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (err) {
      sessionStorage.removeItem(cacheKey);
    }
  }
  const response = await fetch(url);
  const data = await response.json();
  sessionStorage.setItem(cacheKey, JSON.stringify(data));
  return data;
};

const buildLabel = (barangay, cityMunicipality, province) => {
  return [barangay?.name, cityMunicipality?.name, province?.name]
    .filter(Boolean)
    .join(', ');
};

const PhilippinesLocationPicker = ({
  label = 'Location (Philippines)',
  includeBarangay = true,
  onChange,
  onCoordinates,
}) => {
  const [provinces, setProvinces] = useState([]);
  const [cityMunicipalities, setCityMunicipalities] = useState([]);
  const [barangays, setBarangays] = useState([]);
  const [provinceCode, setProvinceCode] = useState('');
  const [cityMunicipalityCode, setCityMunicipalityCode] = useState('');
  const [cityMunicipalityType, setCityMunicipalityType] = useState('');
  const [barangayCode, setBarangayCode] = useState('');
  const [placeQuery, setPlaceQuery] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const geoCacheRef = useRef(new Map());

  const provinceOptions = useMemo(
    () => provinces.map((item) => ({ label: item.name, value: item.code })),
    [provinces]
  );

  const cityMunicipalityOptions = useMemo(
    () => cityMunicipalities.map((item) => ({
      label: item.name,
      value: `${item.type}:${item.code}`,
    })),
    [cityMunicipalities]
  );

  const barangayOptions = useMemo(
    () => barangays.map((item) => ({ label: item.name, value: item.code })),
    [barangays]
  );

  const resolveCoordinates = async (labelText) => {
    const key = String(labelText || '').trim();
    if (!key) return null;
    const cached = geoCacheRef.current.get(key);
    if (cached) return cached;
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=ph&q=${encodeURIComponent(key)}`;
      const response = await fetch(url, { headers: { 'Accept-Language': 'en' } });
      const json = await response.json();
      const first = json?.[0];
      if (!first?.lat || !first?.lon) return null;
      const coords = { lat: Number(first.lat), lng: Number(first.lon) };
      geoCacheRef.current.set(key, coords);
      return coords;
    } catch (err) {
      return null;
    }
  };

  useEffect(() => {
    const loadProvinces = async () => {
      const data = await fetchCachedJson(
        'psgc:provinces',
        `${PSGC_BASE_URL}/provinces.json`
      );
      setProvinces(Array.isArray(data) ? data : []);
    };
    loadProvinces();
  }, []);

  useEffect(() => {
    if (!provinceCode) {
      setCityMunicipalities([]);
      setCityMunicipalityCode('');
      setCityMunicipalityType('');
      return;
    }
    const loadCityMunicipalities = async () => {
      const [cities, municipalities] = await Promise.all([
        fetchCachedJson(
          `psgc:cities:${provinceCode}`,
          `${PSGC_BASE_URL}/provinces/${provinceCode}/cities.json`
        ),
        fetchCachedJson(
          `psgc:municipalities:${provinceCode}`,
          `${PSGC_BASE_URL}/provinces/${provinceCode}/municipalities.json`
        ),
      ]);

      const nextItems = [
        ...(Array.isArray(cities) ? cities.map((item) => ({ ...item, type: 'city' })) : []),
        ...(Array.isArray(municipalities) ? municipalities.map((item) => ({ ...item, type: 'municipality' })) : []),
      ].sort((a, b) => a.name.localeCompare(b.name));

      setCityMunicipalities(nextItems);
    };

    loadCityMunicipalities();
    setCityMunicipalityCode('');
    setCityMunicipalityType('');
    setBarangayCode('');
    setBarangays([]);
  }, [provinceCode]);

  useEffect(() => {
    if (!includeBarangay || !cityMunicipalityCode || !cityMunicipalityType) {
      setBarangayCode('');
      setBarangays([]);
      return;
    }

    const loadBarangays = async () => {
      const endpoint = cityMunicipalityType === 'city'
        ? `${PSGC_BASE_URL}/cities/${cityMunicipalityCode}/barangays.json`
        : `${PSGC_BASE_URL}/municipalities/${cityMunicipalityCode}/barangays.json`;
      const data = await fetchCachedJson(
        `psgc:barangays:${cityMunicipalityType}:${cityMunicipalityCode}`,
        endpoint
      );
      setBarangays(Array.isArray(data) ? data : []);
    };

    loadBarangays();
    setBarangayCode('');
  }, [cityMunicipalityCode, cityMunicipalityType, includeBarangay]);

  useEffect(() => {
    if (!onChange) return;
    const province = provinces.find((item) => item.code === provinceCode);
    const cityMunicipality = cityMunicipalities.find((item) => item.code === cityMunicipalityCode);
    const barangay = barangays.find((item) => item.code === barangayCode);
    const labelText = buildLabel(barangay, cityMunicipality, province);
    if (labelText) onChange(labelText);
  }, [barangayCode, barangays, cityMunicipalityCode, cityMunicipalities, onChange, provinceCode, provinces]);

  const handleResolveSelection = async () => {
    if (!onCoordinates) return;
    const province = provinces.find((item) => item.code === provinceCode);
    const cityMunicipality = cityMunicipalities.find((item) => item.code === cityMunicipalityCode);
    const barangay = barangays.find((item) => item.code === barangayCode);
    const labelText = buildLabel(barangay, cityMunicipality, province);
    if (!labelText) {
      setStatusMessage('Select a location first.');
      return;
    }
    setStatusMessage('Resolving coordinates...');
    const coords = await resolveCoordinates(`${labelText}, Philippines`);
    if (!coords) {
      setStatusMessage('No coordinates found for that location.');
      return;
    }
    onCoordinates(coords);
    setStatusMessage(`Coordinates set: ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`);
  };

  const handleResolveSearch = async () => {
    if (!onCoordinates) return;
    if (!placeQuery.trim()) return;
    setStatusMessage('Resolving coordinates...');
    const coords = await resolveCoordinates(`${placeQuery}, Philippines`);
    if (!coords) {
      setStatusMessage('No coordinates found for that place.');
      return;
    }
    if (onChange) onChange(placeQuery.trim());
    onCoordinates(coords);
    setStatusMessage(`Coordinates set: ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`);
  };

  return (
    <div className="labs-form-group">
      <label>{label}</label>
      <div className="labs-form-grid">
        <div className="labs-form-group">
          <label>Province</label>
          <LabsDropdown
            options={provinceOptions}
            value={provinceCode}
            onChange={(value) => setProvinceCode(value)}
            placeholder="Select province"
          />
        </div>
        <div className="labs-form-group">
          <label>Municipality / City</label>
          <LabsDropdown
            options={cityMunicipalityOptions}
            value={cityMunicipalityCode ? `${cityMunicipalityType}:${cityMunicipalityCode}` : ''}
            onChange={(value) => {
              const [type, code] = value.split(':');
              setCityMunicipalityType(type);
              setCityMunicipalityCode(code);
            }}
            placeholder={provinceCode ? 'Select municipality/city' : 'Select province first'}
          />
        </div>
      </div>
      {includeBarangay && (
        <div className="labs-form-group">
          <label>Barangay</label>
          <LabsDropdown
            options={barangayOptions}
            value={barangayCode}
            onChange={(value) => setBarangayCode(value)}
            placeholder={cityMunicipalityCode ? 'Select barangay' : 'Select municipality/city first'}
          />
        </div>
      )}
      <div className="labs-form-grid">
        <div className="labs-form-group">
          <label>Quick Search</label>
          <input
            type="text"
            className="labs-input"
            placeholder="Type a place name"
            value={placeQuery}
            onChange={(e) => setPlaceQuery(e.target.value)}
          />
        </div>
        <div className="labs-form-group" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="labs-btn-ghost" onClick={handleResolveSearch}>
            Use Place Name
          </button>
        </div>
      </div>
      {onCoordinates && (
        <button type="button" className="labs-btn-ghost" onClick={handleResolveSelection}>
          Use Selected Location
        </button>
      )}
      {statusMessage && (
        <div className="mono-label" style={{ marginTop: '8px' }}>{statusMessage}</div>
      )}
    </div>
  );
};

export default PhilippinesLocationPicker;
