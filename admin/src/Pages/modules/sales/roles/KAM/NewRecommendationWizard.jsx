// src/Pages/modules/sales/roles/KAM/NewRecommendationWizard.jsx — REPLACE ENTIRE FILE
import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ArrowLeft, ArrowRight, Plus, Trash2, Save } from 'lucide-react';
import { useSales } from '../../hooks/useSales';
import { useAuth } from '../../../../../Components/hooks/useAuth';
import { useToast } from '../../../../../Components/hooks/useToast';
import FormField from '../../../../../Components/Shared/FormField';
import SelectWithOther from '../../../../../Components/Shared/SelectWithOther';
import {
  BUSINESS_TYPE_OPTIONS,
  ACCOUNT_MODE_OPTIONS,
  ACCOUNT_TYPE_OPTIONS,
  SERVICE_REQUIRED_OPTIONS,
  SHIPMENT_TYPE_OPTIONS,
  RATE_FOR_OPTIONS,
  buildEmptyShippingRow,
} from '../../constants/formOptions';
import { CREDIT_RULES } from '../../constants/salesStatus';
import { sanitizeText } from '../../../../../Components/utils/sanitize';
import {
  isValidEmail,
  isValidMobile,
  isRequired,
  validateShippingRow,
} from '../../../../../Components/utils/validators';

const STEPS = [
  { num: 1, title: 'Basic Information' },
  { num: 2, title: 'Financial Terms' },
  { num: 3, title: 'Shipping Details' },
  { num: 4, title: 'Visit Outcome & Recommendation' },
];

const DRAFT_KEY_PREFIX = 'milex_recommendation_draft_';
const MAX_NOTE_LENGTH = 2000;

const buildInitialState = (currentUser) => ({
  form: {
    accountName: '',
    address: '',
    phone: '',
    email: '',
    businessType: '',
    serviceRequired: '',
    accountMode: '',
    accountType: '',
    creditLimitTk: '',
    creditPeriodDays: String(CREDIT_RULES.DEFAULT_PERIOD_DAYS),
    creditPeriodExtended: false,
    proposedRate: '',
    recNote: '',
  },
  contacts: {
    senior: { name: '', designation: '', mobile: '', email: '' }, // mobile optional, designation required
    key: { name: '', designation: '', mobile: '', email: '' }, // mandatory
    financial: { name: '', designation: '', mobile: '', email: '' },
  },
  sameAsKey: false,
  shipping: [buildEmptyShippingRow()],
});

