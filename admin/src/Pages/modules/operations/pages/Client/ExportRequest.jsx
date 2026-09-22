// src/Pages/modules/operations/pages/Client/ExportRequest.jsx
import { useState, useCallback, useMemo } from 'react';
import SectionCard from '../../components/SectionCard';
import FormField from '../../components/FormField';
import StepWizard from '../../components/StepWizard';
import InfoTooltip from '../../components/InfoTooltip';
import { PARTY_ADDRESS_FIELDS, PARCEL_DETAIL_FIELDS, AWB_SHIPMENT_TYPE_OPTIONS, PACKAGING_OPTIONS, SERVICE_OPTIONS, CURRENCY_OPTIONS } from '../../constants/shipmentFields';
import { createRequest } from '../../services/requestService';
import { useOperationsAuth } from '../../hooks/useOperationsAuth';
import { useToast } from '../../../../../Components/hooks/useToast';
import { isRequired, isValidEmail, isPositiveNumber } from '../../../../../Components/utils/validators';

const emptyPartyForm = () => Object.fromEntries(PARTY_ADDRESS_FIELDS.map((f) => [f.key, '']));
const emptyParcelForm = () => Object.fromEntries(PARCEL_DETAIL_FIELDS.map((f) => [f.key, '']));

const RadioGroup = ({ options, value, onChange, disabled }) => (
  <div className="flex flex-wrap gap-4">
    {options.map((o) => (
      <label key={o} className="flex items-center gap-1.5 text-sm font-medium text-slate-600">
        <input type="radio" checked={value === o} disabled={disabled} onChange={() => onChange(o)} className="accent-emerald-600" />
        {o.replace('_', '-')}
      </label>
    ))}
  </div>
);

const CheckboxGroup = ({ options, values, onToggle, disabled }) => (
  <div className="flex flex-wrap gap-4">
    {options.map((o) => (
      <label key={o} className="flex items-center gap-1.5 text-sm font-medium text-slate-600">
        <input type="checkbox" checked={values.includes(o)} disabled={disabled} onChange={() => onToggle(o)} className="accent-emerald-600" />
        {o}
      </label>
    ))}
  </div>
);

