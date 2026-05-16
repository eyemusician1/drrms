import React, { useEffect } from 'react';
import './Modal.css';

const Modal = ({ isOpen, onClose, title, children, actionText = "Submit", onAction }) => {

  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
    return () => document.body.style.overflow = 'unset';
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="labs-modal-overlay" onClick={onClose}>
      <div className="labs-modal-container" onClick={(e) => e.stopPropagation()}>

        <header className="labs-modal-header">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close modal">
            <span className="material-symbols-rounded">close</span>
          </button>
        </header>

        <div className="labs-modal-body">
          {children}
        </div>

        <footer className="labs-modal-footer">
          <button className="labs-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="labs-btn-large" onClick={onAction}>{actionText}</button>
        </footer>

      </div>
    </div>
  );
};

export default Modal;