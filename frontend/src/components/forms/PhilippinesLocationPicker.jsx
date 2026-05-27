import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import LabsDropdown from '../ui/LabsDropdown';
import { geocodePhilippinesPlace } from '../../services/geocode';
import { NCR_PROVINCE_KEY, NCR_REGION_CODE } from '../../utils/philippinesGeo';

//created a method for 
const TypeaheadInput = ({ options, value, onChange, placeholder, disabled }) => {
  const [query, setQuery] = React.useState('');
  const [open, setOpen] = React.useState(false);
  const [isFocused, setIsFocused] = React.useState(false);
  const containerRef = React.useRef(null);

  React.useEffect(() => {
    const matched = options.find((o) => o.value === value);
    setQuery(matched ? matched.label : '');
  }, [value, options]);

  const filtered = React.useMemo(() => {
    if (!query.trim()) return options.slice(0, 80); 
    const q = query.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q)).slice(0, 80);
  }, [query, options]);

  // close on outside click
  React.useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (opt) => {
    setQuery(opt.label);
    setOpen(false);
    onChange(opt.value);
  };

  const handleChange = (e) => {
    setQuery(e.target.value);
    setOpen(true);
    // selected value is cleared when the user clears thei input
    if (!e.target.value) onChange('');
  };

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <input
        type="text"
        className="labs-input"
        placeholder={placeholder}
        value={query}
        disabled={disabled}
        onChange={handleChange}
        onFocus={() => { setOpen(true); setIsFocused(true); }}
        onBlur={() => setIsFocused(false)}
        autoComplete="off"
      />
      {open && !disabled && filtered.length > 0 && (
        <ul style={{
          position: 'absolute',
          zIndex: 999,
          top: 'calc(100% + 4px)',
          left: 0,
          right: 0,
          margin: 0,
          padding: '4px 0',
          listStyle: 'none',
          background: '#1e1e1e',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '10px',
          maxHeight: '220px',
          overflowY: 'auto',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        }}>
          {filtered.map((opt) => (
            <li
              key={opt.value}
              onMouseDown={() => handleSelect(opt)}
              style={{
                padding: '9px 14px',
                cursor: 'pointer',
                fontSize: '13px',
                color: opt.value === value ? '#A8C7FA' : '#E3E3E3',
                background: opt.value === value ? 'rgba(168,199,250,0.1)' : 'transparent',
                borderRadius: '6px',
                margin: '0 6px',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
              onMouseLeave={(e) => e.currentTarget.style.background = opt.value === value ? 'rgba(168,199,250,0.1)' : 'transparent'}
            >
              {opt.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

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
  if (!response.ok) throw new Error(`PSGC request failed: ${url}`);
  const data = await response.json();
  sessionStorage.setItem(cacheKey, JSON.stringify(data));
  return data;
};

const buildLabel = (barangay, cityMunicipality, province) => {
  return [barangay?.name, cityMunicipality?.name, province?.name]
    .filter(Boolean)
    .join(', ');
};

const emptyValue = () => ({
  provinceCode: '',
  cityMunicipalityCode: '',
  cityMunicipalityType: '',
  barangayCode: '',
  label: '',
});

const PhilippinesLocationPicker = ({
  label = 'Location (Philippines)',
  includeBarangay = true,
  autoResolveCoordinates = true,
  value,
  onChange,
  onCoordinates,
  onLocationDetail,
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
  const [isResolving, setIsResolving] = useState(false);
  const hydratingRef = useRef(false);
  const lastResolvedLabelRef = useRef('');

  const provinceOptions = useMemo(() => {
    const base = provinces.map((item) => ({ label: item.name, value: item.code }));
    return [{ label: 'Metro Manila (NCR)', value: NCR_PROVINCE_KEY }, ...base];
  }, [provinces]);

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

  const getSelectedParts = useCallback(() => {
    const province = provinceCode === NCR_PROVINCE_KEY
      ? { name: 'Metro Manila' }
      : provinces.find((item) => item.code === provinceCode);
    const cityMunicipality = cityMunicipalities.find((item) => item.code === cityMunicipalityCode);
    const barangay = barangays.find((item) => item.code === barangayCode);
    return {
      barangay: barangay?.name || '',
      city: cityMunicipality?.name || '',
      province: province?.name || '',
    };
  }, [
    barangayCode,
    barangays,
    cityMunicipalities,
    cityMunicipalityCode,
    provinceCode,
    provinces,
  ]);

  const emitLocationDetail = useCallback((labelText) => {
    if (!onLocationDetail) return;
    const province = provinceCode === NCR_PROVINCE_KEY
      ? { code: NCR_PROVINCE_KEY, name: 'Metro Manila (NCR)' }
      : provinces.find((item) => item.code === provinceCode);
    const cityMunicipality = cityMunicipalities.find((item) => item.code === cityMunicipalityCode);
    const barangay = barangays.find((item) => item.code === barangayCode);
    onLocationDetail({
      province_code: provinceCode === NCR_PROVINCE_KEY ? NCR_REGION_CODE : (provinceCode || null),
      city_municipality_code: cityMunicipalityCode || null,
      city_municipality_type: cityMunicipalityType || null,
      barangay_code: barangayCode || null,
      label: labelText || buildLabel(barangay, cityMunicipality, province),
    });
  }, [
    barangayCode,
    barangays,
    cityMunicipalityCode,
    cityMunicipalities,
    cityMunicipalityType,
    onLocationDetail,
    provinceCode,
    provinces,
  ]);

  const applyCoordinates = useCallback(async (labelText, parts = {}, { silent = false } = {}) => {
    if (!onCoordinates || !labelText) return false;
    if (!silent) {
      setIsResolving(true);
      setStatusMessage('Resolving coordinates...');
    }
    const coords = await geocodePhilippinesPlace(labelText, parts);
    if (!coords) {
      if (!silent) {
        setStatusMessage('Could not resolve coordinates. Try selecting city/municipality or a more specific place name.');
      }
      setIsResolving(false);
      return false;
    }
    onCoordinates(coords);
    lastResolvedLabelRef.current = labelText;
    if (!silent) {
      setStatusMessage(`Coordinates set: ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`);
    }
    setIsResolving(false);
    return true;
  }, [onCoordinates]);

  useEffect(() => {
    const loadProvinces = async () => {
      try {
        const data = await fetchCachedJson(
          'psgc:provinces',
          `${PSGC_BASE_URL}/provinces.json`
        );
        setProvinces(Array.isArray(data) ? data : []);
      } catch (err) {
        setStatusMessage('Could not load provinces. Check your connection.');
      }
    };
    loadProvinces();
  }, []);

  useEffect(() => {
    if (!value) return;
    hydratingRef.current = true;
    setProvinceCode(value.provinceCode === NCR_REGION_CODE ? NCR_PROVINCE_KEY : (value.provinceCode || ''));
    setCityMunicipalityCode(value.cityMunicipalityCode || '');
    setCityMunicipalityType(value.cityMunicipalityType || '');
    setBarangayCode(value.barangayCode || '');
    if (value.label) setPlaceQuery('');
    const timer = setTimeout(() => {
      hydratingRef.current = false;
    }, 400);
    return () => clearTimeout(timer);
  }, [
    value?.provinceCode,
    value?.cityMunicipalityCode,
    value?.cityMunicipalityType,
    value?.barangayCode,
  ]);

  useEffect(() => {
    if (!provinceCode) {
      setCityMunicipalities([]);
      if (!hydratingRef.current) {
        setCityMunicipalityCode('');
        setCityMunicipalityType('');
        setBarangayCode('');
      }
      setBarangays([]);
      return;
    }

    const loadCityMunicipalities = async () => {
      try {
        if (provinceCode === NCR_PROVINCE_KEY) {
          const cities = await fetchCachedJson(
            `psgc:ncr:cities`,
            `${PSGC_BASE_URL}/regions/${NCR_REGION_CODE}/cities.json`
          );
          const nextItems = (Array.isArray(cities) ? cities : [])
            .map((item) => ({ ...item, type: 'city' }))
            .sort((a, b) => a.name.localeCompare(b.name));
          setCityMunicipalities(nextItems);
          return;
        }

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
      } catch (err) {
        setStatusMessage('Could not load cities/municipalities.');
      }
    };

    loadCityMunicipalities();
    if (!hydratingRef.current) {
      setCityMunicipalityCode('');
      setCityMunicipalityType('');
      setBarangayCode('');
      setBarangays([]);
    }
  }, [provinceCode]);

  useEffect(() => {
    if (!includeBarangay || !cityMunicipalityCode || !cityMunicipalityType) {
      if (!hydratingRef.current) setBarangayCode('');
      setBarangays([]);
      return;
    }

    const loadBarangays = async () => {
      try {
        const endpoint = cityMunicipalityType === 'city'
          ? `${PSGC_BASE_URL}/cities/${cityMunicipalityCode}/barangays.json`
          : `${PSGC_BASE_URL}/municipalities/${cityMunicipalityCode}/barangays.json`;
        const data = await fetchCachedJson(
          `psgc:barangays:${cityMunicipalityType}:${cityMunicipalityCode}`,
          endpoint
        );
        setBarangays(Array.isArray(data) ? data : []);
      } catch (err) {
        setStatusMessage('Could not load barangays.');
      }
    };

    loadBarangays();
    if (!hydratingRef.current) setBarangayCode('');
  }, [cityMunicipalityCode, cityMunicipalityType, includeBarangay]);

  useEffect(() => {
    const province = provinceCode === NCR_PROVINCE_KEY
      ? { code: NCR_PROVINCE_KEY, name: 'Metro Manila (NCR)' }
      : provinces.find((item) => item.code === provinceCode);
    const cityMunicipality = cityMunicipalities.find((item) => item.code === cityMunicipalityCode);
    const barangay = barangays.find((item) => item.code === barangayCode);
    const labelText = buildLabel(barangay, cityMunicipality, province);
    if (!labelText) return;
    if (onChange) onChange(labelText);
    emitLocationDetail(labelText);

    const selectionComplete = includeBarangay
      ? Boolean(barangayCode) || Boolean(cityMunicipalityCode && cityMunicipalityType)
      : Boolean(cityMunicipalityCode && cityMunicipalityType);

    if (
      autoResolveCoordinates
      && onCoordinates
      && selectionComplete
      && !hydratingRef.current
      && labelText !== lastResolvedLabelRef.current
    ) {
      applyCoordinates(labelText, getSelectedParts(), { silent: true });
    }
  }, [
    applyCoordinates,
    getSelectedParts,
    autoResolveCoordinates,
    barangayCode,
    barangays,
    cityMunicipalityCode,
    cityMunicipalities,
    cityMunicipalityType,
    emitLocationDetail,
    includeBarangay,
    onChange,
    onCoordinates,
    provinceCode,
    provinces,
  ]);

  const handleResolveSelection = async () => {
    const province = provinceCode === NCR_PROVINCE_KEY
      ? { code: NCR_PROVINCE_KEY, name: 'Metro Manila (NCR)' }
      : provinces.find((item) => item.code === provinceCode);
    const cityMunicipality = cityMunicipalities.find((item) => item.code === cityMunicipalityCode);
    const barangay = barangays.find((item) => item.code === barangayCode);
    const labelText = buildLabel(barangay, cityMunicipality, province);
    if (!labelText) {
      setStatusMessage('Select province, city/municipality' + (includeBarangay ? ', and barangay.' : '.'));
      return;
    }
    await applyCoordinates(labelText, getSelectedParts());
  };

  const handleResolveSearch = async () => {
    if (!placeQuery.trim()) return;
    const query = placeQuery.trim();
    setIsResolving(true);
    setStatusMessage('Resolving coordinates...');
    const coords = await geocodePhilippinesPlace(query, getSelectedParts());
    if (!coords) {
      setStatusMessage('No coordinates found for that place. Try adding province or city (e.g. "Iba, Zambales").');
      setIsResolving(false);
      return;
    }
    if (onChange) onChange(query);
    if (onCoordinates) onCoordinates(coords);
    if (onLocationDetail) {
      onLocationDetail({
        province_code: null,
        city_municipality_code: null,
        city_municipality_type: null,
        barangay_code: null,
        label: query,
      });
    }
    lastResolvedLabelRef.current = query;
    setStatusMessage(`Coordinates set: ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`);
    setIsResolving(false);
  };

  const handlePlaceKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleResolveSearch();
    }
  };

  return (
    <div className="labs-form-group philippines-location-picker">
      {label ? <label>{label}</label> : null}
      <p className="mono-label" style={{ marginBottom: '12px', opacity: 0.7 }}>
        Select from Philippine administrative areas or type a place name. Map coordinates stay within the Philippines.
      </p>
      <div className="labs-form-grid">
        <div className="labs-form-group">
          <label>Province</label>
          {/* replaced LabsDropdown with TypeaheadInput */}
          <TypeaheadInput
            options={provinceOptions}
            value={provinceCode}
            onChange={(next) => setProvinceCode(next)}
            placeholder="Select province"
            searchable
            searchPlaceholder="Search province"
          />
        </div>
        <div className="labs-form-group">
          <label>City / Municipality</label>
          <TypeaheadInput
            options={cityMunicipalityOptions}
            value={cityMunicipalityCode ? `${cityMunicipalityType}:${cityMunicipalityCode}` : ''}
            onChange={(next) => {
              if (!next) { setCityMunicipalityType(''); setCityMunicipalityCode(''); return; }
              const [type, code] = next.split(':');
              setCityMunicipalityType(type);
              setCityMunicipalityCode(code);
            }}
            placeholder={provinceCode ? 'Select city or municipality' : 'Select province first'}
            searchable
            searchPlaceholder="Search city or municipality"
          />
        </div>
      </div>
      {includeBarangay && (
        <div className="labs-form-group">
          <label>Barangay</label>
          <TypeaheadInput
            options={barangayOptions}
            value={barangayCode}
            onChange={(next) => setBarangayCode(next)}
            placeholder={cityMunicipalityCode ? 'Type to search barangay...' : 'Select city/municipality first'}
            disabled={!cityMunicipalityCode}
          />
        </div>
      )}
      <div className="labs-form-grid">
        <div className="labs-form-group">
          <label>Quick search (place name)</label>
          <input
            type="text"
            className="labs-input"
            placeholder="e.g. Tacloban, Cebu City, Baguio"
            value={placeQuery}
            onChange={(e) => setPlaceQuery(e.target.value)}
            onKeyDown={handlePlaceKeyDown}
          />
        </div>
        <div className="labs-form-group" style={{ justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="labs-btn-ghost"
            onClick={handleResolveSearch}
            disabled={isResolving}
          >
            Use place name
          </button>
        </div>
      </div>
      {onCoordinates && (
        <button
          type="button"
          className="labs-btn-ghost"
          onClick={handleResolveSelection}
          disabled={isResolving}
        >
          Use selected location
        </button>
      )}
      {statusMessage && (
        <div className="mono-label" style={{ marginTop: '8px' }}>{statusMessage}</div>
      )}
    </div>
  );
};

PhilippinesLocationPicker.emptyValue = emptyValue;

export default PhilippinesLocationPicker;