// src/Pages/modules/operations/pages/DomesticAdmin/AwbGenerate.jsx
import { useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import SectionCard from '../../components/SectionCard';
import FormField from '../../components/FormField';
import StepWizard from '../../components/StepWizard';
import InfoTooltip from '../../components/InfoTooltip';
import TermsCheckbox from '../../components/TermsCheckbox';
import {
  AWB_HEADER_FIELDS, PARTY_ADDRESS_FIELDS, PARCEL_DETAIL_FIELDS, DOCUMENT_CHECKLIST,
  AWB_SHIPMENT_TYPE_OPTIONS, PAYMENT_PARTY_OPTIONS, PACKAGING_OPTIONS, SERVICE_OPTIONS, CURRENCY_OPTIONS,
} from '../../constants/shipmentFields';
import { createShipment, generateAwbNumber } from '../../services/shipmentService';
import { useOperationsAuth } from '../../hooks/useOperationsAuth';
import { useToast } from '../../../../../Components/hooks/useToast';
import { isRequired, isValidEmail, isPositiveNumber } from '../../../../../Components/utils/validators';

const emptyPartyForm = () => Object.fromEntries(PARTY_ADDRESS_FIELDS.map((f) => [f.key, '']));
const emptyHeaderForm = () => Object.fromEntries(AWB_HEADER_FIELDS.map((f) => [f.key, '']));
const emptyParcelForm = () => Object.fromEntries(PARCEL_DETAIL_FIELDS.map((f) => [f.key, '']));
const AWB_NUMBER_FIELD = AWB_HEADER_FIELDS.find((f) => f.key === 'awbNumber');
const OTHER_HEADER_FIELDS = AWB_HEADER_FIELDS.filter((f) => f.key !== 'awbNumber');

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

const validateParty = (party) => {
  for (const f of PARTY_ADDRESS_FIELDS) {
    if (f.required && !isRequired(party[f.key])) return `${f.label} is required`;
    if (f.type === 'email' && party[f.key] && !isValidEmail(party[f.key])) return `${f.label} must be a valid email`;
  }
  return null;
};

const AwbGenerate = () => {
  const { currentUser } = useOperationsAuth();
  const { showToast } = useToast();

  const [step, setStep] = useState(0);
  const [header, setHeader] = useState(emptyHeaderForm);
  const [pickup, setPickup] = useState(emptyPartyForm);
  const [receiver, setReceiver] = useState(emptyPartyForm);
  const [parcel, setParcel] = useState(emptyParcelForm);
  const [declaredValue, setDeclaredValue] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [checkedDocs, setCheckedDocs] = useState([]);
  const [shipmentType, setShipmentType] = useState('NON_DOCUMENT');
  const [paymentTransportBy, setPaymentTransportBy] = useState('Sender');
  const [paymentTransportAcNo, setPaymentTransportAcNo] = useState('');
  const [paymentDutiesBy, setPaymentDutiesBy] = useState('Recipient');
  const [paymentDutiesAcNo, setPaymentDutiesAcNo] = useState('');
  const [packaging, setPackaging] = useState('Carton');
  const [services, setServices] = useState([]);
const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingAwb, setIsGeneratingAwb] = useState(false);
  const [createdAwb, setCreatedAwb] = useState(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const toggleDoc = (doc) => setCheckedDocs((prev) => (prev.includes(doc) ? prev.filter((d) => d !== doc) : [...prev, doc]));
  const toggleService = (s) => setServices((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  const handleAutoGenerateAwb = useCallback(async () => {
    setIsGeneratingAwb(true);
    try {
      const number = await generateAwbNumber(header.shipmentMode || 'EXPORT');
      setHeader((p) => ({ ...p, awbNumber: number }));
    } catch {
      showToast('Failed to auto-generate AWB number', 'error');
    } finally {
      setIsGeneratingAwb(false);
    }
  }, [header.shipmentMode, showToast]);

  const resetForm = useCallback(() => {
    setHeader(emptyHeaderForm());
    setPickup(emptyPartyForm());
    setReceiver(emptyPartyForm());
    setParcel(emptyParcelForm());
    setDeclaredValue('');
    setCurrency('USD');
    setCheckedDocs([]);
    setShipmentType('NON_DOCUMENT');
    setPaymentTransportBy('Sender');
    setPaymentTransportAcNo('');
    setPaymentDutiesBy('Recipient');
    setPaymentDutiesAcNo('');
setPackaging('Carton');
    setServices([]);
    setCreatedAwb(null);
    setAgreedToTerms(false);
  }, []);

  const validateStep = useCallback(
    (idx) => {
      if (idx === 0) {
        if (!isRequired(header.awbNumber)) return 'AWB / CN Number is required';
        if (!isRequired(header.refNo)) return 'Reference No. is required';
        if (!isRequired(header.costCarriedBy)) return 'Cost Carried By is required';
        if (!isRequired(header.bookingDate)) return 'Booking Date is required';
        if (header.shipmentMode !== 'EXPORT' && header.shipmentMode !== 'IMPORT') return 'Shipment Mode is required';
        if (header.clientEmail && !isValidEmail(header.clientEmail)) return 'Client Portal Email must be a valid email';
        return null;
      }
      if (idx === 1) return validateParty(pickup) ? `Pick Up Address: ${validateParty(pickup)}` : null;
      if (idx === 2) return validateParty(receiver) ? `Receiver Address: ${validateParty(receiver)}` : null;
      if (idx === 3) {
        if (!isRequired(parcel.shipmentContents)) return 'Shipment Contents is required';
        if (!isPositiveNumber(parcel.pieces)) return 'No. of Pieces must be a valid number';
        if (!isPositiveNumber(parcel.weightKg)) return 'Weight (KG) must be a valid number';
        if (!isPositiveNumber(parcel.cartons)) return 'No. of Cartons must be a valid number';
        if (declaredValue && !isPositiveNumber(declaredValue)) return 'Declared Value must be a valid number';
        return null;
      }
      return null;
    },
    [header, pickup, receiver, parcel, declaredValue]
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
      if (error) {
        setStep(i);
        showToast(error, 'warning');
        return;
      }
    }
    if (!agreedToTerms) {
      showToast('Please accept the Terms & Conditions before generating the AWB', 'warning');
      return;
    }
    setIsSubmitting(true);
    try {
      const record = await createShipment(
        {
          awbNumber: header.awbNumber,
          refNo: header.refNo,
          costCarriedBy: header.costCarriedBy,
          bookingDate: header.bookingDate,
          shipmentMode: header.shipmentMode,
          clientEmail: header.clientEmail,
          pickup,
          receiver,
          parcel: {
            ...parcel,
            pieces: Number(parcel.pieces),
            weightKg: Number(parcel.weightKg),
            cartons: Number(parcel.cartons),
            declaredValue: declaredValue ? Number(declaredValue) : null,
            currency,
          },
          documents: checkedDocs,
          shipmentType,
          paymentTransportBy,
          paymentTransportAcNo,
          paymentDutiesBy,
          paymentDutiesAcNo,
          packaging,
          services,
        },
        currentUser?.name
      );
      showToast(`AWB ${record.awbNumber} generated successfully`);
      setCreatedAwb(record.awbNumber);
    } catch (err) {
      showToast(err?.message || 'Failed to generate AWB', 'error');
    } finally {
      setIsSubmitting(false);
    }
  }, [validateStep, header, pickup, receiver, parcel, declaredValue, currency, checkedDocs, shipmentType,
    paymentTransportBy, paymentTransportAcNo, paymentDutiesBy, paymentDutiesAcNo, packaging, services,
    currentUser, showToast]);

  const steps = useMemo(() => ([
    {
      title: 'Reference',
      content: (
        <SectionCard title="Shipment Reference" subtitle="Core identifiers for this booking">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center text-xs font-bold text-slate-700 mb-1">
                {AWB_NUMBER_FIELD.label}<span className="text-red-500 ml-0.5">*</span>
                <InfoTooltip text={AWB_NUMBER_FIELD.help} example={AWB_NUMBER_FIELD.placeholder} />
              </label>
              <div className="flex gap-2">
                <input
                  value={header.awbNumber}
                  placeholder={AWB_NUMBER_FIELD.placeholder}
                  onChange={(e) => setHeader((p) => ({ ...p, awbNumber: e.target.value }))}
                  disabled={isSubmitting}
                  maxLength={40}
                  className="flex-1 border border-slate-300 rounded-lg p-2.5 text-sm bg-slate-50 focus:border-emerald-500 outline-none disabled:opacity-60"
                />
                <button type="button" onClick={handleAutoGenerateAwb} disabled={isGeneratingAwb || isSubmitting} className="flex items-center gap-1.5 text-xs font-bold bg-slate-800 text-white px-3 rounded-lg hover:bg-slate-900 transition disabled:opacity-50">
                  <RefreshCw size={13} className={isGeneratingAwb ? 'animate-spin' : ''} /> Generate
                </button>
              </div>
            </div>
            {OTHER_HEADER_FIELDS.map((f) => (
              <FormField key={f.key} field={f} value={header[f.key]} disabled={isSubmitting} onChange={(v) => setHeader((p) => ({ ...p, [f.key]: v }))} />
            ))}
          </div>
          <div className="mt-4">
            <label className="flex items-center text-xs font-bold text-slate-700 mb-1.5">
              Shipment Type
              <InfoTooltip text="Whether this shipment is paperwork only or a physical parcel." example="Non-Document for cargo/parcels" />
            </label>
            <RadioGroup options={AWB_SHIPMENT_TYPE_OPTIONS} value={shipmentType} onChange={setShipmentType} disabled={isSubmitting} />
          </div>
        </SectionCard>
      ),
    },
    {
      title: 'Pick Up',
      content: (
        <SectionCard title="Pick Up Address">
          <div className="space-y-4">
            {PARTY_ADDRESS_FIELDS.map((f) => (
              <FormField key={f.key} field={f} value={pickup[f.key]} disabled={isSubmitting} onChange={(v) => setPickup((p) => ({ ...p, [f.key]: v }))} />
            ))}
          </div>
        </SectionCard>
      ),
    },
    {
      title: 'Receiver',
      content: (
        <SectionCard title="Receiver Address">
          <div className="space-y-4">
            {PARTY_ADDRESS_FIELDS.map((f) => (
              <FormField key={f.key} field={f} value={receiver[f.key]} disabled={isSubmitting} onChange={(v) => setReceiver((p) => ({ ...p, [f.key]: v }))} />
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
              <FormField key={f.key} field={f} value={parcel[f.key]} disabled={isSubmitting} onChange={(v) => setParcel((p) => ({ ...p, [f.key]: v }))} />
            ))}
            <div>
              <label className="flex items-center text-xs font-bold text-slate-700 mb-1">
                Declared Value
                <InfoTooltip text="Customs value of goods, used for duty/tax assessment." example="1200.00" />
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
      title: 'Payment & Docs',
      content: (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <SectionCard title="Payment — Transportation Charges To">
              <RadioGroup options={PAYMENT_PARTY_OPTIONS} value={paymentTransportBy} onChange={setPaymentTransportBy} disabled={isSubmitting} />
              <div className="mt-3">
                <label className="block text-xs font-bold text-slate-700 mb-1">A/C No. (if applicable)</label>
                <input placeholder="AC-00021" disabled={isSubmitting} value={paymentTransportAcNo} onChange={(e) => setPaymentTransportAcNo(e.target.value)} maxLength={40} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-slate-50 focus:border-emerald-500 outline-none disabled:opacity-60" />
              </div>
            </SectionCard>
            <SectionCard title="Payment — Duties & Taxes To">
              <RadioGroup options={PAYMENT_PARTY_OPTIONS} value={paymentDutiesBy} onChange={setPaymentDutiesBy} disabled={isSubmitting} />
              <div className="mt-3">
                <label className="block text-xs font-bold text-slate-700 mb-1">A/C No. (if applicable)</label>
                <input placeholder="AC-00021" disabled={isSubmitting} value={paymentDutiesAcNo} onChange={(e) => setPaymentDutiesAcNo(e.target.value)} maxLength={40} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-slate-50 focus:border-emerald-500 outline-none disabled:opacity-60" />
              </div>
            </SectionCard>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <SectionCard title="Packaging">
              <RadioGroup options={PACKAGING_OPTIONS} value={packaging} onChange={setPackaging} disabled={isSubmitting} />
            </SectionCard>
            <SectionCard title="Services">
              <CheckboxGroup options={SERVICE_OPTIONS} values={services} onToggle={toggleService} disabled={isSubmitting} />
            </SectionCard>
          </div>
          <SectionCard title="Required Documents" subtitle="Tick the documents already collected — you can upload the actual files afterwards.">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {DOCUMENT_CHECKLIST.map((doc) => (
                <label key={doc} className="flex items-center gap-2 text-sm font-medium text-slate-600">
                  <input type="checkbox" checked={checkedDocs.includes(doc)} disabled={isSubmitting} onChange={() => toggleDoc(doc)} className="accent-emerald-600" />
                  {doc}
                </label>
              ))}
            </div>
          </SectionCard>
        </div>
      ),
    },
    {
      title: 'Review',
      content: (
        <SectionCard title="Review & Submit">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <p><span className="font-bold text-slate-700">AWB:</span> {header.awbNumber || '—'}</p>
            <p><span className="font-bold text-slate-700">Mode:</span> {header.shipmentMode || '—'}</p>
            <p><span className="font-bold text-slate-700">Pickup:</span> {pickup.companyName || '—'}, {pickup.city || '—'}</p>
            <p><span className="font-bold text-slate-700">Receiver:</span> {receiver.companyName || '—'}, {receiver.city || '—'}</p>
            <p><span className="font-bold text-slate-700">Contents:</span> {parcel.shipmentContents || '—'}</p>
            <p><span className="font-bold text-slate-700">Weight:</span> {parcel.weightKg || '—'} kg</p>
            <p><span className="font-bold text-slate-700">Packaging:</span> {packaging}</p>
            <p><span className="font-bold text-slate-700">Services:</span> {services.join(', ') || '—'}</p>
          </div>
          <p className="text-xs text-slate-400 mt-4 mb-3">Click Submit below to generate the AWB and create the shipment record.</p>
          <TermsCheckbox checked={agreedToTerms} onChange={setAgreedToTerms} disabled={isSubmitting} />
        </SectionCard>
      ),
    },
  ]), [header, pickup, receiver, parcel, declaredValue, currency, shipmentType, paymentTransportBy, paymentTransportAcNo,
    paymentDutiesBy, paymentDutiesAcNo, packaging, services, checkedDocs, isSubmitting, isGeneratingAwb, handleAutoGenerateAwb,
    agreedToTerms]);

  if (createdAwb) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 p-4 md:p-0">
        <SectionCard title="AWB Generated Successfully">
          <p className="text-sm text-slate-600 mb-4">
            AWB <span className="font-bold text-emerald-700">{createdAwb}</span> has been created.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to={`/operations/documents/awb-invoice/${encodeURIComponent(createdAwb)}`} className="bg-emerald-600 text-white text-sm font-bold px-4 py-2.5 rounded-lg hover:bg-emerald-700 transition">
              Print AWB + Invoice
            </Link>
            <Link to={`/operations/documents/awb/${encodeURIComponent(createdAwb)}`} className="bg-slate-800 text-white text-sm font-bold px-4 py-2.5 rounded-lg hover:bg-slate-900 transition">
              View AWB
            </Link>
            <Link to={`/operations/documents/label/${encodeURIComponent(createdAwb)}`} className="bg-white border border-slate-300 text-slate-700 text-sm font-bold px-4 py-2.5 rounded-lg hover:bg-slate-50 transition">
              Print Label
            </Link>
            <button type="button" onClick={resetForm} className="text-sm font-bold text-slate-500 hover:text-slate-700 transition">
              + Create Another AWB
            </button>
          </div>
        </SectionCard>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4 md:p-0">
      <div>
        <h1 className="text-xl font-black text-slate-800">AWB / CN Number Generate</h1>
        <p className="text-sm text-slate-500">Complete each step, then review and submit.</p>
      </div>
      <StepWizard steps={steps} currentStep={step} onBack={goBack} onNext={goNext} onSubmit={handleSubmit} isSubmitting={isSubmitting} />
    </div>
  );
};

export default AwbGenerate;