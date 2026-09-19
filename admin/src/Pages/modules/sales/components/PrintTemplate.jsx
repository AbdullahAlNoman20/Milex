// src/Pages/modules/sales/components/PrintTemplate.jsx

import { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import { buildRateRefs } from '../../../../Components/utils/format';

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

const twoDigitsToWords = (n) => {
  if (n < 20) return ONES[n];
  return `${TENS[Math.floor(n / 10)]}${n % 10 ? ' ' + ONES[n % 10] : ''}`;
};

const threeDigitsToWords = (n) => {
  const hundred = Math.floor(n / 100);
  const rest = n % 100;
  return `${hundred ? ONES[hundred] + ' Hundred' : ''}${hundred && rest ? ' ' : ''}${rest ? twoDigitsToWords(rest) : ''}`;
};

// Bangladeshi (crore/lakh/thousand) numbering — used only to render an
// amount already present on the customer record; never a new/derived field.
const numberToWordsBDT = (value) => {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n) || n <= 0) return '';
  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thousand = Math.floor((n % 100000) / 1000);
  const hundred = n % 1000;
  const parts = [];
  if (crore) parts.push(`${threeDigitsToWords(crore)} Crore`);
  if (lakh) parts.push(`${threeDigitsToWords(lakh)} Lakh`);
  if (thousand) parts.push(`${threeDigitsToWords(thousand)} Thousand`);
  if (hundred) parts.push(threeDigitsToWords(hundred));
  return parts.length ? `${parts.join(' ')} Only` : '';
};

const getContactByType = (contacts, type) => (contacts || []).find((ct) => ct.type === type) || {};

const formatPrintDate = (value) => (value ? new Date(value).toLocaleDateString('en-GB').replace(/\//g, '.') : '');

const formatPrintTimestamp = (value) =>
  new Date(value || Date.now()).toLocaleString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  });

// Real Code128 barcode for the Recommendation Form header — matches the
// scanned-in reference PDF's ID barcode above the "Customer ID:" line.
const RFormBarcode = ({ value }) => {
  const svgRef = useRef(null);
  useEffect(() => {
    if (!svgRef.current || !value) return;
    try {
      JsBarcode(svgRef.current, value, {
        format: 'CODE128', width: 1.3, height: 34, displayValue: false, margin: 0, background: 'transparent', lineColor: '#000',
      });
    } catch {
      /* invalid chars — bars just won't render */
    }
  }, [value]);
  if (!value) return null;
  return <svg ref={svgRef} />;
};

// Simple bordered key/value table matching the reference PDF's plain black-
// border tables (distinct from PBox's boxed-field style used by 'profile').
const RTable = ({ rows }) => (
  <table className="w-full border-collapse text-[11px]">
    <tbody>
      {rows.map(([label, value], i) => (
        <tr key={i}>
          <td className="border border-slate-800 px-2 py-1 font-semibold whitespace-nowrap" style={{ width: '220px' }}>{label}</td>
          <td className="border border-slate-800 px-2 py-1">{value || ''}</td>
        </tr>
      ))}
    </tbody>
  </table>
);

const RSectionTitle = ({ children }) => (
  <p className="font-bold text-[12px] text-slate-900 mt-5 mb-2">{children}</p>
);

const PBox = ({ label, value, labelWidth = '150px', center = false }) => (
  <div className="flex items-center gap-2">
    <span className="text-[10px] font-semibold text-slate-900 shrink-0" style={{ width: labelWidth }}>
      {label}
    </span>
    <span
      className={`flex-1 border border-slate-800 px-2 py-0.5 text-[10px] min-h-[17px] leading-[15px] text-slate-900 ${center ? 'text-center' : ''}`}
    >
      {value || ''}
    </span>
  </div>
);

const POptionRow = ({ label, options, isSelected, labelWidth = '110px' }) => (
  <div className="flex items-center gap-2">
    <span className="text-[10px] font-semibold text-slate-900 shrink-0" style={{ width: labelWidth }}>
      {label}
    </span>
    <div className="flex border border-slate-800">
      {options.map((opt, i) => (
        <span
          key={opt.value}
          className={`px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap ${i > 0 ? 'border-l border-slate-800' : ''} ${
            isSelected(opt.value) ? 'bg-slate-800 text-white' : 'text-slate-900'
          }`}
        >
          {opt.label}
        </span>
      ))}
    </div>
  </div>
);

const PSectionTitle = ({ children }) => (
  <p className="text-center font-bold text-[11px] underline text-slate-900 my-1.5">{children}</p>
);

const formatOfferDate = (value) =>
  new Date(value || Date.now())
    .toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
    .toUpperCase();

