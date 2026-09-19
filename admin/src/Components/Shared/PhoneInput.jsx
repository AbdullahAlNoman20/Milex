// admin/src/Components/Shared/PhoneInput.jsx
import { useId } from 'react';
import { BD_DIAL_CODE, MAX_LOCAL_DIGITS, toLocalDigits, toStoredPhone } from './phoneFormat';

// The dial code is rendered as a fixed part of the control rather than
// prefilled text, so it cannot be deleted, duplicated, or replaced with
// another country's code by accident — every number is stored in one shape.
const PhoneInput = ({ value, onChange, disabled = false, id, placeholder = '1XXXXXXXXX' }) => {
  const generatedId = useId();
  const fieldId = id || generatedId;
  const local = toLocalDigits(value);

  return (
    <div
      className={`flex items-stretch w-full border border-slate-200 rounded overflow-hidden focus-within:border-emerald-500 ${
        disabled ? 'bg-slate-100' : 'bg-white'
      }`}
    >
      <span className="flex items-center px-2.5 bg-slate-50 border-r border-slate-200 text-sm font-semibold text-slate-500 shrink-0 select-none">
        {BD_DIAL_CODE}
      </span>
      <input
        id={fieldId}
        type="tel"
        inputMode="numeric"
        disabled={disabled}
        placeholder={placeholder}
        value={local}
        maxLength={MAX_LOCAL_DIGITS}
        onChange={(e) => onChange(toStoredPhone(toLocalDigits(e.target.value)))}
        className="flex-1 min-w-0 p-2.5 text-sm outline-none bg-transparent disabled:cursor-not-allowed"
      />
    </div>
  );
};

export default PhoneInput;