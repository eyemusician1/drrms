import React, { useEffect } from 'react';
import './Toast.css';

const toastIcon = (type) => {
  switch (type) {
    case 'success':
      return 'check_circle';
    case 'error':
      return 'error';
    case 'warning':
      return 'warning';
    default:
      return 'info';
  }
};

const ToastItem = ({ message, type }) => (
  <div className={`labs-toast toast-life toast-${type || 'info'}`}>
    <span className="material-symbols-rounded toast-icon">
      {toastIcon(type)}
    </span>
    <p>{message}</p>
  </div>
);

const Toast = ({ message, isVisible, onCloseAll, toasts, duration = 3500 }) => {
  const items = Array.isArray(toasts)
    ? toasts
    : (isVisible && message ? [{ id: 'single', message }] : []);

  useEffect(() => {
    if (!items.length || !onCloseAll) return undefined;
    const timer = setTimeout(() => {
      onCloseAll();
    }, duration);
    return () => clearTimeout(timer);
  }, [items.length, onCloseAll, duration]);

  if (!items.length) return null;

  return (
    <div className="labs-toast-container">
      <div className="labs-toast-stack">
        {items.map((toast) => (
          <ToastItem
            key={toast.id || toast.message}
            message={toast.message}
            type={toast.type || 'info'}
          />
        ))}
      </div>
    </div>
  );
};

export default Toast;