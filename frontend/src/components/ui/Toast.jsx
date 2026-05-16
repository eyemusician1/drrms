import React, { useEffect } from 'react';
import './Toast.css';

const ToastItem = ({ message, onClose, duration = 3500 }) => {
  useEffect(() => {
    if (!onClose) return undefined;
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  return (
    <div className="labs-toast slide-up-fade">
      <span className="material-symbols-rounded" style={{ color: '#A8C7FA' }}>
        check_circle
      </span>
      <p>{message}</p>
    </div>
  );
};

const Toast = ({ message, isVisible, onClose, toasts }) => {
  const items = Array.isArray(toasts)
    ? toasts
    : (isVisible && message ? [{ id: 'single', message }] : []);

  if (!items.length) return null;

  return (
    <div className="labs-toast-container">
      <div className="labs-toast-stack">
        {items.map((toast) => (
          <ToastItem
            key={toast.id || toast.message}
            message={toast.message}
            onClose={onClose ? () => onClose(toast.id) : undefined}
          />
        ))}
      </div>
    </div>
  );
};

export default Toast;