const OfferRow = ({ head, label, children, indent = '3mm', labelWidth = '45mm' }) => (
  <div style={{ paddingLeft: indent, marginBottom: '4mm', breakInside: 'avoid', pageBreakInside: 'avoid' }}>
    {head && <div className="font-bold">{head}</div>}
    <div className="flex">
      <div className="font-bold shrink-0" style={{ width: labelWidth }}>{label}</div>
      <div className="font-bold shrink-0" style={{ width: '3mm' }}>:</div>
      <div className="flex-1 text-justify">{children}</div>
    </div>
  </div>
);

const OfferLetter = ({ c }) => (
  <div className="text-black" style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: '11pt', lineHeight: 1.15 }}>
    <div className="flex justify-between">
      <div style={{ maxWidth: '110mm' }}>
        <p className="font-bold">{c.accountName}</p>
        <p style={{ whiteSpace: 'pre-line' }}>{c.address}</p>
      </div>
      <div style={{ width: '35mm' }}>
        <p>{c.barcode}</p>
        {/* offer sent date; change field name if yours differs — falls back to today */}
        <p>{formatOfferDate(c.offerSentAt || c.offerSentDate)}</p>
      </div>
    </div>

    <div className="flex italic font-bold" style={{ marginTop: '22mm', marginBottom: '5mm' }}>
      <span className="shrink-0" style={{ width: '27mm' }}>Subject</span>
      <span className="shrink-0" style={{ width: '9mm' }}>:</span>
      <span className="underline">Offer for International Air Express Service Ex-Bangladesh</span>
    </div>

    <p>Dear Sir,</p>
    <p className="text-justify" style={{ marginBottom: '5mm' }}>
      I hope this letter finds you well. Further to our meeting dated, with you and our sales representative at your
      office, I am pleased to formally offer you our International Air Express Service (Door to Door) on the following
      terms:
    </p>

    <OfferRow label="a)&nbsp;&nbsp;&nbsp;Pick-up">
      Our regular pick-up time is between 9:00 a.m. and 11:00 p.m. from Saturday to Thursday. We also offer pick-up on
      Fridays and Government Holidays. For pick-up arrangements, you may contact our dedicated hotline at{' '}
      <b>+88 01321146422</b>
    </OfferRow>

    <OfferRow label={<>b)&nbsp;&nbsp;Proof–of-Delivery</>}>
      For both your incoming and outgoing shipments, you can track the status via our Customer Service Point{' '}
      <b>+88 01321146424</b> or through our online tracking system at{' '}
      <b className="underline">www.milexair.com.</b>
    </OfferRow>

    <div className="font-bold" style={{ paddingLeft: '3mm', marginBottom: '1mm', breakAfter: 'avoid' }}>
      c)&nbsp;&nbsp;&nbsp;Rates
    </div>

    <OfferRow indent="10mm" labelWidth="38mm" label={<em>i) Outgoing (prepaid)</em>}>
      I am pleased to enclose herewith a <b>Net Payable Rate Scale</b> in US dollar exclusively applicable for your
      Outgoing shipments. Please note that, <b><em>15% VAT will be charged for all non-export shipments.</em></b>
    </OfferRow>

    <OfferRow
      indent="10mm"
      labelWidth="38mm"
      head={<em>ii) Outgoing</em>}
      label={<em>(Cash on Delivery)</em>}
    >
      You can also use our service Cash on Delivery (COD) basis to your consignee. Please note that if your consignee
      refuses to make payment for any shipment then we will raise the invoice here locally at your end.
    </OfferRow>

    <OfferRow indent="10mm" labelWidth="38mm" label={<em>iii) Incoming shipment</em>}>
      You can also get your incoming shipment on collect basis, against this service, we will charge to you according
      to the printed rates of origin country.
    </OfferRow>

    <OfferRow indent="7mm" labelWidth="41mm" label="d)&nbsp;&nbsp;&nbsp;Transit Time">
      The estimated delivery time for shipments from Bangladesh to destinations worldwide is 2 to 5 days, provided
      there are no delays in local or destination customs.
    </OfferRow>

    <OfferRow
      indent="7mm"
      labelWidth="41mm"
      head="e)&nbsp;&nbsp;&nbsp;Incoming Shipment"
      label={<span style={{ paddingLeft: '5mm' }}>Customs Clearance</span>}
    >
      We will ensure clearance of all your Incoming Non-Dox MilExAir shipments within 1 to 3 days if you authorize us
      for the same. We will charge you fixed clearing charge (mentioned below) in excluding all the Government duty,
      taxes, VAT AIT and other Govt. levies at actual basis if applicable.
    </OfferRow>

    <div style={{ marginLeft: '44mm', marginBottom: '4mm', breakInside: 'avoid', pageBreakInside: 'avoid' }}>
      <table className="w-full border-collapse text-center" style={{ tableLayout: 'fixed', fontSize: '10pt' }}>
        <colgroup>
          <col style={{ width: '29%' }} />
          <col style={{ width: '36%' }} />
          <col style={{ width: '35%' }} />
        </colgroup>
        <thead>
          <tr>
            <th className="border border-black px-1 py-0.5">Service</th>
            <th className="border border-black px-1 py-0.5">Up to 4.99kg or Value US$99.99</th>
            <th className="border border-black px-1 py-0.5">Beyond 4.99 kg or Value US$99.99</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-black px-1 py-0.5">MilExAir, Incoming</td>
            <td className="border border-black px-1 py-0.5">Taka 1,200.00</td>
            <td className="border border-black px-1 py-0.5">Taka 1,500.00</td>
          </tr>
          <tr>
            <td className="border border-black px-1 py-0.5">Non- MilExAir, Incoming</td>
            <td className="border border-black px-1 py-0.5">Taka 1,800.00</td>
            <td className="border border-black px-1 py-0.5">Taka 2,100.00</td>
          </tr>
        </tbody>
      </table>
    </div>

    <OfferRow indent="7mm" labelWidth="41mm" label="f)&nbsp;&nbsp;&nbsp;Packaging Materials">
      We will provide packaging materials free of charge to ensure your shipments reach their destination safely.
      Alternatively, you may use your own packaging.
    </OfferRow>

    <OfferRow
      indent="7mm"
      labelWidth="41mm"
      head="g)&nbsp;&nbsp;&nbsp;Measurement of"
      label={<span style={{ paddingLeft: '5mm' }}>Shipment</span>}
    >
      For measuring shipments, we will follow the IATA rules with regard to the “GROSS” and “VOLUMETRIC” weight and
      will charge you on the basis whichever is higher. Volumetric shipment calculation:{' '}
      <b>Height x Width x Length (cm)/5000.</b>
    </OfferRow>

    <OfferRow
      indent="7mm"
      labelWidth="41mm"
      head="h)&nbsp;&nbsp;&nbsp;Dollar and"
      label={<span style={{ paddingLeft: '5mm' }}>Taka Ratio</span>}
    >
      Dollar to Taka ratio will be fixed by the International Air Express Association of Bangladesh for all its
      members.
    </OfferRow>

    <OfferRow indent="7mm" labelWidth="41mm" label="i)&nbsp;&nbsp;&nbsp;Fuel Surcharge">
      Monthly Index based fuel surcharge based on the index will be added on Net payable rate.
    </OfferRow>

    <OfferRow indent="7mm" labelWidth="41mm" label="j)&nbsp;&nbsp;&nbsp;Compensation">
      Incase of any service failure (Delay in delivery, Partial &amp; full missing) we will give you compensation
      based on the Terms, Conditions &amp; Amount mentioned on the reverse page of MilExAir Airway bill.
    </OfferRow>

    <div style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
      <p className="text-justify" style={{ marginBottom: '4mm' }}>
        We are confident that this offer will meet your expectations. Should you require any further clarification or
        information please feel free to contact me. We look forward to establishing a long-lasting and mutually
        beneficial partnership between our organizations.
      </p>
      <p style={{ marginBottom: '4mm' }}>Thank you and best regards.</p>
      <p>Should you have any questions or please do not hesitate to contact me.</p>

      <p style={{ marginTop: '14mm' }}>Very sincerely yours,</p>
      <p>AnRoot LogEx Limited.</p>

      <p style={{ marginTop: '14mm' }}>_____________________</p>
      <p>Rashed Ahmed Khan Chowdhury</p>
      <p>Chief Commercial Officer</p>

      <div className="grid" style={{ gridTemplateColumns: '14mm 6mm 1fr', marginTop: '10mm' }}>
        <span>Encl.</span>
        <span>:</span>
        <span>
          i) Net payable rate chart exclusively for <b>{c.accountName}</b>
        </span>
        <span>CC</span>
        <span>:</span>
        <span>Sales and marketing department.</span>
      </div>
    </div>
  </div>
);

