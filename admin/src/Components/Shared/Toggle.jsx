// admin/src/Components/Shared/Toggle.jsx
// One switch for every either/or choice in the application. A tick box reads
// as "also do this"; these are choices between two routes a record can take,
// which is a different thing and deserves to look like one.
const Toggle = ({ checked, onChange, label, hint, disabled = false, id }) => (
  <label
    htmlFor={id}
    className={`flex items-start gap-3 select-none ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
  >
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 mt-0.5 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500 ${
        checked ? 'bg-indigo-600' : 'bg-slate-300'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform mt-0.5 ${
          checked ? 'translate-x-[18px]' : 'translate-x-0.5'
        }`}
      />
    </button>
    <span className="min-w-0">
      <span className="block text-[11px] font-bold text-slate-700 leading-tight">{label}</span>
      {hint && <span className="block text-[10px] text-slate-400 mt-0.5 leading-tight">{hint}</span>}
    </span>
  </label>
);

export default Toggle;