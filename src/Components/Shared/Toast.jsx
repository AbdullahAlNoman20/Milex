// src/Components/Shared/Toast.jsx
import React from 'react';
import { CheckCircle, AlertCircle, XCircle, Info, X } from 'lucide-react';
import { useToast } from '../hooks/useToast';

const TYPE_CONFIG = {
  success: { icon: CheckCircle, classes: 'bg-emerald-600 text-white' },
  error: { icon: XCircle, classes: 'bg-red-600 text-white' },
  warning: { icon: AlertCircle, classes: 'bg-amber-500 text-white' },
  info: { icon: Info, classes: 'bg-slate-800 text-white' },
};

const Toast = () => {
  const { toasts, removeToast } = useToast();

  if (!toasts.length) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
      {toasts.map((t) => {
        const config = TYPE_CONFIG[t.type] || TYPE_CONFIG.success;
        const Icon = config.icon;
        return (
          <div
            key={t.id}
            role="alert"
            className={`${config.classes} px-4 py-3 rounded-lg shadow-lg flex items-start gap-3 animate-in slide-in-from-top-2`}
          >
            <Icon size={18} className="shrink-0 mt-0.5" />
            <span className="text-sm font-medium break-words flex-1">{t.message}</span>
            <button
              onClick={() => removeToast(t.id)}
              aria-label="Dismiss notification"
              className="shrink-0 opacity-80 hover:opacity-100 transition"
            >
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default Toast;