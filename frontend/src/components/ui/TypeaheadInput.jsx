import { useState, useEffect, useMemo, useRef } from 'react';

const TypeaheadInput = ({ options = [], value = '', onChange, placeholder, disabled, hasError }) => {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const lastSyncedValue = useRef(value);


  useEffect(() => {
    if (value === lastSyncedValue.current) return; //considering it has value already and prefills (usually edit mode)
    lastSyncedValue.current = value;
    const matched = options.find((o) => o.value === value);
    setQuery(matched ? matched.label : '');
  }, [value, options]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options.slice(0, 80);
    //this returns an option that is filtered when checked what is the q(q is the query)
    return options.filter((o) => o.label.toLowerCase().includes(q)).slice(0, 80);
  }, [query, options]);

  // close suggestion list when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  //method for to update the options when text inputted
  const handleChange = (e) => {
    setQuery(e.target.value);
    setOpen(true);
    // if the user fully clears the input, also clear the selected value upstream
    if (!e.target.value) {
      lastSyncedValue.current = '';
      onChange('');
    }
  };

  const handleSelect = (opt) => {
    lastSyncedValue.current = opt.value; //gets the value of clicked
    setQuery(opt.label); 
    setOpen(false);
    onChange(opt.value);
  };

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <input
        type="text"
        className={`labs-input${hasError ? ' is-invalid' : ''}`}
        placeholder={placeholder}
        value={query}
        disabled={disabled}
        onChange={handleChange}
        onFocus={() => setOpen(true)}
        autoComplete="off"
        aria-invalid={!!hasError}
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
            {/*upon the filtered options appeared*/}
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
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = opt.value === value ? 'rgba(168,199,250,0.1)' : 'transparent'; }}
            >
              {opt.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default TypeaheadInput;