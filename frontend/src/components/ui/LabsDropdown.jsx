import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import './Modal.css';

const LabsDropdown = ({
  options,
  value,
  onChange,
  placeholder,
  hasError,
  searchable = false,
  searchPlaceholder = 'Search...'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const searchRef = useRef(null);
  const [menuStyle, setMenuStyle] = useState({});
  const normalizedOptions = (options || []).map((opt) => (
    typeof opt === 'string' ? { label: opt, value: opt } : opt
  ));
  const selectedOption = normalizedOptions.find((opt) => opt.value === value);

  const filteredOptions = useMemo(() => {
    if (!searchable || !searchQuery.trim()) return normalizedOptions;
    const query = searchQuery.trim().toLowerCase();
    return normalizedOptions.filter((opt) => opt.label.toLowerCase().includes(query));
  }, [normalizedOptions, searchQuery, searchable]);

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      return;
    }
    if (searchable && searchRef.current) {
      searchRef.current.focus();
    }
    // Close if clicked outside the trigger or the menu
    const handleClickOutside = (event) => {
      if (
        triggerRef.current && !triggerRef.current.contains(event.target) &&
        menuRef.current && !menuRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    // Close if the user scrolls the modal (prevents the menu from floating away)
    const handleScroll = (e) => {
      if (isOpen && menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('scroll', handleScroll, true);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen]);

  const toggleMenu = () => {
    // Calculate exact screen coordinates before opening
    if (!isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setMenuStyle({
        top: `${rect.bottom + 8}px`,
        left: `${rect.left}px`,
        width: `${rect.width}px`
      });
    }
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

      {/* React Portal renders the menu directly to the body, escaping all overflow restrictions! */}
      {isOpen && createPortal(
        <div className="labs-dropdown-menu" style={menuStyle} ref={menuRef}>
          {searchable && (
            <div className="labs-dropdown-search-wrap">
              <input
                ref={searchRef}
                type="text"
                className="labs-dropdown-search"
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          )}
          {filteredOptions.length === 0 ? (
            <div className="labs-dropdown-empty">No matches found</div>
          ) : (
            filteredOptions.map((opt) => (
              <div
                key={opt.value}
                className={`labs-dropdown-item ${value === opt.value ? 'selected' : ''}`}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
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