const ExportRequest = () => {
  const { currentUser } = useOperationsAuth();
  const { showToast } = useToast();
  const [step, setStep] = useState(0);
  const [receiver, setReceiver] = useState(emptyPartyForm);
  const [parcel, setParcel] = useState(emptyParcelForm);
  const [declaredValue, setDeclaredValue] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [shipmentType, setShipmentType] = useState('NON_DOCUMENT');
  const [packaging, setPackaging] = useState('Carton');
  const [services, setServices] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const toggleService = (s) => setServices((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  const validateStep = useCallback(
    (idx) => {
      if (idx === 0) {
        for (const f of PARTY_ADDRESS_FIELDS) {
          if (f.required && !isRequired(receiver[f.key])) return `${f.label} is required`;
          if (f.type === 'email' && receiver[f.key] && !isValidEmail(receiver[f.key])) return `${f.label} must be a valid email`;
        }
        return null;
      }
      if (idx === 1) {
        if (!isRequired(parcel.shipmentContents)) return 'Shipment Contents is required';
        if (!isPositiveNumber(parcel.pieces)) return 'No. of Pieces must be a valid number';
        if (!isPositiveNumber(parcel.weightKg)) return 'Weight (KG) must be a valid number';
        if (!isPositiveNumber(parcel.cartons)) return 'No. of Cartons must be a valid number';
        return null;
      }
      return null;
    },
    [receiver, parcel]
  );

  const goNext = useCallback(() => {
    const error = validateStep(step);
    if (error) return showToast(error, 'warning');
    setStep((s) => s + 1);
  }, [step, validateStep, showToast]);

  const goBack = useCallback(() => setStep((s) => Math.max(0, s - 1)), []);

  const handleSubmit = useCallback(async () => {
    for (let i = 0; i <= 1; i += 1) {
      const error = validateStep(i);
      if (error) { setStep(i); showToast(error, 'warning'); return; }
    }
    setIsSubmitting(true);
    try {
      await createRequest({
        mode: 'EXPORT',
        clientEmail: currentUser?.email,
        clientName: currentUser?.name,
        party: receiver,
        parcel: { ...parcel, pieces: Number(parcel.pieces), weightKg: Number(parcel.weightKg), cartons: Number(parcel.cartons), declaredValue: declaredValue ? Number(declaredValue) : null, currency },
        shipmentType,
        packaging,
        services,
      });
      showToast('Export request submitted — pending Domestic Admin pickup scheduling');
      setSubmitted(true);
    } catch (err) {
      showToast(err?.message || 'Failed to submit export request', 'error');
    } finally {
      setIsSubmitting(false);
    }
  }, [validateStep, receiver, parcel, declaredValue, currency, shipmentType, packaging, services, currentUser, showToast]);

  const steps = useMemo(() => ([
    {
      title: 'Receiver Address',
      content: (
        <SectionCard title="Receiver / Consignee Address">
          <div className="space-y-4">
            {PARTY_ADDRESS_FIELDS.map((f) => (
              <FormField key={f.key} field={f} disabled={isSubmitting} value={receiver[f.key]} onChange={(v) => setReceiver((p) => ({ ...p, [f.key]: v }))} />
            ))}
          </div>
        </SectionCard>
      ),
    },
    {
      title: 'Parcel',
      content: (
        <SectionCard title="Parcel Details">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {PARCEL_DETAIL_FIELDS.map((f) => (
              <FormField key={f.key} field={f} disabled={isSubmitting} value={parcel[f.key]} onChange={(v) => setParcel((p) => ({ ...p, [f.key]: v }))} />
            ))}
            <div>
              <label className="flex items-center text-xs font-bold text-slate-700 mb-1">
                Declared Value
                <InfoTooltip text="Customs value of goods." example="1200.00" />
              </label>
              <input type="number" min="0" step="0.01" placeholder="1200.00" disabled={isSubmitting} value={declaredValue} onChange={(e) => setDeclaredValue(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-slate-50 focus:border-emerald-500 outline-none disabled:opacity-60" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Currency</label>
              <select disabled={isSubmitting} value={currency} onChange={(e) => setCurrency(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-slate-50 focus:border-emerald-500 outline-none disabled:opacity-60">
                {CURRENCY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </SectionCard>
      ),
    },
    {
      title: 'Type & Services',
      content: (
        <div className="space-y-6">
          <SectionCard title="Shipment Type">
            <RadioGroup options={AWB_SHIPMENT_TYPE_OPTIONS} value={shipmentType} onChange={setShipmentType} disabled={isSubmitting} />
          </SectionCard>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <SectionCard title="Packaging">
              <RadioGroup options={PACKAGING_OPTIONS} value={packaging} onChange={setPackaging} disabled={isSubmitting} />
            </SectionCard>
            <SectionCard title="Services">
              <CheckboxGroup options={SERVICE_OPTIONS} values={services} onToggle={toggleService} disabled={isSubmitting} />
            </SectionCard>
          </div>
        </div>
      ),
    },
    {
      title: 'Review',
      content: (
        <SectionCard title="Review & Submit">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <p><span className="font-bold text-slate-700">Receiver:</span> {receiver.companyName || '—'}</p>
            <p><span className="font-bold text-slate-700">Contents:</span> {parcel.shipmentContents || '—'}</p>
            <p><span className="font-bold text-slate-700">Weight:</span> {parcel.weightKg || '—'} kg</p>
            <p><span className="font-bold text-slate-700">Type:</span> {shipmentType}</p>
            <p><span className="font-bold text-slate-700">Packaging:</span> {packaging}</p>
            <p><span className="font-bold text-slate-700">Services:</span> {services.join(', ') || '—'}</p>
          </div>
        </SectionCard>
      ),
    },
  ]), [receiver, parcel, declaredValue, currency, shipmentType, packaging, services, isSubmitting]);

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto p-4 md:p-0">
        <SectionCard title="Request Submitted">
          <p className="text-sm text-slate-600 mb-4">Your export request has been sent for review.</p>
          <button type="button" onClick={() => { setSubmitted(false); setStep(0); }} className="bg-emerald-600 text-white text-sm font-bold px-4 py-2.5 rounded-lg hover:bg-emerald-700 transition">
            + Submit Another Request
          </button>
        </SectionCard>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 p-4 md:p-0">
      <div>
        <h1 className="text-xl font-black text-slate-800">Export Request</h1>
        <p className="text-sm text-slate-500">Complete each step, then review and submit.</p>
      </div>
      <StepWizard steps={steps} currentStep={step} onBack={goBack} onNext={goNext} onSubmit={handleSubmit} isSubmitting={isSubmitting} />
    </div>
  );
};

export default ExportRequest;