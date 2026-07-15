// admin/src/Pages/modules/sales/roles/KAM/FinalAccountProfilePanel.jsx 
import React, { useState } from 'react';
import { ClipboardEdit, Save } from 'lucide-react';
import { updateFinalProfile } from '../../services/customerService';
import { useToast } from '../../../../../Components/hooks/useToast';
import { isRequired } from '../../../../../Components/utils/validators';
import { GAIN_TYPE_OPTIONS, FINANCE_MODE_OPTIONS } from '../../constants/formOptions';

const FinalAccountProfilePanel = ({ customer, onSaved }) => {
  const { showToast } = useToast();
  const [form, setForm] = useState({
    provisionalReason: customer.provisionalReason || '',
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    if (isSubmitting) return;
    if (!isRequired(form.provisionalReason)) {
      return showToast('Reason for provisional account is required', 'warning');
    }
    setIsSubmitting(true);
    try {
      await updateFinalProfile(customer.id, form);
      showToast('Final account profile saved', 'success');
      onSaved?.();
    } catch (err) {
      showToast(err?.message || 'Failed to save profile', 'error');
    } finally {
      setIsSubmitting(false);
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
        <label className="block text-xs font-bold text-slate-700 mb-1.5">
          Reason for Provisional Account <span className="text-red-500">*</span>
        </label>
        <textarea
          className="w-full border border-slate-300 p-2.5 rounded-lg text-sm outline-none focus:border-purple-500 min-h-[70px]"
          placeholder="e.g. Managing Director sign missing"
          value={form.provisionalReason}
          maxLength={500}
          onChange={(e) => setField('provisionalReason', e.target.value)}
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1.5">Name of Managing Partner</label>
        <input
          className="w-full border border-slate-300 p-2.5 rounded-lg text-sm outline-none focus:border-purple-500"
          value={form.managingPartnerName}
          maxLength={150}
          onChange={(e) => setField('managingPartnerName', e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">BIN Number</label>
          <input
            className="w-full border border-slate-300 p-2.5 rounded-lg text-sm outline-none focus:border-purple-500"
            value={form.binNumber}
            maxLength={50}
            onChange={(e) => setField('binNumber', e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">TIN Number</label>
          <input
            className="w-full border border-slate-300 p-2.5 rounded-lg text-sm outline-none focus:border-purple-500"
            value={form.tinNumber}
            maxLength={50}
            onChange={(e) => setField('tinNumber', e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1.5">Destinations (comma separated)</label>
        <input
          className="w-full border border-slate-300 p-2.5 rounded-lg text-sm outline-none focus:border-purple-500"
          value={form.destinations}
          maxLength={500}
          onChange={(e) => setField('destinations', e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">Preferred Carrier</label>
          <input
            className="w-full border border-slate-300 p-2.5 rounded-lg text-sm outline-none focus:border-purple-500"
            placeholder="e.g. DHL, UPS"
            value={form.preferredCarrier}
            maxLength={150}
            onChange={(e) => setField('preferredCarrier', e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">Nature of Business</label>
          <input
            className="w-full border border-slate-300 p-2.5 rounded-lg text-sm outline-none focus:border-purple-500"
            value={form.natureOfBusiness}
            maxLength={150}
            onChange={(e) => setField('natureOfBusiness', e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">Area</label>
          <input
            className="w-full border border-slate-300 p-2.5 rounded-lg text-sm outline-none focus:border-purple-500"
            value={form.area}
            maxLength={100}
            onChange={(e) => setField('area', e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">Zone</label>
          <input
            className="w-full border border-slate-300 p-2.5 rounded-lg text-sm outline-none focus:border-purple-500"
            value={form.zone}
            maxLength={100}
            onChange={(e) => setField('zone', e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">Type</label>
          <select
            className="w-full border border-slate-300 p-2.5 rounded-lg text-sm bg-white outline-none focus:border-purple-500"
            value={form.gainType}
            onChange={(e) => setField('gainType', e.target.value)}
          >
            <option value="">Select...</option>
            {GAIN_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">Mode</label>
          <select
            className="w-full border border-slate-300 p-2.5 rounded-lg text-sm bg-white outline-none focus:border-purple-500"
            value={form.financeMode}
            onChange={(e) => setField('financeMode', e.target.value)}
          >
            <option value="">Select...</option>
            {FINANCE_MODE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1.5">Special Instructions (if any)</label>
        <textarea
          className="w-full border border-slate-300 p-2.5 rounded-lg text-sm outline-none focus:border-purple-500 min-h-[60px]"
          value={form.specialInstructions}
          maxLength={500}
          onChange={(e) => setField('specialInstructions', e.target.value)}
        />
      </div>

      <button
        type="button"
        disabled={isSubmitting}
        onClick={handleSave}
        className="w-full bg-purple-600 text-white font-bold py-3 rounded-lg text-sm shadow-md hover:bg-purple-700 transition disabled:opacity-50 flex items-center justify-center"
      >
        <Save size={16} className="mr-2" /> Save Profile Info
      </button>
    </div>
  );
};

export default FinalAccountProfilePanel;