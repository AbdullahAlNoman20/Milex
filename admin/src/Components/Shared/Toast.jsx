// admin/src/Components/Shared/Toast.jsx
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
    // On phones the toast spans the full width with its own inset margins,
    // so it can't be pushed past the edge of the screen. It also sits below
    // the safe-area inset so a notch or Dynamic Island never covers it.
    // From sm upward it returns to the compact top-right card.
    <div
      className="fixed z-[100] flex flex-col gap-2 left-3 right-3 top-3 sm:left-auto sm:right-4 sm:top-4 sm:w-full sm:max-w-sm pointer-events-none"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      {toasts.map((t) => {
        const config = TYPE_CONFIG[t.type] || TYPE_CONFIG.success;
        const Icon = config.icon;
        return (
          <div
            key={t.id}
            role="alert"
            className={`${config.classes} pointer-events-auto px-4 py-3 rounded-lg shadow-lg flex items-start gap-3 animate-in slide-in-from-top-2`}
          >
            <Icon size={18} className="shrink-0 mt-0.5" />
            {/* min-w-0 lets the text wrap instead of forcing the row wider
                than its container, which is what pushed the close button out
                of view on narrow screens. */}
            <span className="text-sm font-medium break-words min-w-0 flex-1">{t.message}</span>
            <button
              type="button"
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