const PrintTemplate = ({ data, onClose }) => {
 useEffect(() => {
    if (!data) return undefined;
    // No on-screen preview at all — this component stays invisible (see
    // the `hidden print:block` wrapper below) and only exists to trigger
    // the browser's native print dialog, then removes itself once that
    // dialog closes (whether the person printed or cancelled it).
    const timer = setTimeout(() => window.print(), 60);
    const handleAfterPrint = () => onClose?.();
    window.addEventListener('afterprint', handleAfterPrint);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, [data, onClose]);

  if (!data) return null;
  const c = data.customer;

  return (
    <div className="hidden print:block print:static print:h-auto print:min-h-0 print:p-0 print:bg-white print:overflow-visible">
      <style>{`
        @media print {
          @page { size: A4; margin: ${data.type === 'offer' ? '23mm 13mm 10mm 25mm' : '10mm'}; }
          .print-avoid-break { break-inside: avoid; page-break-inside: avoid; }
        }
      `}</style>

     <div className={`bg-white w-full max-w-[210mm] min-h-[297mm] text-black p-12 shadow-2xl relative print:shadow-none print:m-0 print:w-full print:max-w-none print:min-h-0 ${data.type === 'offer' ? 'print:p-0' : 'print:p-5'}`}>
        {data.type !== 'profile' && data.type !== 'offer' && (
          <div className="flex justify-between items-end border-b-2 border-slate-800 pb-4 mb-8">
            <h1 className="text-4xl font-black text-emerald-800 italic tracking-tighter">MILEX</h1>
            <p className="text-right text-xs  mt-2 font-mono bg-slate-100 px-2 py-1 inline-block border font-bold text-slate-800">
              ID: {c.barcode}
            </p>
          </div>
        )}

        {data.type === 'offer' && <OfferLetter c={c} />}

        {data.type === 'agreement' && (
          <div className="space-y-4 text-sm whitespace-pre-wrap leading-relaxed">{c.agreementText}</div>
        )}

        {data.type === 'recommendation' && (() => {
          const keyContact = getContactByType(c.contacts, 'KEY_CONTACT_PERSON');
          const financialContact = getContactByType(c.contacts, 'FINANCIAL_CONTACT');
          const seniorContact = getContactByType(c.contacts, 'SENIOR_MANAGEMENT');
          const shipping = c.shippingDetails || [];
          const rateRefDisplay = buildRateRefs(c).join('  /  ');

          return (
            <div className="text-slate-900 text-[11px]">
              <p className="text-right text-[11px] mb-6">{formatPrintTimestamp(c.createdAt)}</p>
              <h1 className="text-center font-bold text-lg mb-6">CUSTOMER RECOMMENDATION FORM</h1>

              <div className="flex justify-end mb-1">
                <RFormBarcode value={c.barcode} />
              </div>
              <div className="flex justify-end items-center gap-1 mb-4 text-[11px]">
                <span className="font-semibold">Customer ID:</span>
                <span className="font-mono">{c.barcode}</span>
              </div>

              <RTable rows={[['Name of the Key Account Manager', c.recommendedBy?.name || c.handledBy?.name || '']]} />

              <RSectionTitle>Customer Account Information</RSectionTitle>
              <RTable
                rows={[
                  ['Account Name', c.accountName],
                  ['Name of MD/Chairman/CEO/ED', c.managingPartnerName],
                  ['Mobile', c.phone],
                  ['Phone', c.phone],
                  ['FAX', ''],
                  ['Email', c.email],
                  ['Address', c.address],
                ]}
              />

              <RSectionTitle>Customer Contact Information</RSectionTitle>
              <table className="w-full border-collapse text-[11px]">
                <thead>
                  <tr>
                    <th className="border border-slate-800 px-2 py-1 text-left">Type</th>
                    <th className="border border-slate-800 px-2 py-1 text-left">Name</th>
                    <th className="border border-slate-800 px-2 py-1 text-left">Designation</th>
                    <th className="border border-slate-800 px-2 py-1 text-left">Mobile</th>
                    <th className="border border-slate-800 px-2 py-1 text-left">Email</th>
                  </tr>
                </thead>
                <tbody>
                  {seniorContact.name && (
                    <tr>
                      <td className="border border-slate-800 px-2 py-1">Senior Management</td>
                      <td className="border border-slate-800 px-2 py-1">{seniorContact.name}</td>
                      <td className="border border-slate-800 px-2 py-1">{seniorContact.designation}</td>
                      <td className="border border-slate-800 px-2 py-1">{seniorContact.mobile}</td>
                      <td className="border border-slate-800 px-2 py-1">{seniorContact.email}</td>
                    </tr>
                  )}
                  <tr>
                    <td className="border border-slate-800 px-2 py-1">Key Contact Person</td>
                    <td className="border border-slate-800 px-2 py-1">{keyContact.name}</td>
                    <td className="border border-slate-800 px-2 py-1">{keyContact.designation}</td>
                    <td className="border border-slate-800 px-2 py-1">{keyContact.mobile}</td>
                    <td className="border border-slate-800 px-2 py-1">{keyContact.email}</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-800 px-2 py-1">Finance Contact</td>
                    <td className="border border-slate-800 px-2 py-1">{financialContact.name}</td>
                    <td className="border border-slate-800 px-2 py-1">{financialContact.designation}</td>
                    <td className="border border-slate-800 px-2 py-1">{financialContact.mobile}</td>
                    <td className="border border-slate-800 px-2 py-1">{financialContact.email}</td>
                  </tr>
                </tbody>
              </table>

              <RSectionTitle>Customer Commercial Information</RSectionTitle>
              <RTable
                rows={[
                  ['Business Type', c.businessType],
                  ['Service Required', c.serviceRequired === 'BOTH' ? 'IB & OB' : c.serviceRequired === 'IB' ? 'Inbound (IB)' : c.serviceRequired === 'OB' ? 'Outbound (OB)' : ''],
                  ['Account Mode', c.accountMode],
                  ['Account Type', c.accountType === 'CREDIT CUSTOMER' ? 'Credit' : 'Cash'],
                  ['Credit Limit (TK)', c.creditLimitTk],
                  ['Credit Period (Days)', c.creditPeriodDays],
                  ['Area Name', c.area],
                  ['Zone Name', c.zone],
                ]}
              />

              {shipping.length > 0 && (
                <>
                  <RSectionTitle>Expected/Projected Shipping Details</RSectionTitle>
                  <table className="w-full border-collapse text-[11px]">
                    <thead>
                      <tr>
                        <th className="border border-slate-800 px-2 py-1 text-left">Shipment Type</th>
                        <th className="border border-slate-800 px-2 py-1 text-left">Country</th>
                        <th className="border border-slate-800 px-2 py-1 text-left">Avg Volume</th>
                        <th className="border border-slate-800 px-2 py-1 text-left">Weight(kg)</th>
                        <th className="border border-slate-800 px-2 py-1 text-left">Revenue(USD)</th>
                        <th className="border border-slate-800 px-2 py-1 text-left">Current Service Provider</th>
                      </tr>
                    </thead>
                    <tbody>
                      {shipping.map((s) => (
                        <tr key={s.id}>
                          <td className="border border-slate-800 px-2 py-1">{s.rateFor === 'Both' ? 'Import/Export' : s.rateFor?.toUpperCase()}</td>
                          <td className="border border-slate-800 px-2 py-1">{s.country}</td>
                          <td className="border border-slate-800 px-2 py-1">{s.volume}</td>
                          <td className="border border-slate-800 px-2 py-1">{s.weight}</td>
                          <td className="border border-slate-800 px-2 py-1">{s.revenue}</td>
                          <td className="border border-slate-800 px-2 py-1">{s.provider}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}

              {c.recNote && (
                <>
                  <RSectionTitle>Recommendation Note</RSectionTitle>
                  <p className="border border-slate-800 px-2 py-2 text-[11px] font-bold">{c.recNote}</p>
                </>
              )}

              <RSectionTitle>Approval</RSectionTitle>
              <table className="w-full border-collapse text-[11px] mb-3">
                <thead>
                  <tr>
                    <th className="border border-slate-800 px-2 py-1 text-left" style={{ width: '50%' }}>Approved Rate</th>
                    <th className="border border-slate-800 px-2 py-1 text-left">Rate Reference No:</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-slate-800 px-2 py-1">{c.approvedRate || (c.proposedRate ? 'Approved as Proposed' : '')}</td>
                    <td className="border border-slate-800 px-2 py-1 font-mono">{rateRefDisplay}</td>
                  </tr>
                </tbody>
              </table>

              <table className="w-full border-collapse text-[11px]">
                <thead>
                  <tr>
                    <th className="border border-slate-800 px-2 py-1 text-left">Rate Prepared By</th>
                    <th className="border border-slate-800 px-2 py-1 text-left">Recommended By</th>
                    <th className="border border-slate-800 px-2 py-1 text-left">Approved By</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-slate-800 px-2 py-1 min-h-[28px]">{c.recommendedBy?.name || ''}</td>
                    <td className="border border-slate-800 px-2 py-1">{c.recommendedBy?.name || ''}</td>
                    <td className="border border-slate-800 px-2 py-1"></td>
                  </tr>
                </tbody>
              </table>

              <p className="font-bold text-[11px] mt-6 mb-2">Approval Process:</p>
              <table className="w-full border-collapse text-[11px]">
                <thead>
                  <tr>
                    <th className="border border-slate-800 px-2 py-1 text-left">Rate Signed By</th>
                    <th className="border border-slate-800 px-2 py-1 text-left">Contract Signed By</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-slate-800 px-2 py-1 h-8"></td>
                    <td className="border border-slate-800 px-2 py-1 h-8"></td>
                  </tr>
                </tbody>
              </table>

              {c.accountProfileType === 'PROVISIONAL' && (
                <p className="text-center text-red-600 font-bold mt-6">PROVISIONAL ACCOUNT</p>
              )}
            </div>
          );
        })()}

         {data.type === 'profile' && (() => {
          const keyContact = getContactByType(c.contacts, 'KEY_CONTACT_PERSON');
          const financialContact = getContactByType(c.contacts, 'FINANCIAL_CONTACT');
          const shipping = (c.shippingDetails || [])[0] || {};
          const amountWords = numberToWordsBDT(c.creditLimitTk);

          return (
            <div className="text-slate-900">
              <p className="text-center font-bold text-base underline mb-3">Account Profile</p>

              <table className="ml-auto border border-slate-800 text-[10px] mb-3 print-avoid-break">
                <tbody>
                  <tr>
                    <td className="border border-slate-800 px-2 py-0.5 font-semibold whitespace-nowrap">Closing Date:</td>
                    <td className="border border-slate-800 px-2 py-0.5 w-32"></td>
                  </tr>
                  <tr>
                    <td className="border border-slate-800 px-2 py-0.5 font-semibold whitespace-nowrap">Effective Date:</td>
                    <td className="border border-slate-800 px-2 py-0.5"></td>
                  </tr>
                  <tr>
                    <td className="border border-slate-800 px-2 py-0.5 font-semibold whitespace-nowrap">Account No:</td>
                    <td className="border border-slate-800 px-2 py-0.5">{c.barcode}</td>
                  </tr>
                </tbody>
              </table>

              <div className="space-y-1.5 print-avoid-break">
                <PBox label="Company Name:" value={c.accountName} labelWidth="150px" />
                <PBox label="Name of Managing Partner:" value={c.managingPartnerName} labelWidth="180px" />
                <PBox label="Address:" value={c.address} labelWidth="150px" />
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2" style={{ flex: '0 0 230px' }}>
                    <span className="text-[10px] font-semibold shrink-0" style={{ width: '55px' }}>Phone:</span>
                    <span className="flex-1 border border-slate-800 px-2 py-0.5 text-[10px] min-h-[17px]">{c.phone}</span>
                  </div>
                  <div className="flex items-center gap-2" style={{ flex: '0 0 160px' }}>
                    <span className="text-[10px] font-semibold shrink-0" style={{ width: '35px' }}>Fax:</span>
                    <span className="flex-1 border border-slate-800 px-2 py-0.5 text-[10px] min-h-[17px]"></span>
                  </div>
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-[10px] font-semibold shrink-0" style={{ width: '50px' }}>e-mail:</span>
                    <span className="flex-1 border border-slate-800 px-2 py-0.5 text-[10px] min-h-[17px] text-center">{c.email}</span>
                  </div>
                </div>
              </div>

              <PSectionTitle>Customer Information</PSectionTitle>

              <div className="space-y-1.5 print-avoid-break">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-[10px] font-semibold shrink-0" style={{ width: '110px' }}>Contact person:</span>
                    <span className="flex-1 border border-slate-800 px-2 py-0.5 text-[10px] min-h-[17px]">{keyContact.name}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-[10px] font-semibold shrink-0" style={{ width: '90px' }}>Designation:</span>
                    <span className="flex-1 border border-slate-800 px-2 py-0.5 text-[10px] min-h-[17px]">{keyContact.designation}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2" style={{ flex: '0 0 230px' }}>
                    <span className="text-[10px] font-semibold shrink-0" style={{ width: '90px' }}>Phone (Cell):</span>
                    <span className="flex-1 border border-slate-800 px-2 py-0.5 text-[10px] min-h-[17px]">{keyContact.mobile}</span>
                  </div>
                  <div className="flex items-center gap-2" style={{ flex: '0 0 160px' }}>
                    <span className="text-[10px] font-semibold shrink-0" style={{ width: '35px' }}>Fax:</span>
                    <span className="flex-1 border border-slate-800 px-2 py-0.5 text-[10px] min-h-[17px]"></span>
                  </div>
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-[10px] font-semibold shrink-0" style={{ width: '50px' }}>e-mail:</span>
                    <span className="flex-1 border border-slate-800 px-2 py-0.5 text-[10px] min-h-[17px] text-center">{keyContact.email}</span>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-[10px] font-semibold shrink-0" style={{ width: '110px' }}>Accounts Person:</span>
                    <span className="flex-1 border border-slate-800 px-2 py-0.5 text-[10px] min-h-[17px]">{financialContact.name}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-[10px] font-semibold shrink-0" style={{ width: '90px' }}>Designation:</span>
                    <span className="flex-1 border border-slate-800 px-2 py-0.5 text-[10px] min-h-[17px]">{financialContact.designation}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2" style={{ flex: '0 0 230px' }}>
                    <span className="text-[10px] font-semibold shrink-0" style={{ width: '90px' }}>Phone (Cell):</span>
                    <span className="flex-1 border border-slate-800 px-2 py-0.5 text-[10px] min-h-[17px]">{financialContact.mobile}</span>
                  </div>
                  <div className="flex items-center gap-2" style={{ flex: '0 0 160px' }}>
                    <span className="text-[10px] font-semibold shrink-0" style={{ width: '35px' }}>Fax:</span>
                    <span className="flex-1 border border-slate-800 px-2 py-0.5 text-[10px] min-h-[17px]"></span>
                  </div>
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-[10px] font-semibold shrink-0" style={{ width: '50px' }}>e-mail:</span>
                    <span className="flex-1 border border-slate-800 px-2 py-0.5 text-[10px] min-h-[17px] text-center">{financialContact.email}</span>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-[10px] font-semibold shrink-0" style={{ width: '110px' }}>BIN Number:</span>
                    <span className="flex-1 border border-slate-800 px-2 py-0.5 text-[10px] min-h-[17px] text-center">{c.binNumber}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-[10px] font-semibold shrink-0" style={{ width: '90px' }}>TIN Number:</span>
                    <span className="flex-1 border border-slate-800 px-2 py-0.5 text-[10px] min-h-[17px] text-center">{c.tinNumber}</span>
                  </div>
                </div>
              </div>

              <PSectionTitle>Shipping Detail</PSectionTitle>

              <div className="space-y-1.5 print-avoid-break">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2" style={{ flex: '0 0 130px' }}>
                    <span className="text-[10px] font-semibold shrink-0" style={{ width: '52px' }}>Volume:</span>
                    <span className="flex-1 border border-slate-800 px-2 py-0.5 text-[10px] min-h-[17px] text-center">{shipping.volume}</span>
                  </div>
                  <div className="flex items-center gap-2" style={{ flex: '0 0 130px' }}>
                    <span className="text-[10px] font-semibold shrink-0" style={{ width: '52px' }}>Weight:</span>
                    <span className="flex-1 border border-slate-800 px-2 py-0.5 text-[10px] min-h-[17px] text-center">{shipping.weight}</span>
                  </div>
                  <div className="flex items-center gap-2" style={{ flex: '0 0 160px' }}>
                    <span className="text-[10px] font-semibold shrink-0" style={{ width: '65px' }}>Rev. ($):</span>
                    <span className="flex-1 border border-slate-800 px-2 py-0.5 text-[10px] min-h-[17px] text-center">{shipping.revenue}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-[10px] font-semibold shrink-0" style={{ width: '65px' }}>P.Carrier:</span>
                    <span className="flex-1 border border-slate-800 px-2 py-0.5 text-[10px] min-h-[17px] text-center">{c.preferredCarrier}</span>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-[10px] font-semibold shrink-0" style={{ width: '95px' }}>Destinations:</span>
                    <span className="flex-1 border border-slate-800 px-2 py-0.5 text-[10px] min-h-[17px]">{c.destinations}</span>
                  </div>
                  <div className="flex items-center gap-2" style={{ flex: '0 0 260px' }}>
                    <span className="text-[10px] font-semibold shrink-0" style={{ width: '110px' }}>Nature of Business:</span>
                    <span className="flex-1 border border-slate-800 px-2 py-0.5 text-[10px] min-h-[17px] text-center">{c.natureOfBusiness}</span>
                  </div>
                </div>
              </div>

              <PSectionTitle>Account Detail</PSectionTitle>

              <div className="space-y-1.5 print-avoid-break">
                <div className="flex items-center gap-6 flex-wrap">
                  <POptionRow
                    label="Service Required:"
                    labelWidth="115px"
                    options={[{ value: 'OB', label: 'OB' }, { value: 'IB', label: 'IB' }]}
                    isSelected={(v) => c.serviceRequired === v || c.serviceRequired === 'BOTH'}
                  />
                  <POptionRow
                    label="Type:"
                    labelWidth="45px"
                    options={[
                      { value: 'NEW_GAIN', label: 'N. Gain' },
                      { value: 'REGAIN', label: 'R.Gain' },
                      { value: 'AC_UPDATE', label: 'A/C Update' },
                    ]}
                    isSelected={(v) => c.gainType === v}
                  />
                  <POptionRow
                    label="Mode:"
                    labelWidth="48px"
                    options={[{ value: 'EX', label: 'Ex' }, { value: 'FR', label: 'FR' }]}
                    isSelected={(v) => c.financeMode === v}
                  />
                </div>

                <div className="flex items-center gap-6 flex-wrap">
                  <POptionRow
                    label="Type of Account:"
                    labelWidth="115px"
                    options={[{ value: 'CASH', label: 'Cash' }, { value: 'CREDIT CUSTOMER', label: 'Credit' }]}
                    isSelected={(v) => c.accountType === v}
                  />
                  <div className="flex items-center gap-2" style={{ flex: '0 0 190px' }}>
                    <span className="text-[10px] font-semibold shrink-0" style={{ width: '35px' }}>Area</span>
                    <span className="flex-1 border border-slate-800 px-2 py-0.5 text-[10px] min-h-[17px] text-center">{c.area}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-[10px] font-semibold shrink-0" style={{ width: '40px' }}>Zone:</span>
                    <span className="flex-1 border border-slate-800 px-2 py-0.5 text-[10px] min-h-[17px] text-center">{c.zone}</span>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-[10px] font-semibold shrink-0" style={{ width: '110px' }}>Rate Ref. No.:</span>
                    <span className="flex-1 border border-slate-800 px-2 py-0.5 text-[10px] min-h-[17px] text-center">{buildRateRefs(c).join(' / ')}</span>
                  </div>
                  <div className="flex items-center gap-2" style={{ flex: '0 0 220px' }}>
                    <span className="text-[10px] font-semibold shrink-0" style={{ width: '40px' }}>Date:</span>
                    <span className="flex-1 border border-slate-800 px-2 py-0.5 text-[10px] min-h-[17px] text-center">{formatPrintDate(c.createdAt)}</span>
                  </div>
                </div>

                <div className="flex items-start gap-6">
                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-semibold shrink-0" style={{ width: '120px' }}>Amount Limit (BDT):</span>
                      <span className="flex-1 border border-slate-800 px-2 py-0.5 text-[10px] min-h-[17px] text-center">{c.creditLimitTk}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-semibold shrink-0" style={{ width: '120px' }}>(In Word):</span>
                      <span className="flex-1 border border-slate-800 px-2 py-0.5 text-[10px] min-h-[17px]">{amountWords}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2" style={{ flex: '0 0 200px' }}>
                    <span className="text-[10px] font-semibold shrink-0" style={{ width: '75px' }}>Time Limit:</span>
                    <span className="flex-1 border border-slate-800 px-2 py-0.5 text-[10px] min-h-[17px] text-center">{c.creditPeriodDays}</span>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-[10px] font-semibold shrink-0" style={{ width: '135px' }}>Account Created By:</span>
                    <span className="flex-1 border border-slate-800 px-2 py-0.5 text-[10px] min-h-[17px] text-center">{c.recommendedBy?.name}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-[10px] font-semibold shrink-0" style={{ width: '135px' }}>Account Handled by:</span>
                    <span className="flex-1 border border-slate-800 px-2 py-0.5 text-[10px] min-h-[17px] text-center">{c.handledBy?.name}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-semibold shrink-0" style={{ width: '150px' }}>Special Instructions: (If Any)</span>
                  <span className="flex-1 border border-slate-800 px-2 py-0.5 text-[10px] min-h-[17px]">{c.specialInstructions}</span>
                </div>

                <div className="flex items-center gap-10">
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-[10px] font-semibold shrink-0" style={{ width: '80px' }}>Checked By:</span>
                    <span className="flex-1 border border-slate-800 px-2 py-0.5 text-[10px] min-h-[17px]"></span>
                  </div>
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-[10px] font-semibold shrink-0" style={{ width: '95px' }}>Approved By:</span>
                    <span className="flex-1 border border-slate-800 px-2 py-0.5 text-[10px] min-h-[17px]"></span>
                  </div>
                </div>
              </div>

              <PSectionTitle>Distributed Departments</PSectionTitle>

              <div className="space-y-1.5 print-avoid-break">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-[10px] font-semibold shrink-0" style={{ width: '45px' }}>Sales:</span>
                    <span className="flex-1 border border-slate-800 px-2 py-0.5 text-[10px] min-h-[17px]"></span>
                  </div>
                  <div className="flex items-center gap-2" style={{ flex: '0 0 190px' }}>
                    <span className="text-[10px] font-semibold shrink-0" style={{ width: '65px' }}>Cr. Control:</span>
                    <span className="flex-1 border border-slate-800 px-2 py-0.5 text-[10px] min-h-[17px]"></span>
                  </div>
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-[10px] font-semibold shrink-0" style={{ width: '65px' }}>Accounts:</span>
                    <span className="flex-1 border border-slate-800 px-2 py-0.5 text-[10px] min-h-[17px]"></span>
                  </div>
                </div>
                <div className="flex items-center gap-2" style={{ maxWidth: '260px' }}>
                  <span className="text-[10px] font-semibold shrink-0" style={{ width: '45px' }}>Ops:</span>
                  <span className="flex-1 border border-slate-800 px-2 py-0.5 text-[10px] min-h-[17px]"></span>
                </div>
              </div>

              {c.accountProfileType === 'PROVISIONAL' && (
                <p className="text-center text-red-600 font-bold text-[11px] mt-2">PROVISIONAL ACCOUNT</p>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
};

export default PrintTemplate;