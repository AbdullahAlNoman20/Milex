// admin/src/Pages/modules/sales/roles/KAM/FinalAccountProfilePanel.jsx
import { useState, useCallback, useRef } from 'react';
import { ClipboardEdit, FileCheck, Loader2 } from 'lucide-react';
import { updateFinalProfile, setAccountConfigMode, submitFinalOnboardingRegular, submitFinalOnboarding } from '../../services/customerService';
import { useToast } from '../../../../../Components/hooks/useToast';
import { GAIN_TYPE_OPTIONS, DESIGNATION_OPTIONS, FINANCE_MODE_OPTIONS } from '../../constants/formOptions';
import DocumentUploadPanel from './DocumentUploadPanel';

// Four of these answers were already given on the recommendation, across
// however many routes were added. They are carried over and shown locked,
// because a second place to type the same thing is a second place for it to
// be wrong — and the recommendation is the record the customer agreed to.
// Changing any of them means changing the recommendation, through the edit
// request that exists for exactly that.
const uniqueFromRoutes = (customer, field) => {
  const values = (customer.shippingDetails || [])
    .flatMap((s) => String(s[field] || '').split(','))
    .map((v) => v.trim())
    .filter(Boolean);
  return [...new Set(values)];
};

const carriersFromRecommendation = (customer) => uniqueFromRoutes(customer, 'provider');
const destinationsFromRecommendation = (customer) => uniqueFromRoutes(customer, 'country');

// A field whose answer lives on the recommendation. It is shown so the
// person can check it, not edit it.
const CarriedOverField = ({ label, value, source = 'the recommendation form' }) => (
  <div>
    <label className="block text-xs font-bold text-slate-700 mb-1.5">{label}</label>
    <div className="w-full border border-slate-200 bg-slate-50 p-2.5 rounded-lg text-sm text-slate-700 min-h-[42px] break-words">
      {value || <span className="text-slate-400">Not set on the recommendation</span>}
    </div>
    <p className="text-[10px] text-slate-400 mt-1">From {source}.</p>
  </div>
);

const REQUIRED_DOC_TYPES = ['TRADE_LICENSE'];

const REQUIRED_DOC_LABELS = {
  TRADE_LICENSE: 'Trade License',
};

const FieldInput = ({ label, keyName, form, isSavingField, onChange, onBlur, type = 'text' }) => (
  <div>
    <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
      {label} {isSavingField === keyName && <Loader2 size={11} className="animate-spin text-slate-400" />}
    </label>
    <input
      type={type}
      className="w-full border border-slate-300 p-2.5 rounded-lg text-sm outline-none focus:border-purple-500"
      value={form[keyName]}
      maxLength={500}
      onChange={(e) => onChange(keyName, e.target.value)}
      onBlur={() => onBlur(keyName)}
    />
  </div>
);

