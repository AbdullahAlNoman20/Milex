// src/Pages/modules/sales/roles/KAM/NewRecommendationWizard.jsx
import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ArrowLeft, ArrowRight, Plus, Trash2 } from 'lucide-react';
import { useSales } from '../../hooks/useSales';
import { useAuth } from '../../../../../Components/hooks/useAuth';
import { useToast } from '../../../../../Components/hooks/useToast';
import FormField from '../../../../../Components/Shared/FormField';
import SelectWithOther from '../../../../../Components/Shared/SelectWithOther';
import {
  AREA_OPTIONS,
  ZONE_OPTIONS,
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
  { num: 1, title: 'Basic Info' },
  { num: 2, title: 'Financial' },
  { num: 3, title: 'Contacts' },
  { num: 4, title: 'Shipping' },
  { num: 5, title: 'Notes' },
];

const NewRecommendationWizard = () => {
  const { addCustomer } = useSales();
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    accountName: '',
    address: '',
    areaName: '',
    zoneName: '',
    mobile: '',
    email: '',
    businessType: '',
    serviceRequired: '',
    accountMode: '',
    accountType: '',
    creditLimitTk: '',
    creditPeriodDays: String(CREDIT_RULES.DEFAULT_PERIOD_DAYS),
    creditPeriodExtended: false,
    recNote: '',
  });
  const [contacts, setContacts] = useState({
    senior: { name: '', designation: '', mobile: '', email: '' },
    key: { name: '', designation: '', mobile: '', email: '' },
    financial: { name: '', designation: '', mobile: '', email: '' },
  });
  const [sameAsKey, setSameAsKey] = useState(false);
  const [shipping, setShipping] = useState([buildEmptyShippingRow()]);

  const setField = useCallback((key, value) => {
    setForm((prev) => ({ ...prev, [key]: sanitizeText(String(value), { maxLength: 500 }) }));
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

  const handleNext = () => {
    if (step === 1) {
      if (!isRequired(form.accountName) || !isRequired(form.address)) {
        return showToast('Account name and address are required', 'warning');
      }
      if (!isValidMobile(form.mobile)) return showToast('Valid mobile number required', 'warning');
      if (!isValidEmail(form.email)) return showToast('Valid email required', 'warning');
      if (!isRequired(form.businessType)) return showToast('Business type is required', 'warning');
      if (!isRequired(form.serviceRequired)) return showToast('Service required is mandatory', 'warning');
      if (!isRequired(form.accountMode)) return showToast('Account mode is mandatory', 'warning');
    }
    if (step === 2) {
      if (!isRequired(form.accountType)) return showToast('Select account type', 'warning');
      if (form.accountType === 'CREDIT CUSTOMER') {
        if (!isRequired(form.creditLimitTk)) return showToast('Credit limit is required', 'warning');
        const period = Number(form.creditPeriodDays);
        const maxAllowed = form.creditPeriodExtended
          ? CREDIT_RULES.MAX_EXTENDED_PERIOD_DAYS
          : CREDIT_RULES.DEFAULT_PERIOD_DAYS;
        if (!Number.isFinite(period) || period < 1 || period > maxAllowed) {
          return showToast(`Credit period must be between 1 and ${maxAllowed} days`, 'warning');
        }
      }
    }
    if (step === 3) {
      if (!isRequired(contacts.senior.name) || !isValidMobile(contacts.senior.mobile)) {
        return showToast('Senior manager name and mobile are mandatory', 'warning');
      }
      if (!isRequired(contacts.key.name) || !isValidMobile(contacts.key.mobile)) {
        return showToast('Key contact name and mobile are mandatory', 'warning');
      }
      if (!sameAsKey && (!isRequired(contacts.financial.name) || !isValidMobile(contacts.financial.mobile))) {
        return showToast('Financial contact is mandatory (or check "Same as Key Contact")', 'warning');
      }
    }
    if (step === 4) {
      const invalidRow = shipping.find((row) => !validateShippingRow(row).valid);
      if (invalidRow) return showToast('Complete all mandatory fields in every shipping row', 'warning');
    }
    if (step === 5) {
      if (!isRequired(form.recNote) || form.recNote.trim().split(/\s+/).length < 10) {
        return showToast('Recommendation note is mandatory (min 10 words)', 'warning');
      }
      return handleSubmit();
    }
    setStep((s) => Math.min(s + 1, 5));
  };

  const handleSubmit = () => {
    const flatContacts = [
      { type: 'SENIOR MANAGEMENT', ...contacts.senior },
      { type: 'KEY CONTACT PERSON', ...contacts.key },
      { type: 'FINANCIAL CONTACT', ...(sameAsKey ? contacts.key : contacts.financial) },
    ];
    const created = addCustomer({
      ...form,
      handledBy: currentUser?.name,
      contacts: flatContacts,
      shippingDetails: shipping,
    });
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
              <span className={`text-[10px] font-bold ${step === s.num ? 'text-slate-800' : 'text-slate-400'}`}>
                {s.title}
              </span>
            </div>
          ))}
        </div>

        <div className="min-h-[400px] space-y-6">
          {step === 1 && (
            <div className="space-y-4">
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
                <FormField label="Area">
                  <SelectWithOther
                    options={AREA_OPTIONS}
                    value={form.areaName}
                    onChange={(v) => setField('areaName', v)}
                  />
                </FormField>
                <FormField label="Zone">
                  <SelectWithOther
                    options={ZONE_OPTIONS}
                    value={form.zoneName}
                    onChange={(v) => setField('zoneName', v)}
                  />
                </FormField>
                <FormField label="Mobile" required>
                  <input
                    className="w-full border border-slate-200 p-2.5 rounded text-sm focus:border-emerald-500 outline-none"
                    value={form.mobile}
                    maxLength={16}
                    onChange={(e) => setField('mobile', e.target.value)}
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
                      <option key={o} value={o}>
                        {o}
                      </option>
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
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </FormField>
              </div>
            </div>
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
                    <option key={o} value={o}>
                      {o}
                    </option>
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
                      max={
                        form.creditPeriodExtended
                          ? CREDIT_RULES.MAX_EXTENDED_PERIOD_DAYS
                          : CREDIT_RULES.DEFAULT_PERIOD_DAYS
                      }
                      className="w-full border border-slate-200 p-3 rounded text-sm focus:border-emerald-500 outline-none"
                      value={form.creditPeriodDays}
                      onChange={(e) => setField('creditPeriodDays', e.target.value)}
                    />
                  </FormField>
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 sm:col-span-2">
                    <input
                      type="checkbox"
                      checked={form.creditPeriodExtended}
                      onChange={(e) => setForm((prev) => ({ ...prev, creditPeriodExtended: e.target.checked }))}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    Request LM-authorized extended credit period (up to 19 days)
                  </label>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-8">
              {[
                { key: 'senior', title: '1. Senior Management', required: true },
                { key: 'key', title: '2. Key Contact Person', required: true },
              ].map(({ key, title, required }) => (
                <div key={key}>
                  <h4 className="font-bold text-slate-800 mb-3">{title}</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField label="Name" required={required}>
                      <input
                        className="w-full border border-slate-200 p-2.5 rounded text-sm focus:border-emerald-500 outline-none"
                        value={contacts[key].name}
                        maxLength={150}
                        onChange={(e) =>
                          setContacts((prev) => ({ ...prev, [key]: { ...prev[key], name: e.target.value } }))
                        }
                      />
                    </FormField>
                    <FormField label="Designation" optional>
                      <input
                        className="w-full border border-slate-200 p-2.5 rounded text-sm focus:border-emerald-500 outline-none"
                        value={contacts[key].designation}
                        maxLength={100}
                        onChange={(e) =>
                          setContacts((prev) => ({ ...prev, [key]: { ...prev[key], designation: e.target.value } }))
                        }
                      />
                    </FormField>
                    <FormField label="Mobile" required={required}>
                      <input
                        className="w-full border border-slate-200 p-2.5 rounded text-sm focus:border-emerald-500 outline-none"
                        value={contacts[key].mobile}
                        maxLength={16}
                        onChange={(e) =>
                          setContacts((prev) => ({ ...prev, [key]: { ...prev[key], mobile: e.target.value } }))
                        }
                      />
                    </FormField>
                    <FormField label="Email" optional>
                      <input
                        type="email"
                        className="w-full border border-slate-200 p-2.5 rounded text-sm focus:border-emerald-500 outline-none"
                        value={contacts[key].email}
                        maxLength={254}
                        onChange={(e) =>
                          setContacts((prev) => ({ ...prev, [key]: { ...prev[key], email: e.target.value } }))
                        }
                      />
                    </FormField>
                  </div>
                </div>
              ))}
              <div>
                <h4 className="font-bold text-slate-800 mb-3">3. Financial Contact</h4>
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
                        onChange={(e) =>
                          setContacts((prev) => ({ ...prev, financial: { ...prev.financial, name: e.target.value } }))
                        }
                      />
                    </FormField>
                    <FormField label="Mobile" required>
                      <input
                        className="w-full border border-slate-200 p-2.5 rounded text-sm focus:border-emerald-500 outline-none"
                        value={contacts.financial.mobile}
                        maxLength={16}
                        onChange={(e) =>
                          setContacts((prev) => ({ ...prev, financial: { ...prev.financial, mobile: e.target.value } }))
                        }
                      />
                    </FormField>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 4 && (
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
                        onChange={(e) => {
                          const next = [...shipping];
                          next[i].rateFor = e.target.value;
                          setShipping(next);
                        }}
                      >
                        <option value="">Select...</option>
                        {RATE_FOR_OPTIONS.map((o) => (
                          <option key={o} value={o}>
                            {o}
                          </option>
                        ))}
                      </select>
                    </FormField>
                    <FormField label="Destination Country" required>
                      <input
                        className="w-full border border-slate-200 p-2.5 rounded text-sm focus:border-emerald-500 outline-none"
                        value={row.country}
                        maxLength={80}
                        onChange={(e) => {
                          const next = [...shipping];
                          next[i].country = e.target.value;
                          setShipping(next);
                        }}
                      />
                    </FormField>
                    <FormField label="Avg Monthly Volume" required>
                      <input
                        type="number"
                        min="0"
                        className="w-full border border-slate-200 p-2.5 rounded text-sm focus:border-emerald-500 outline-none"
                        value={row.volume}
                        onChange={(e) => {
                          const next = [...shipping];
                          next[i].volume = e.target.value;
                          setShipping(next);
                        }}
                      />
                    </FormField>
                    <FormField label="Avg Monthly Weight (KG)" required>
                      <input
                        type="number"
                        min="0"
                        className="w-full border border-slate-200 p-2.5 rounded text-sm focus:border-emerald-500 outline-none"
                        value={row.weight}
                        onChange={(e) => {
                          const next = [...shipping];
                          next[i].weight = e.target.value;
                          setShipping(next);
                        }}
                      />
                    </FormField>
                    <FormField label="Expected Monthly Revenue (USD)" required>
                      <input
                        type="number"
                        min="0"
                        className="w-full border border-slate-200 p-2.5 rounded text-sm focus:border-emerald-500 outline-none"
                        value={row.revenue}
                        onChange={(e) => {
                          const next = [...shipping];
                          next[i].revenue = e.target.value;
                          setShipping(next);
                        }}
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
                <Plus size={16} className="mr-1" /> Add Country Rate
              </button>
            </div>
          )}

          {step === 5 && (
            <FormField label="Recommendation Note" required hint="Minimum 10 words">
              <textarea
                className="w-full border border-slate-200 p-4 rounded text-sm min-h-[150px] focus:border-emerald-500 outline-none"
                value={form.recNote}
                maxLength={2000}
                onChange={(e) => setField('recNote', e.target.value)}
              />
            </FormField>
          )}
        </div>

        <div className="flex justify-between pt-6 border-t border-slate-100 mt-8">
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
          <button
            type="button"
            onClick={handleNext}
            className="px-6 py-2.5 bg-emerald-700 text-white rounded-lg text-sm font-bold flex items-center shadow-md hover:bg-emerald-800 transition"
          >
            {step < 5 ? 'Next Step' : 'Submit'} <ArrowRight size={16} className="ml-2" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewRecommendationWizard;