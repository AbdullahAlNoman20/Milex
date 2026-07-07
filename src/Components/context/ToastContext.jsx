// src/Components/context/ToastContext.jsx
import React, { createContext, useState, useCallback, useRef, useMemo } from 'react';

export const ToastContext = createContext(null);

const MAX_TOAST_LENGTH = 300;
const DEFAULT_DURATION_MS = 3000;

const sanitizeMessage = (msg) => {
  if (typeof msg !== 'string') return '';
  return msg.slice(0, MAX_TOAST_LENGTH);
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const idCounter = useRef(0);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message, type = 'success', duration = DEFAULT_DURATION_MS) => {
      const safeMessage = sanitizeMessage(message);
      if (!safeMessage) return;
      const id = ++idCounter.current;
      const safeDuration = Number.isFinite(duration) ? Math.min(Math.max(duration, 1000), 10000) : DEFAULT_DURATION_MS;
      setToasts((prev) => [...prev, { id, message: safeMessage, type }]);
      window.setTimeout(() => removeToast(id), safeDuration);
    },
    [removeToast]
  );

  const value = useMemo(() => ({ toasts, showToast, removeToast }), [toasts, showToast, removeToast]);

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
};