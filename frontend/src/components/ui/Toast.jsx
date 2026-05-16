import React, { useEffect } from 'react';
import './Toast.css';

const ToastItem = ({ message }) => (
  <div className="labs-toast toast-life">
    <span className="material-symbols-rounded" style={{ color: '#A8C7FA' }}>
      check_circle
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
          <ToastItem key={toast.id || toast.message} message={toast.message} />
        ))}
      </div>
    </div>
  );
};

export default Toast;