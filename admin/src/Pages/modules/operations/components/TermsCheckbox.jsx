// src/Pages/modules/operations/components/TermsCheckbox.jsx
import { AWB_TERMS_TEXT } from '../constants/termsAndConditions';

const TermsCheckbox = ({ checked, onChange, disabled }) => (
  <label className="flex items-start gap-3 bg-slate-50 border border-slate-200 rounded-lg p-3 cursor-pointer">
    <input
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={(e) => onChange(e.target.checked)}
      className="mt-0.5 accent-emerald-600 shrink-0"
    />
    <span className="text-xs text-slate-600 leading-relaxed">
      <span className="font-bold text-slate-800">I agree to the Terms & Conditions. </span>
      {AWB_TERMS_TEXT}
    </span>
  </label>
);

export default TermsCheckbox;