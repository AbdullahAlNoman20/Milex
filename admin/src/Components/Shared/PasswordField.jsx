// admin/src/Components/Shared/PasswordField.jsx
import { useState, useId } from 'react';
import { Eye, EyeOff, Check, X } from 'lucide-react';
import { PASSWORD_RULES } from './passwordRules';

// The rules are shown as a live checklist rather than a sentence the person
// has to re-read after every failed attempt — each line turns green the
// moment it is satisfied, so the requirement and the progress are the same
// piece of information.
const PasswordChecklist = ({ value }) => (
  <ul className="mt-2 space-y-1">
    {PASSWORD_RULES.map((rule) => {
      const ok = rule.test(value);
      return (
        <li
          key={rule.key}
          className={`flex items-center gap-1.5 text-[11px] leading-tight ${
            ok ? 'text-emerald-700' : 'text-slate-400'
          }`}
        >
          {ok ? <Check size={11} className="shrink-0" /> : <X size={11} className="shrink-0" />}
          {rule.label}
        </li>
      );
    })}
  </ul>
);

const PasswordField = ({
  value,
  onChange,
  placeholder = 'Password',
  label,
  autoComplete = 'new-password',
  showChecklist = false,
  disabled = false,
  maxLength = 200,
  id,
  className = '',
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const generatedId = useId();
  const fieldId = id || generatedId;

  return (
    <div>
      {label && (
        <label htmlFor={fieldId} className="block text-sm font-semibold text-slate-700 mb-2">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={fieldId}
          type={isVisible ? 'text' : 'password'}
          autoComplete={autoComplete}
          disabled={disabled}
          maxLength={maxLength}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full border border-slate-300 p-3 pr-11 rounded-lg text-sm outline-none focus:border-emerald-500 bg-slate-50 disabled:bg-slate-100 ${className}`}
        />
        <button
          type="button"
          onClick={() => setIsVisible((v) => !v)}
          // tabIndex -1 keeps the toggle out of the keyboard path between the
          // password field and the submit button, which is the order someone
          // typing a password actually wants.
          tabIndex={-1}
          aria-label={isVisible ? 'Hide password' : 'Show password'}
          className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600 transition"
        >
          {isVisible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      {showChecklist && <PasswordChecklist value={value || ''} />}
    </div>
  );
};

export default PasswordField;