// admin/src/Components/context/ConfirmContext.jsx
import { useState, useCallback, useRef, useMemo } from 'react';
import { AlertTriangle } from 'lucide-react';
import { ConfirmContext } from './ConfirmContextObject';

// window.confirm() blocks the whole tab, looks like a browser error, and is
// suppressible by the person's own browser settings — which meant a
// destructive action could go through with no prompt at all. This replaces
// it with an in-app dialog that resolves a promise, so callers still read as
// a simple `if (await confirm(...)) { ... }`.
export const ConfirmProvider = ({ children }) => {
  const [dialog, setDialog] = useState(null);
  const resolverRef = useRef(null);

  const confirm = useCallback(
    ({
      title = 'Are you sure?',
      message = '',
      confirmLabel = 'Confirm',
      cancelLabel = 'Cancel',
      tone = 'default',
    } = {}) =>
      new Promise((resolve) => {
        resolverRef.current = resolve;
        setDialog({ title, message, confirmLabel, cancelLabel, tone });
      }),
    []
  );

  // The dialog closes as soon as the answer is given; whatever the caller
  // does next shows its own progress on the control the person pressed, which
  // is where they are already looking.
  const settle = useCallback((answer) => {
    setDialog(null);
    const resolve = resolverRef.current;
    resolverRef.current = null;
    resolve?.(answer);
  }, []);

  const value = useMemo(() => ({ confirm }), [confirm]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      {dialog && (
        <div
          className="fixed inset-0 z-[120] bg-slate-900/50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          // Escape cancels, which is what every other dialog in the app does
          // and what a keyboard user will try first.
          onKeyDown={(e) => {
            if (e.key === 'Escape') settle(false);
          }}
          tabIndex={-1}
        >
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  dialog.tone === 'danger' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
                }`}
              >
                <AlertTriangle size={18} />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-slate-900 text-sm">{dialog.title}</h3>
                {dialog.message && (
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed break-words">{dialog.message}</p>
                )}
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                autoFocus
                onClick={() => settle(true)}
                className={`flex-1 text-white font-bold py-2.5 rounded-lg text-sm transition ${
                  dialog.tone === 'danger'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-emerald-700 hover:bg-emerald-800'
                }`}
              >
                {dialog.confirmLabel}
              </button>
              <button
                type="button"
                onClick={() => settle(false)}
                className="px-5 bg-slate-100 text-slate-600 rounded-lg text-sm font-bold hover:bg-slate-200 transition"
              >
                {dialog.cancelLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
};