const NewRecommendationWizard = () => {
  const { addCustomer } = useSales();
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const draftKey = `${DRAFT_KEY_PREFIX}${currentUser?.id || 'anon'}`;

  const [step, setStep] = useState(1);
  const [state, setState] = useState(() => buildInitialState(currentUser));

  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && parsed.form) {
          setState(parsed);
          showToast('Draft restored', 'info');
        }
      }
    } catch {
      /* corrupted draft — ignore silently */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { form, contacts, sameAsKey, shipping } = state;

  const setField = useCallback((key, value) => {
    setState((prev) => ({
      ...prev,
      form: { ...prev.form, [key]: typeof value === 'string' ? sanitizeText(value, { maxLength: 500 }) : value },
    }));
  }, []);

  const setContactField = useCallback((group, key, value) => {
    setState((prev) => ({
      ...prev,
      contacts: { ...prev.contacts, [group]: { ...prev.contacts[group], [key]: value } },
    }));
  }, []);

  const setSameAsKey = useCallback((val) => {
    setState((prev) => ({ ...prev, sameAsKey: val }));
  }, []);

  const setShipping = useCallback((updater) => {
    setState((prev) => ({ ...prev, shipping: typeof updater === 'function' ? updater(prev.shipping) : updater }));
  }, []);

  const handleCheckbox = (index, type) => {
    setShipping((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row;
        const current = row.shipmentType || [];
        const nextTypes = current.includes(type) ? current.filter((t) => t !== type) : [...current, type];
        return { ...row, shipmentType: nextTypes };
      })
    );
  };

  const handleSaveDraft = () => {
    try {
      localStorage.setItem(draftKey, JSON.stringify(state));
      showToast('Draft saved locally', 'success');
    } catch {
      showToast('Could not save draft (storage unavailable)', 'error');
    }
  };

  const clearDraft = () => {
    try {
      localStorage.removeItem(draftKey);
    } catch {
      /* noop */
    }
  };

  const validateStep1 = () => {
    if (!isRequired(form.accountName) || !isRequired(form.address)) {
      showToast('Account name and address are required', 'warning');
      return false;
    }
    if (!isValidMobile(form.phone)) {
      showToast('Valid phone number is required', 'warning');
      return false;
    }
    if (!isValidEmail(form.email)) {
      showToast('Valid email is required', 'warning');
      return false;
    }
    if (!isRequired(form.businessType)) return showToast('Business type is required', 'warning'), false;
    if (!isRequired(form.serviceRequired)) return showToast('Service required is mandatory', 'warning'), false;
    if (!isRequired(form.accountMode)) return showToast('Account mode is mandatory', 'warning'), false;

    if (!isRequired(contacts.senior.name)) return showToast('Senior Management name is required', 'warning'), false;
    if (!isRequired(contacts.senior.designation)) return showToast('Senior Management designation is required', 'warning'), false;
    // Senior Management mobile is intentionally OPTIONAL per spec

    if (!isRequired(contacts.key.name) || !isValidMobile(contacts.key.mobile)) {
      showToast('Key Contact name and mobile are mandatory', 'warning');
      return false;
    }
    if (!sameAsKey && (!isRequired(contacts.financial.name) || !isValidMobile(contacts.financial.mobile))) {
      showToast('Financial contact is mandatory (or check "Same as Key Contact")', 'warning');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!isRequired(form.accountType)) return showToast('Select account type', 'warning'), false;
    if (form.accountType === 'CREDIT CUSTOMER') {
      if (!isRequired(form.creditLimitTk)) return showToast('Credit limit is required', 'warning'), false;
      const period = Number(form.creditPeriodDays);
      const maxAllowed = form.creditPeriodExtended
        ? CREDIT_RULES.MAX_EXTENDED_PERIOD_DAYS
        : CREDIT_RULES.DEFAULT_PERIOD_DAYS;
      if (!Number.isFinite(period) || period < 1 || period > maxAllowed) {
        showToast(`Credit period must be between 1 and ${maxAllowed} days`, 'warning');
        return false;
      }
    }
    return true;
  };

  const validateStep3 = () => {
    const invalidRow = shipping.find((row) => !validateShippingRow(row).valid);
    if (invalidRow) {
      showToast('Complete every mandatory field in each shipping row, including Current Service Provider', 'warning');
      return false;
    }
    return true;
  };

  const validateStep4 = () => {
    if (!isRequired(form.proposedRate)) return showToast('Proposed rate is required', 'warning'), false;
    if (!isRequired(form.recNote)) return showToast('Recommendation note is required', 'warning'), false;
    // NOTE: minimum-word-count requirement intentionally removed per updated spec
    return true;
  };

  const handleNext = () => {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    if (step === 3 && !validateStep3()) return;
    if (step === 4) {
      if (!validateStep4()) return;
      handleSubmit();
      return;
    }
    setStep((s) => Math.min(s + 1, 4));
  };

  const handleSubmit = () => {
    const flatContacts = [
      { type: 'SENIOR MANAGEMENT', ...contacts.senior },
      { type: 'KEY CONTACT PERSON', ...contacts.key },
      { type: 'FINANCIAL CONTACT', ...(sameAsKey ? contacts.key : contacts.financial) },
    ];

    const created = addCustomer({
      ...form,
      recommendedBy: currentUser?.name,
      handledBy: currentUser?.name,
      contacts: flatContacts,
      shippingDetails: shipping,
      // New KAM-first flow: proposed rate is entered here and goes straight
      // to Line Manager for approval (no separate SC rate-prep step).
      status: 'PENDING RATE APPROVAL',
    });

    clearDraft();
    navigate(`/app/customers/${encodeURIComponent(created.barcode)}`);
  };

  return (
    <div className="max-w-4xl mx-auto animate-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        <h2 className="text-2xl font-bold text-slate-800 mb-8">New Recommendation Form</h2>

        <div className="flex justify-between items-center mb-10 px-2 relative overflow-x-auto">
          <div className="absolute top-1/2 left-0 w-full h-[2px] bg-slate-200 -z-10 -translate-y-1/2" />
          {STEPS.map((s) => (
            <div key={s.num} className="flex flex-col items-center bg-white px-2 shrink-0">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm mb-2 border-2 ${
                  step === s.num
                    ? 'border-emerald-600 text-emerald-600'
                    : step > s.num
                    ? 'bg-emerald-600 border-emerald-600 text-white'
                    : 'border-slate-300 text-slate-400 bg-white'
                }`}
              >
                {step > s.num ? <Check size={16} /> : s.num}
              </div>
              <span className={`text-[10px] font-bold text-center max-w-[90px] ${step === s.num ? 'text-slate-800' : 'text-slate-400'}`}>
                Step-{String(s.num).padStart(2, '0')}: {s.title}
              </span>
            </div>
          ))}
        </div>

        <div className="min-h-[420px] space-y-8">
          {step === 1 && (
            <>
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Basic Information</h3>
                <FormField label="Account Name" required>
                  <input
                    className="w-full border border-slate-200 p-2.5 rounded text-sm focus:border-emerald-500 outline-none"
                    value={form.accountName}
                    maxLength={200}
                    onChange={(e) => setField('accountName', e.target.value)}
                  />
                </FormField>
                <FormField label="Primary Address" required>
                  <textarea
                    className="w-full border border-slate-200 p-2.5 rounded text-sm h-20 focus:border-emerald-500 outline-none"
                    value={form.address}
                    maxLength={500}
                    onChange={(e) => setField('address', e.target.value)}
                  />
                </FormField>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField label="Phone" required>
                    <input
                      className="w-full border border-slate-200 p-2.5 rounded text-sm focus:border-emerald-500 outline-none"
                      value={form.phone}
                      maxLength={16}
                      onChange={(e) => setField('phone', e.target.value)}
                    />
                  </FormField>
                  <FormField label="Email" required>
                    <input
                      type="email"
                      className="w-full border border-slate-200 p-2.5 rounded text-sm focus:border-emerald-500 outline-none"
                      value={form.email}
                      maxLength={254}
                      onChange={(e) => setField('email', e.target.value)}
                    />
                  </FormField>
                  <FormField label="Business Type" required>
                    <SelectWithOther
                      options={BUSINESS_TYPE_OPTIONS}
                      value={form.businessType}
                      onChange={(v) => setField('businessType', v)}
                    />
                  </FormField>
                  <FormField label="Service Required" required>
                    <select
                      className="w-full border border-slate-200 p-2.5 rounded text-sm bg-white focus:border-emerald-500 outline-none"
                      value={form.serviceRequired}
                      onChange={(e) => setField('serviceRequired', e.target.value)}
                    >
                      <option value="">Select...</option>
                      {SERVICE_REQUIRED_OPTIONS.map((o) => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                  </FormField>
                  <FormField label="Account Mode" required>
                    <select
                      className="w-full border border-slate-200 p-2.5 rounded text-sm bg-white focus:border-emerald-500 outline-none"
                      value={form.accountMode}
                      onChange={(e) => setField('accountMode', e.target.value)}
                    >
                      <option value="">Select...</option>
                      {ACCOUNT_MODE_OPTIONS.map((o) => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                  </FormField>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 space-y-8">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Customer Contact Information</h3>

                <div>
                  <h4 className="font-bold text-slate-800 mb-3">Senior Management</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField label="Name" required>
                      <input
                        className="w-full border border-slate-200 p-2.5 rounded text-sm focus:border-emerald-500 outline-none"
                        value={contacts.senior.name}
                        maxLength={150}
                        onChange={(e) => setContactField('senior', 'name', e.target.value)}
                      />
                    </FormField>
                    <FormField label="Designation" required>
                      <input
                        className="w-full border border-slate-200 p-2.5 rounded text-sm focus:border-emerald-500 outline-none"
                        value={contacts.senior.designation}
                        maxLength={100}
                        onChange={(e) => setContactField('senior', 'designation', e.target.value)}
                      />
                    </FormField>
                    <FormField label="Phone" optional>
                      <input
                        className="w-full border border-slate-200 p-2.5 rounded text-sm focus:border-emerald-500 outline-none"
                        value={contacts.senior.mobile}
                        maxLength={16}
                        onChange={(e) => setContactField('senior', 'mobile', e.target.value)}
                      />
                    </FormField>
                    <FormField label="Email" optional>
                      <input
                        type="email"
                        className="w-full border border-slate-200 p-2.5 rounded text-sm focus:border-emerald-500 outline-none"
                        value={contacts.senior.email}
                        maxLength={254}
                        onChange={(e) => setContactField('senior', 'email', e.target.value)}
                      />
                    </FormField>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-slate-800 mb-3">Key Contact Person</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField label="Name" required>
                      <input
                        className="w-full border border-slate-200 p-2.5 rounded text-sm focus:border-emerald-500 outline-none"
                        value={contacts.key.name}
                        maxLength={150}
                        onChange={(e) => setContactField('key', 'name', e.target.value)}
                      />
                    </FormField>
                    <FormField label="Designation" optional>
                      <input
                        className="w-full border border-slate-200 p-2.5 rounded text-sm focus:border-emerald-500 outline-none"
                        value={contacts.key.designation}
                        maxLength={100}
                        onChange={(e) => setContactField('key', 'designation', e.target.value)}
                      />
                    </FormField>
                    <FormField label="Phone" required>
                      <input
                        className="w-full border border-slate-200 p-2.5 rounded text-sm focus:border-emerald-500 outline-none"
                        value={contacts.key.mobile}
                        maxLength={16}
                        onChange={(e) => setContactField('key', 'mobile', e.target.value)}
                      />
                    </FormField>
                    <FormField label="Email" optional>
                      <input
                        type="email"
                        className="w-full border border-slate-200 p-2.5 rounded text-sm focus:border-emerald-500 outline-none"
                        value={contacts.key.email}
                        maxLength={254}
                        onChange={(e) => setContactField('key', 'email', e.target.value)}
                      />
                    </FormField>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-slate-800 mb-3">Financial Contact</h4>
                  <label className="flex items-center gap-2 text-sm text-slate-700 mb-4 cursor-pointer font-bold">
                    <input
                      type="checkbox"
                      checked={sameAsKey}
                      onChange={(e) => setSameAsKey(e.target.checked)}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    Same as Key Contact Person
                  </label>
                  {!sameAsKey && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField label="Name" required>
                        <input
                          className="w-full border border-slate-200 p-2.5 rounded text-sm focus:border-emerald-500 outline-none"
                          value={contacts.financial.name}
                          maxLength={150}
                          onChange={(e) => setContactField('financial', 'name', e.target.value)}
                        />
                      </FormField>
                      <FormField label="Phone" required>
                        <input
                          className="w-full border border-slate-200 p-2.5 rounded text-sm focus:border-emerald-500 outline-none"
                          value={contacts.financial.mobile}
                          maxLength={16}
                          onChange={(e) => setContactField('financial', 'mobile', e.target.value)}
                        />
                      </FormField>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <FormField label="Account Type" required>
                <select
                  className="w-full border border-slate-200 p-3 rounded text-sm bg-white focus:border-emerald-500 outline-none"
                  value={form.accountType}
                  onChange={(e) => setField('accountType', e.target.value)}
                >
                  <option value="">Select...</option>
                  {ACCOUNT_TYPE_OPTIONS.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </FormField>
              {form.accountType === 'CREDIT CUSTOMER' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <FormField label="Credit Limit (TK)" required>
                    <input
                      type="number"
                      min="0"
                      className="w-full border border-slate-200 p-3 rounded text-sm focus:border-emerald-500 outline-none"
                      value={form.creditLimitTk}
                      onChange={(e) => setField('creditLimitTk', e.target.value)}
                    />
                  </FormField>
                  <FormField
                    label="Credit Period (Days)"
                    required
                    hint={
                      form.creditPeriodExtended
                        ? `LM-authorized extension: up to ${CREDIT_RULES.MAX_EXTENDED_PERIOD_DAYS} days`
                        : `Default: ${CREDIT_RULES.DEFAULT_PERIOD_DAYS} days`
                    }
                  >
                    <input
                      type="number"
                      min="1"
                      max={form.creditPeriodExtended ? CREDIT_RULES.MAX_EXTENDED_PERIOD_DAYS : CREDIT_RULES.DEFAULT_PERIOD_DAYS}
                      className="w-full border border-slate-200 p-3 rounded text-sm focus:border-emerald-500 outline-none"
                      value={form.creditPeriodDays}
                      onChange={(e) => setField('creditPeriodDays', e.target.value)}
                    />
                  </FormField>
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 sm:col-span-2">
                    <input
                      type="checkbox"
                      checked={form.creditPeriodExtended}
                      onChange={(e) => setField('creditPeriodExtended', e.target.checked)}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    Request LM-authorized extended credit period (up to {CREDIT_RULES.MAX_EXTENDED_PERIOD_DAYS} days)
                  </label>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              {shipping.map((row, i) => (
                <div key={i} className="bg-white border border-slate-100 shadow-sm p-6 rounded-xl relative">
                  {shipping.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setShipping((prev) => prev.filter((_, idx) => idx !== i))}
                      className="absolute top-4 right-4 text-slate-300 hover:text-red-500 transition"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <FormField label="Shipment Type" required>
                      <div className="flex gap-6 flex-wrap">
                        {SHIPMENT_TYPE_OPTIONS.map((type) => (
                          <label key={type} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={(row.shipmentType || []).includes(type)}
                              onChange={() => handleCheckbox(i, type)}
                              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                            />
                            {type}
                          </label>
                        ))}
                      </div>
                    </FormField>
                    <FormField label="Rate For" required>
                      <select
                        className="w-full border border-slate-200 p-2.5 rounded text-sm bg-white outline-none focus:border-emerald-500"
                        value={row.rateFor}
                        onChange={(e) => setShipping((prev) => prev.map((r, idx) => (idx === i ? { ...r, rateFor: e.target.value } : r)))}
                      >
                        <option value="">Select...</option>
                        {RATE_FOR_OPTIONS.map((o) => (
                          <option key={o} value={o}>{o}</option>
                        ))}
                      </select>
                    </FormField>
                    <FormField label="Destination Country" required>
                      <input
                        className="w-full border border-slate-200 p-2.5 rounded text-sm focus:border-emerald-500 outline-none"
                        value={row.country}
                        maxLength={80}
                        onChange={(e) => setShipping((prev) => prev.map((r, idx) => (idx === i ? { ...r, country: e.target.value } : r)))}
                      />
                    </FormField>
                    <FormField label="Avg Monthly Volume" required>
                      <input
                        type="number"
                        min="0"
                        className="w-full border border-slate-200 p-2.5 rounded text-sm focus:border-emerald-500 outline-none"
                        value={row.volume}
                        onChange={(e) => setShipping((prev) => prev.map((r, idx) => (idx === i ? { ...r, volume: e.target.value } : r)))}
                      />
                    </FormField>
                    <FormField label="Avg Monthly Weight (KG)" required>
                      <input
                        type="number"
                        min="0"
                        className="w-full border border-slate-200 p-2.5 rounded text-sm focus:border-emerald-500 outline-none"
                        value={row.weight}
                        onChange={(e) => setShipping((prev) => prev.map((r, idx) => (idx === i ? { ...r, weight: e.target.value } : r)))}
                      />
                    </FormField>
                    <FormField label="Expected Monthly Revenue (USD)" required>
                      <input
                        type="number"
                        min="0"
                        className="w-full border border-slate-200 p-2.5 rounded text-sm focus:border-emerald-500 outline-none"
                        value={row.revenue}
                        onChange={(e) => setShipping((prev) => prev.map((r, idx) => (idx === i ? { ...r, revenue: e.target.value } : r)))}
                      />
                    </FormField>
                    <FormField label="Current Service Provider" required>
                      <input
                        className="w-full border border-slate-200 p-2.5 rounded text-sm focus:border-emerald-500 outline-none"
                        value={row.provider}
                        maxLength={150}
                        onChange={(e) => setShipping((prev) => prev.map((r, idx) => (idx === i ? { ...r, provider: e.target.value } : r)))}
                      />
                    </FormField>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setShipping((prev) => [...prev, buildEmptyShippingRow()])}
                className="text-sm font-bold text-emerald-700 flex items-center hover:text-emerald-800 transition"
              >
                <Plus size={16} className="mr-1" /> Add Route
              </button>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <FormField label="Recommended By">
                <div className="w-full border border-blue-200 p-2.5 rounded text-sm bg-blue-50 text-slate-700 font-medium">
                  {currentUser?.name}
                </div>
              </FormField>
              <FormField label="Proposed Rate" required>
                <input
                  className="w-full border border-slate-200 p-2.5 rounded text-sm focus:border-emerald-500 outline-none"
                  placeholder="e.g. 32 USD/Kg + 10 USD Custom"
                  value={form.proposedRate}
                  maxLength={300}
                  onChange={(e) => setField('proposedRate', e.target.value)}
                />
              </FormField>
              <FormField label="Visit Outcome / Recommendation Note" required>
                <textarea
                  className="w-full border border-slate-200 p-4 rounded text-sm min-h-[150px] focus:border-emerald-500 outline-none"
                  value={form.recNote}
                  maxLength={MAX_NOTE_LENGTH}
                  onChange={(e) => setField('recNote', e.target.value)}
                />
              </FormField>
            </div>
          )}
        </div>

        <div className="flex flex-wrap justify-between gap-3 pt-6 border-t border-slate-100 mt-8">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="px-5 py-2.5 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50 transition flex items-center"
            >
              <ArrowLeft size={16} className="mr-2" /> Previous
            </button>
          ) : (
            <div />
          )}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleSaveDraft}
              className="px-5 py-2.5 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50 transition flex items-center"
            >
              <Save size={16} className="mr-2" /> Save as Draft
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="px-6 py-2.5 bg-emerald-700 text-white rounded-lg text-sm font-bold flex items-center shadow-md hover:bg-emerald-800 transition"
            >
              {step < 4 ? 'Next Step' : 'Submit'} <ArrowRight size={16} className="ml-2" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewRecommendationWizard;