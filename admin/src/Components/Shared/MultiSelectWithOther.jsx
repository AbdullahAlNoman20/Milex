// admin/src/Components/Shared/MultiSelectWithOther.jsx 
import { useState, useRef, useEffect } from 'react';
import { X, Plus, ChevronDown, Check } from 'lucide-react';

// Dropdown-style multi-select: click to open, click any option once to
// toggle it (no Ctrl/Cmd needed), click outside to close. Plus a "+ Add"
// row inside the same dropdown for custom entries.
const MultiSelectWithOther = ({ options = [], value = [], onChange, placeholder = 'Select providers...' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [customText, setCustomText] = useState('');
  const ref = useRef(null);
  const selected = Array.isArray(value) ? value : [];
  const allOptions = [...new Set([...options, ...selected])];

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setIsOpen(false);
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
    setCustomText('');
  };

  const removeTag = (tag) => onChange(selected.filter((v) => v !== tag));

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
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
            <span key={tag} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-700 text-xs font-semibold">
              {tag}
              <button type="button" onClick={() => removeTag(tag)} className="hover:text-red-500 transition"><X size={12} /></button>
            </span>
          ))}
        </div>
      )}

      {isOpen && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {allOptions.map((opt) => {
            const isSelected = selected.includes(opt);
            return (
              <button
                key={opt}
                type="button"
                onClick={() => toggle(opt)}
                className={`w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-slate-50 transition ${isSelected ? 'bg-emerald-50' : ''}`}
              >
                <span className={isSelected ? 'font-semibold text-emerald-700' : 'text-slate-700'}>{opt}</span>
                {isSelected && <Check size={14} className="text-emerald-600" />}
              </button>
            );
          })}
          <div className="border-t border-slate-100 p-2 flex gap-2">
            <input
              autoFocus
              className="flex-1 border border-slate-200 p-1.5 rounded text-xs outline-none focus:border-emerald-500"
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
              className="px-2.5 bg-emerald-600 text-white rounded text-xs font-bold hover:bg-emerald-700 transition flex items-center gap-1"
            >
              <Plus size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiSelectWithOther;