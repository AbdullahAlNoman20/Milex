// admin/src/Components/Shared/MultiSelectWithOther.jsx
import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, ChevronDown, Check } from 'lucide-react';

const DROPDOWN_MAX_HEIGHT = 256;
const VIEWPORT_MARGIN = 12;

// Dropdown-style multi-select: click to open, click any option once to
// toggle it (no Ctrl/Cmd needed), click outside to close. Plus a "+ Add"
// row inside the same dropdown for custom entries.
//
// The list is drawn in a portal and positioned against the live viewport, so
// on a phone — where this control often sits near the bottom of a long form —
// it opens upwards instead of running off the end of the screen.
const MultiSelectWithOther = ({
  options = [],
  value = [],
  onChange,
  // Lets the page offer a typed-in name in every other copy of the same
  // dropdown immediately, rather than only after the form is submitted.
  onAddCustom,
  placeholder = 'Select providers...',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [customText, setCustomText] = useState('');
  const [coords, setCoords] = useState(null);
  const ref = useRef(null);
  const triggerRef = useRef(null);
  const selected = Array.isArray(value) ? value : [];
  const allOptions = [...new Set([...options, ...selected])];

  const updateCoords = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const below = window.innerHeight - rect.bottom - VIEWPORT_MARGIN;
    const above = rect.top - VIEWPORT_MARGIN;
    // Whichever side has more room wins, and the list is never taller than
    // the room it has.
    const openUp = below < Math.min(DROPDOWN_MAX_HEIGHT, above) && above > below;
    setCoords({
      left: rect.left,
      width: rect.width,
      maxHeight: Math.max(140, Math.min(DROPDOWN_MAX_HEIGHT, openUp ? above : below)),
      ...(openUp ? { bottom: window.innerHeight - rect.top + 4 } : { top: rect.bottom + 4 }),
    });
  }, []);

  useEffect(() => {
    if (!isOpen) return undefined;
    updateCoords();
    const handle = () => updateCoords();
    window.addEventListener('scroll', handle, true);
    window.addEventListener('resize', handle);
    return () => {
      window.removeEventListener('scroll', handle, true);
      window.removeEventListener('resize', handle);
    };
  }, [isOpen, updateCoords]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        ref.current &&
        !ref.current.contains(e.target) &&
        !e.target.closest('[data-multiselect-dropdown]')
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggle = (opt) => {
    if (selected.includes(opt)) onChange(selected.filter((v) => v !== opt));
    else onChange([...selected, opt]);
  };

  const addCustom = () => {
    const clean = customText.trim();
    if (!clean) return;
    if (!selected.includes(clean)) onChange([...selected, clean]);
    onAddCustom?.(clean);
    setCustomText('');
  };

  const removeTag = (tag) => onChange(selected.filter((v) => v !== tag));

  return (
    <div className="relative" ref={ref}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          updateCoords();
          setIsOpen((o) => !o);
        }}
        className="w-full border border-slate-200 rounded text-sm bg-white outline-none focus:border-emerald-500 px-3 py-2.5 flex items-center justify-between text-left"
      >
        <span className={selected.length ? 'text-slate-800' : 'text-slate-400'}>
          {selected.length ? `${selected.length} selected` : placeholder}
        </span>
        <ChevronDown size={15} className="text-slate-400 shrink-0" />
      </button>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {selected.map((tag) => (
            <span key={tag} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-700 text-xs font-semibold max-w-full">
              <span className="truncate min-w-0">{tag}</span>
              <button type="button" onClick={() => removeTag(tag)} className="hover:text-red-500 transition shrink-0"><X size={12} /></button>
            </span>
          ))}
        </div>
      )}

      {isOpen && coords && createPortal(
        <div
          data-multiselect-dropdown
          style={{
            position: 'fixed',
            left: coords.left,
            width: coords.width,
            maxHeight: coords.maxHeight,
            ...(coords.top !== undefined ? { top: coords.top } : { bottom: coords.bottom }),
            zIndex: 9999,
          }}
          className="bg-white border border-slate-200 rounded-lg shadow-lg overflow-y-auto"
        >
          {allOptions.map((opt) => {
            const isSelected = selected.includes(opt);
            return (
              <button
                key={opt}
                type="button"
                onClick={() => toggle(opt)}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-left hover:bg-slate-50 transition ${isSelected ? 'bg-emerald-50' : ''}`}
              >
                <span className={`truncate min-w-0 ${isSelected ? 'font-semibold text-emerald-700' : 'text-slate-700'}`}>{opt}</span>
                {isSelected && <Check size={14} className="text-emerald-600 shrink-0" />}
              </button>
            );
          })}
          <div className="sticky bottom-0 bg-white border-t border-slate-100 p-2 flex gap-2">
            <input
              autoFocus
              className="flex-1 min-w-0 border border-slate-200 p-1.5 rounded text-xs outline-none focus:border-emerald-500"
              placeholder="Type a new provider..."
              value={customText}
              maxLength={120}
              onChange={(e) => setCustomText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addCustom();
                }
              }}
            />
            <button
              type="button"
              onClick={addCustom}
              className="px-2.5 bg-emerald-600 text-white rounded text-xs font-bold hover:bg-emerald-700 transition flex items-center gap-1 shrink-0"
            >
              <Plus size={13} />
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default MultiSelectWithOther;