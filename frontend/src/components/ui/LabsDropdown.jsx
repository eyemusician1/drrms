import React, { useState, useRef, useEffect, useMemo } from 'react'; // ✏️ CHANGED: added `useMemo` to import
import { createPortal } from 'react-dom';
import './Modal.css';

// added searchable 
const LabsDropdown = ({ options, value, onChange, placeholder, hasError, searchable = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(''); //  tracks what the user typed in the search box
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const searchRef = useRef(null); // ref for auto-focusing the search input when menu opens
  const [menuStyle, setMenuStyle] = useState({});

  const normalizedOptions = (options || []).map((opt) =>
    typeof opt === 'string' ? { label: opt, value: opt } : opt
  );
  const selectedOption = normalizedOptions.find((opt) => opt.value === value);

  // filters options by what the user typed; when `searchable` is false this just returns all options unchanged
  const filteredOptions = useMemo(() => {
    if (!searchable || !searchQuery.trim()) return normalizedOptions;
    const q = searchQuery.trim().toLowerCase();
    return normalizedOptions.filter((opt) => opt.label.toLowerCase().includes(q));
  }, [normalizedOptions, searchQuery, searchable]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        triggerRef.current && !triggerRef.current.contains(event.target) &&
        menuRef.current && !menuRef.current.contains(event.target)
      ) {
        setIsOpen(false);
        setSearchQuery(''); // reset search 
      }
    };
    const handleScroll = (e) => {
      if (isOpen && menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false);
        setSearchQuery(''); // reset when closed by scrolling
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen]);

  // auto-focuses the search input a moment after the menu opens 
  useEffect(() => {
    if (isOpen && searchable && searchRef.current) {
      setTimeout(() => searchRef.current?.focus(), 30);
    }
  }, [isOpen, searchable]);

  const toggleMenu = () => {
    if (!isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setMenuStyle({
        top: `${rect.bottom + 8}px`,
        left: `${rect.left}px`,
        width: `${rect.width}px`,
      });
    }
    if (isOpen) setSearchQuery(''); //clear search when toggling closed
    setIsOpen(!isOpen);
  };

  return (
    <>
      <div
        ref={triggerRef}
        className={`labs-input labs-dropdown-trigger ${isOpen ? 'active' : ''} ${hasError ? 'is-invalid' : ''}`}
        onClick={toggleMenu}
      >
        <span style={{ color: (selectedOption || value) ? '#E3E3E3' : '#8E918F' }}>
          {selectedOption ? selectedOption.label : (value || placeholder)}
        </span>
        <span className={`material-symbols-rounded chevron ${isOpen ? 'open' : ''}`}>
          expand_more
        </span>
      </div>

      {isOpen && createPortal(
        <div className="labs-dropdown-menu" style={menuStyle} ref={menuRef}>

          {/* added search input — only rendered when `searchable` prop is true  */}
          {searchable && (
            <div style={{ padding: '8px 12px 4px' }}>
              <input
                ref={searchRef}
                type="text"
                className="labs-input"
                style={{ fontSize: '13px', padding: '6px 10px', height: 'auto' }}
                placeholder="Type to filter..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onClick={(e) => e.stopPropagation()} // prevents the click from closing the menu
              />
            </div>
          )}

          {/* `filteredOptions` shows "No matches" when search yields nothing */}
          {filteredOptions.length === 0 ? (
            <div style={{ padding: '12px 16px', color: '#8E918F', fontSize: '13px' }}>
              No matches found
            </div>
          ) : (
            filteredOptions.map((opt) => (
              <div
                key={opt.value}
                className={`labs-dropdown-item ${value === opt.value ? 'selected' : ''}`}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                  setSearchQuery(''); 
                }}
              >
                {opt.label}
              </div>
            ))
          )}
        </div>,
        document.body
      )}
    </>
  );
};

export default LabsDropdown;