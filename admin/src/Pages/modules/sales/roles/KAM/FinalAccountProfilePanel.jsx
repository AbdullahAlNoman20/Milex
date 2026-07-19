// admin/src/Pages/modules/sales/roles/KAM/FinalAccountProfilePanel.jsx 
import { useState, useCallback } from 'react';
import { ClipboardEdit, FileCheck, Loader2 } from 'lucide-react';
import { updateFinalProfile, setAccountConfigMode, submitFinalOnboardingRegular, submitFinalOnboarding } from '../../services/customerService';
import { useToast } from '../../../../../Components/hooks/useToast';
import { GAIN_TYPE_OPTIONS, FINANCE_MODE_OPTIONS } from '../../constants/formOptions';
import DocumentUploadPanel from './DocumentUploadPanel';

const REQUIRED_DOC_TYPES = ['SIGNED_OFFER_LETTER', 'SIGNED_AGREEMENT', 'CUSTOMER_TIN', 'CUSTOMER_BIN', 'TRADE_LICENSE'];

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
  const [form, setForm] = useState({
    managingPartnerName: customer.managingPartnerName || '',
    binNumber: customer.binNumber || '',
    tinNumber: customer.tinNumber || '',
    destinations: customer.destinations || '',
    preferredCarrier: customer.preferredCarrier || '',
    natureOfBusiness: customer.natureOfBusiness || '',
    gainType: customer.gainType || '',
    financeMode: customer.financeMode || '',
    area: customer.area || '',
    zone: customer.zone || '',
    specialInstructions: customer.specialInstructions || '',
  });
  const [isSavingField, setIsSavingField] = useState(null);
  const [isSubmittingFinal, setIsSubmittingFinal] = useState(false);

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
  const hasAnyDocs = documents.length > 0;

  const handleSubmitFinal = async () => {
    if (isSubmittingFinal) return;
    setIsSubmittingFinal(true);
    try {
      if (mode === 'REGULAR') {
        await updateFinalProfile(customer.id, form);
        await submitFinalOnboardingRegular(customer.id);
        showToast('Account activated', 'success');
      } else {
        await updateFinalProfile(customer.id, form);
        await submitFinalOnboarding(customer.id);
        showToast('Submitted for Final Onboarding — awaiting Line Manager verification', 'success');
      }
      onSaved?.();
    } catch (err) {
      showToast(err?.message || 'Submission failed', 'error');
    } finally {
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
            ? 'Fill everything, then submit once — the account activates immediately.'
            : 'Each field and document you provide saves automatically as a draft. Submit for Final Onboarding once ready.'}
        </p>
      </div>

      <FieldInput label="Name of Managing Partner" keyName="managingPartnerName" form={form} isSavingField={isSavingField} onChange={setField} onBlur={handleFieldBlur} />
      <div className="grid grid-cols-2 gap-3">
        <FieldInput label="BIN Number" keyName="binNumber" form={form} isSavingField={isSavingField} onChange={setField} onBlur={handleFieldBlur} />
        <FieldInput label="TIN Number" keyName="tinNumber" form={form} isSavingField={isSavingField} onChange={setField} onBlur={handleFieldBlur} />
      </div>
      <FieldInput label="Destinations (comma separated)" keyName="destinations" form={form} isSavingField={isSavingField} onChange={setField} onBlur={handleFieldBlur} />
      <div className="grid grid-cols-2 gap-3">
        <FieldInput label="Preferred Carrier" keyName="preferredCarrier" form={form} isSavingField={isSavingField} onChange={setField} onBlur={handleFieldBlur} />
        <FieldInput label="Nature of Business" keyName="natureOfBusiness" form={form} isSavingField={isSavingField} onChange={setField} onBlur={handleFieldBlur} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <FieldInput label="Area" keyName="area" form={form} isSavingField={isSavingField} onChange={setField} onBlur={handleFieldBlur} />
        <FieldInput label="Zone" keyName="zone" form={form} isSavingField={isSavingField} onChange={setField} onBlur={handleFieldBlur} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">Type</label>
          <select className="w-full border border-slate-300 p-2.5 rounded-lg text-sm bg-white outline-none focus:border-purple-500" value={form.gainType} onChange={(e) => setField('gainType', e.target.value)} onBlur={() => handleFieldBlur('gainType')}>
            <option value="">Select...</option>
            {GAIN_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">Mode</label>
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
        {mode === 'PROVISIONAL' && missingRequired.length > 0 && (
          <p className="text-[11px] text-amber-600 font-semibold">Still needed: {missingRequired.map((k) => k.replace(/_/g, ' ')).join(', ')}</p>
        )}
        <button
          type="button"
          disabled={(mode === 'PROVISIONAL' && !hasAnyDocs) || isSubmittingFinal}
          onClick={handleSubmitFinal}
          className="w-full bg-emerald-700 text-white font-bold py-3 rounded-lg text-sm shadow-md hover:bg-emerald-800 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {isSubmittingFinal ? <Loader2 size={16} className="mr-2 animate-spin" /> : <FileCheck size={16} className="mr-2" />}
          {mode === 'REGULAR' ? 'Activate Account' : 'Submit for Final Onboarding'}
        </button>
      </div>
    </div>
  );
};

export default FinalAccountProfilePanel;