const FinalAccountProfilePanel = ({ customer, onSaved }) => {
  const { showToast } = useToast();
  const [mode, setMode] = useState(customer.accountConfigMode || 'PROVISIONAL');
  // Everything the recommendation already answered, gathered once. These are
  // what gets stored on submit as well as what is shown — so the profile can
  // never drift away from the recommendation behind it.
  const carriedOver = {
    destinations: destinationsFromRecommendation(customer).join(', '),
    preferredCarrier: carriersFromRecommendation(customer).join(', '),
    natureOfBusiness: customer.businessType || '',
    accountMode: customer.accountMode || '',
  };

  const [form, setForm] = useState({
    managingPartnerName: customer.managingPartnerName || '',
    managingPartnerDesignation: customer.managingPartnerDesignation || '',
    binNumber: customer.binNumber || '',
    tinNumber: customer.tinNumber || '',
    gainType: customer.gainType || '',
    // The printed Account Profile has always had an Ex / FR row, but nothing
    // ever sent a value for it, so it printed blank on every form.
    financeMode: customer.financeMode || '',
    area: customer.area || '',
    zone: customer.zone || '',
    specialInstructions: customer.specialInstructions || '',
  });
  const [isSavingField, setIsSavingField] = useState(null);
  const [isSubmittingFinal, setIsSubmittingFinal] = useState(false);
  const submitFinalLockRef = useRef(false);

  const handleModeChange = async (newMode) => {
    if (newMode === mode) return;
    setMode(newMode);
    try {
      await setAccountConfigMode(customer.id, newMode);
      onSaved?.();
    } catch (err) {
      showToast(err?.message || 'Failed to switch mode', 'error');
    }
  };

  const handleFieldBlur = useCallback(
    async (key) => {
      if (mode !== 'PROVISIONAL') return;
      setIsSavingField(key);
      try {
        await updateFinalProfile(customer.id, { [key]: form[key] });
      } catch (err) {
        showToast(err?.message || 'Autosave failed', 'error');
      } finally {
        setIsSavingField(null);
      }
    },
    [mode, form, customer.id, showToast]
  );

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const documents = customer.documents || [];
  const docsByType = documents.reduce((acc, d) => { acc[d.documentType] = d; return acc; }, {});
  const missingRequired = REQUIRED_DOC_TYPES.filter((k) => !docsByType[k]);

  const handleSubmitFinal = async () => {
    if (submitFinalLockRef.current) return;
    submitFinalLockRef.current = true;
    setIsSubmittingFinal(true);
    try {
      // The carried-over answers are written alongside the typed ones, so
      // the profile holds a complete record rather than pointing back at the
      // recommendation for half of it.
      // markComplete is what actually flips finalProfileCompleted. The
      // field-by-field autosave above deliberately omits it, so typing one
      // character no longer publishes a half-filled profile.
      const payload = { ...form, ...carriedOver, markComplete: true };
      if (mode === 'REGULAR') {
        await updateFinalProfile(customer.id, payload);
        await submitFinalOnboardingRegular(customer.id);
      } else {
        await updateFinalProfile(customer.id, payload);
        await submitFinalOnboarding(customer.id);
      }
      showToast('Submitted — awaiting Head of Department approval to activate the account', 'success');
      onSaved?.();
    } catch (err) {
      showToast(err?.message || 'Submission failed', 'error');
    } finally {
      submitFinalLockRef.current = false;
      setIsSubmittingFinal(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-purple-300 p-6 space-y-5">
      <div>
        <h3 className="font-bold text-slate-900 text-base flex items-center">
          <ClipboardEdit size={18} className="mr-2 text-purple-600" /> Final Account Profile Data
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          Agreement is signed. Complete the final tax and operational details to activate the account.
        </p>
      </div>

      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Account Configuration Mode</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => handleModeChange('REGULAR')}
            className={`py-2.5 rounded-lg text-xs font-bold transition ${mode === 'REGULAR' ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
          >
            Regular Account
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('PROVISIONAL')}
            className={`py-2.5 rounded-lg text-xs font-bold transition ${mode === 'PROVISIONAL' ? 'bg-purple-700 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
          >
            Provisional Account
          </button>
        </div>
        <p className="text-[10px] text-slate-400 mt-2">
          {mode === 'REGULAR'
            ? 'Fill everything, then submit once — the Head of Department approves it before the account goes live.'
            : 'Each field and document you provide saves automatically as a draft. Submit once ready — the Head of Department approves it before the account goes live.'}
        </p>
      </div>

      <div className="grid grid-cols-[1fr_140px] gap-3 items-end">
        <FieldInput label="Name of Managing Partner" keyName="managingPartnerName" form={form} isSavingField={isSavingField} onChange={setField} onBlur={handleFieldBlur} />
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">Designation</label>
          <select
            className="w-full border border-slate-300 p-2.5 rounded-lg text-sm bg-white outline-none focus:border-purple-500"
            value={form.managingPartnerDesignation}
            onChange={(e) => setField('managingPartnerDesignation', e.target.value)}
            onBlur={() => handleFieldBlur('managingPartnerDesignation')}
          >
            <option value="">Select...</option>
            {DESIGNATION_OPTIONS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <FieldInput label="BIN Number" keyName="binNumber" form={form} isSavingField={isSavingField} onChange={setField} onBlur={handleFieldBlur} />
        <FieldInput label="TIN Number" keyName="tinNumber" form={form} isSavingField={isSavingField} onChange={setField} onBlur={handleFieldBlur} />
      </div>
      <CarriedOverField
        label="Destinations"
        value={carriedOver.destinations}
        source="the destination countries on every route added to the recommendation"
      />

      <div className="grid grid-cols-2 gap-3">
        <CarriedOverField
          label="Preferred Carrier"
          value={carriedOver.preferredCarrier}
          source="the current service providers named on the recommendation"
        />
        <CarriedOverField
          label="Nature of Business"
          value={carriedOver.natureOfBusiness}
          source="the business type on the recommendation"
        />
      </div>

      <CarriedOverField label="Account Mode" value={carriedOver.accountMode} />

      <div className="grid grid-cols-2 gap-3">
        <FieldInput label="Area" keyName="area" form={form} isSavingField={isSavingField} onChange={setField} onBlur={handleFieldBlur} />
        <FieldInput label="Zone" keyName="zone" form={form} isSavingField={isSavingField} onChange={setField} onBlur={handleFieldBlur} />
      </div>
      {/* "Mode" used to sit here as a second, separate answer, which only
          invited the question of how it related to Account Mode above. There
          is one mode on an account, and it comes from the recommendation. */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">Type</label>
          <select className="w-full border border-slate-300 p-2.5 rounded-lg text-sm bg-white outline-none focus:border-purple-500" value={form.gainType} onChange={(e) => setField('gainType', e.target.value)} onBlur={() => handleFieldBlur('gainType')}>
            <option value="">Select...</option>
            {GAIN_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">Mode (Ex / FR)</label>
          <select className="w-full border border-slate-300 p-2.5 rounded-lg text-sm bg-white outline-none focus:border-purple-500" value={form.financeMode} onChange={(e) => setField('financeMode', e.target.value)} onBlur={() => handleFieldBlur('financeMode')}>
            <option value="">Select...</option>
            {FINANCE_MODE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1.5">Special Instructions (if any)</label>
        <textarea className="w-full border border-slate-300 p-2.5 rounded-lg text-sm outline-none focus:border-purple-500 min-h-[60px]" value={form.specialInstructions} maxLength={500} onChange={(e) => setField('specialInstructions', e.target.value)} onBlur={() => handleFieldBlur('specialInstructions')} />
      </div>

      <div className="pt-4 border-t border-slate-100">
        <DocumentUploadPanel customer={customer} onUploaded={onSaved} embedded />
      </div>

      <div className="pt-4 border-t border-slate-100 space-y-2">
        {missingRequired.length > 0 && (
          <p className="text-[11px] text-amber-600 font-semibold">
            Still needed: {missingRequired.map((k) => REQUIRED_DOC_LABELS[k] || k.replace(/_/g, ' ')).join(', ')}
          </p>
        )}
        <button
          type="button"
          disabled={missingRequired.length > 0 || isSubmittingFinal}
          onClick={handleSubmitFinal}
          className="w-full bg-emerald-700 text-white font-bold py-3 rounded-lg text-sm shadow-md hover:bg-emerald-800 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {isSubmittingFinal ? <Loader2 size={16} className="mr-2 animate-spin" /> : <FileCheck size={16} className="mr-2" />}
          Submit for Final Onboarding
        </button>
      </div>
    </div>
  );
};

export default FinalAccountProfilePanel;