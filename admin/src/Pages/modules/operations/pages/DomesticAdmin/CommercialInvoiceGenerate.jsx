// src/Pages/modules/operations/pages/DomesticAdmin/CommercialInvoiceGenerate.jsx
// (Same layout reused verbatim in ForeignAdmin/CommercialInvoiceGenerate.jsx)
import { useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import SectionCard from '../../components/SectionCard';
import FormField from '../../components/FormField';
import StepWizard from '../../components/StepWizard';
import { PARTY_ADDRESS_FIELDS, emptyInvoiceItem } from '../../constants/shipmentFields';
import { createOrUpdateInvoice } from '../../services/invoiceService';
import { useToast } from '../../../../../Components/hooks/useToast';
import { isRequired, isPositiveNumber } from '../../../../../Components/utils/validators';

const emptyPartyForm = () => Object.fromEntries(PARTY_ADDRESS_FIELDS.map((f) => [f.key, '']));

const CommercialInvoiceGenerate = () => {
  const { showToast } = useToast();
  const [step, setStep] = useState(0);
  const [awbNumber, setAwbNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [shipper, setShipper] = useState(emptyPartyForm);
  const [consignee, setConsignee] = useState(emptyPartyForm);
  const [binNumber, setBinNumber] = useState('');
  const [items, setItems] = useState([emptyInvoiceItem()]);
  const [additionalComment, setAdditionalComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savedAwb, setSavedAwb] = useState(null);

  const updateItem = (idx, key, value) => setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [key]: value } : it)));
  const addItem = () => setItems((prev) => [...prev, emptyInvoiceItem()]);
  const removeItem = (idx) => setItems((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));
  const total = items.reduce((sum, it) => sum + (Number(it.unitCost) || 0) * (Number(it.pcs) || 0), 0);

  const validateStep = useCallback(
    (idx) => {
      if (idx === 0) {
        if (!isRequired(awbNumber)) return 'AWB Number is required';
        if (!isRequired(invoiceDate)) return 'Invoice Date is required';
        return null;
      }
      if (idx === 1) {
        if (!isRequired(shipper.companyName)) return 'Shipper Company Name is required';
        return null;
      }
      if (idx === 2) {
        if (!isRequired(consignee.companyName)) return 'Consignee Company Name is required';
        return null;
      }
      if (idx === 3) {
        for (const it of items) {
          if (!isRequired(it.description)) return 'Each item needs a description';
          if (!isPositiveNumber(it.pcs)) return 'Each item needs a valid PCS value';
          if (!isPositiveNumber(it.unitCost)) return 'Each item needs a valid unit cost';
        }
        return null;
      }
      return null;
    },
    [awbNumber, invoiceDate, shipper, consignee, items]
  );

  const goNext = useCallback(() => {
    const error = validateStep(step);
    if (error) return showToast(error, 'warning');
    setStep((s) => s + 1);
  }, [step, validateStep, showToast]);

  const goBack = useCallback(() => setStep((s) => Math.max(0, s - 1)), []);

  const handleSubmit = useCallback(async () => {
    for (let i = 0; i <= 3; i += 1) {
      const error = validateStep(i);
      if (error) { setStep(i); showToast(error, 'warning'); return; }
    }
    setIsSubmitting(true);
    try {
      const record = await createOrUpdateInvoice({ awbNumber, invoiceDate, shipper, consignee, binNumber, items, additionalComment });
      showToast(`Invoice saved for ${record.awbNumber}`);
      setSavedAwb(record.awbNumber);
    } catch (err) {
      showToast(err?.message || 'Failed to save invoice', 'error');
    } finally {
      setIsSubmitting(false);
    }
  }, [validateStep, awbNumber, invoiceDate, shipper, consignee, binNumber, items, additionalComment, showToast]);

  const steps = useMemo(() => ([
    {
      title: 'Reference',
      content: (
        <SectionCard title="Invoice Reference">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">AWB Number *</label>
              <input disabled={isSubmitting} placeholder="MLE-260763" value={awbNumber} onChange={(e) => setAwbNumber(e.target.value)} maxLength={30} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-slate-50 focus:border-emerald-500 outline-none disabled:opacity-60" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Invoice Date *</label>
              <input type="date" disabled={isSubmitting} value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-slate-50 focus:border-emerald-500 outline-none disabled:opacity-60" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Consignee BIN Number</label>
              <input disabled={isSubmitting} placeholder="000123456-0101" value={binNumber} onChange={(e) => setBinNumber(e.target.value)} maxLength={30} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-slate-50 focus:border-emerald-500 outline-none disabled:opacity-60" />
            </div>
          </div>
        </SectionCard>
      ),
    },
    {
      title: 'Shipper',
      content: (
        <SectionCard title="Shipper Information">
          <div className="space-y-4">
            {PARTY_ADDRESS_FIELDS.map((f) => (
              <FormField key={f.key} field={f} disabled={isSubmitting} value={shipper[f.key]} onChange={(v) => setShipper((p) => ({ ...p, [f.key]: v }))} />
            ))}
          </div>
        </SectionCard>
      ),
    },
    {
      title: 'Consignee',
      content: (
        <SectionCard title="Consignee Information">
          <div className="space-y-4">
            {PARTY_ADDRESS_FIELDS.map((f) => (
              <FormField key={f.key} field={f} disabled={isSubmitting} value={consignee[f.key]} onChange={(v) => setConsignee((p) => ({ ...p, [f.key]: v }))} />
            ))}
          </div>
        </SectionCard>
      ),
    },
    {
      title: 'Items',
      content: (
        <SectionCard title="Invoice Items" actions={
          <button type="button" onClick={addItem} disabled={isSubmitting} className="flex items-center gap-1 text-xs font-bold text-emerald-600 hover:underline disabled:opacity-50">
            <Plus size={14} /> Add Item
          </button>
        }>
          <div className="space-y-3">
            {items.map((it, idx) => (
              <div key={idx} className="grid grid-cols-2 sm:grid-cols-12 gap-2 items-end border-b border-slate-100 pb-3">
                <div className="col-span-2 sm:col-span-5">
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Description</label>
                  <input disabled={isSubmitting} placeholder="Cotton Fabric Rolls" value={it.description} onChange={(e) => updateItem(idx, 'description', e.target.value)} maxLength={200} className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-slate-50 focus:border-emerald-500 outline-none disabled:opacity-60" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">HS Code</label>
                  <input disabled={isSubmitting} placeholder="5208.11" value={it.hsCode} onChange={(e) => updateItem(idx, 'hsCode', e.target.value)} maxLength={20} className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-slate-50 focus:border-emerald-500 outline-none disabled:opacity-60" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">PCS</label>
                  <input type="number" min="0" placeholder="4" disabled={isSubmitting} value={it.pcs} onChange={(e) => updateItem(idx, 'pcs', e.target.value)} className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-slate-50 focus:border-emerald-500 outline-none disabled:opacity-60" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Unit Cost</label>
                  <input type="number" min="0" step="0.01" placeholder="12.50" disabled={isSubmitting} value={it.unitCost} onChange={(e) => updateItem(idx, 'unitCost', e.target.value)} className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-slate-50 focus:border-emerald-500 outline-none disabled:opacity-60" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Value</label>
                  <p className="p-2 text-sm font-bold text-slate-700">{((Number(it.unitCost) || 0) * (Number(it.pcs) || 0)).toFixed(2)}</p>
                </div>
                <div className="flex justify-end">
                  <button type="button" onClick={() => removeItem(idx)} disabled={isSubmitting || items.length === 1} className="text-red-500 disabled:opacity-30">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
            <div className="flex justify-end pt-2">
              <p className="text-sm font-black text-slate-800">TOTAL: {total.toFixed(2)}</p>
            </div>
          </div>
        </SectionCard>
      ),
    },
    {
      title: 'Review',
      content: (
        <SectionCard title="Additional Comment & Review">
          <textarea rows={3} disabled={isSubmitting} placeholder="I/we hereby certify that the information contained in this invoice is true and correct." value={additionalComment} onChange={(e) => setAdditionalComment(e.target.value)} maxLength={500} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-slate-50 focus:border-emerald-500 outline-none disabled:opacity-60" />
          <div className="mt-4 text-sm text-slate-600">
            <p><span className="font-bold">AWB:</span> {awbNumber || '—'}</p>
            <p><span className="font-bold">Shipper:</span> {shipper.companyName || '—'}</p>
            <p><span className="font-bold">Consignee:</span> {consignee.companyName || '—'}</p>
            <p><span className="font-bold">Items:</span> {items.length} · <span className="font-bold">Total:</span> {total.toFixed(2)}</p>
          </div>
        </SectionCard>
      ),
    },
  ]), [awbNumber, invoiceDate, binNumber, shipper, consignee, items, additionalComment, isSubmitting, total]);

  if (savedAwb) {
    return (
      <div className="max-w-2xl mx-auto p-4 md:p-0">
        <SectionCard title="Invoice Saved">
          <p className="text-sm text-slate-600 mb-4">Invoice saved for <span className="font-bold text-emerald-700">{savedAwb}</span>.</p>
          <div className="flex flex-wrap gap-3">
            <Link to={`/operations/documents/invoice/${encodeURIComponent(savedAwb)}`} className="bg-emerald-600 text-white text-sm font-bold px-4 py-2.5 rounded-lg hover:bg-emerald-700 transition">
              View / Print Invoice
            </Link>
            <button type="button" onClick={() => { setSavedAwb(null); setStep(0); }} className="text-sm font-bold text-slate-500 hover:text-slate-700 transition">
              + Create Another Invoice
            </button>
          </div>
        </SectionCard>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4 md:p-0">
      <div>
        <h1 className="text-xl font-black text-slate-800">Commercial Invoice</h1>
        <p className="text-sm text-slate-500">Complete each step, then review and save.</p>
      </div>
      <StepWizard steps={steps} currentStep={step} onBack={goBack} onNext={goNext} onSubmit={handleSubmit} isSubmitting={isSubmitting} />
    </div>
  );
};

export default CommercialInvoiceGenerate;