// src/Pages/modules/operations/components/FormField.jsx
import InfoTooltip from './InfoTooltip';

const baseInputClass =
  'w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-slate-50 focus:border-emerald-500 outline-none disabled:opacity-60';

// Shared field renderer used across AWB Generate, Commercial Invoice,
// Import/Export Request — label + info tooltip + placeholder example, driven
// entirely by the field definitions in constants/shipmentFields.js so help
// text only has to be written once per field, not once per form.
const FormField = ({ field, value, onChange, disabled }) => (
  <div>
    <label className="flex items-center text-xs font-bold text-slate-700 mb-1">
      {field.label}
      {field.required && <span className="text-red-500 ml-0.5">*</span>}
      <InfoTooltip text={field.help} example={field.placeholder} />
    </label>
    {field.type === 'textarea' ? (
      <textarea
        rows={3}
        value={value}
        placeholder={field.placeholder}
        onChange={(e) => onChange(e.target.value)}
        maxLength={1000}
        disabled={disabled}
        className={baseInputClass}
      />
    ) : field.type === 'select' ? (
      <select value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} className={baseInputClass}>
        <option value="">Select...</option>
        {field.options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    ) : (
      <input
        type={field.type}
        value={value}
        placeholder={field.placeholder}
        onChange={(e) => onChange(e.target.value)}
        maxLength={254}
        disabled={disabled}
        className={baseInputClass}
      />
    )}
  </div>
);

export default FormField;