// src/Pages/modules/sales/components/PrintTemplate.jsx

import { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import { Printer } from 'lucide-react';
import { escapeHtml } from '../../../../Components/utils/sanitize';

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

const PrintTemplate = ({ data, onClose }) => {
  useEffect(() => {
    if (!data) return undefined;
    // Skip the extra manual "Print Document" click — open the browser's
    // print dialog automatically once this preview has painted.
    const timer = setTimeout(() => window.print(), 60);
    return () => clearTimeout(timer);
  }, [data]);

  if (!data) return null;
  const c = data.customer;

  return (
    <div className="fixed inset-0 z-50 bg-slate-800 overflow-y-auto p-8 flex flex-col items-center print:static print:h-auto print:min-h-0 print:p-0 print:bg-white print:block print:overflow-visible">
      <style>{`
        @media print {
          @page { size: A4; margin: 10mm; }
          .print-avoid-break { break-inside: avoid; page-break-inside: avoid; }
        }
      `}</style>
      <div className="print:hidden w-full max-w-4xl bg-slate-900 rounded-lg p-4 flex justify-between items-center mb-6 shadow-xl">
        <p className="text-white font-bold text-sm">Document Print Preview</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="bg-slate-700 text-white px-5 py-2 rounded text-xs font-bold hover:bg-slate-600 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="bg-emerald-600 text-white px-5 py-2 rounded text-xs font-bold shadow-md hover:bg-emerald-700 transition flex items-center"
          >
            <Printer size={14} className="mr-2" /> Print Document
          </button>
        </div>
      </div>

     <div className="bg-white w-full max-w-[210mm] min-h-[297mm] text-black p-12 shadow-2xl relative print:shadow-none print:m-0 print:p-5 print:w-full print:max-w-none print:min-h-0">
        {data.type !== 'profile' && (
          <div className="flex justify-between items-end border-b-2 border-slate-800 pb-4 mb-8">
            <h1 className="text-4xl font-black text-emerald-800 italic tracking-tighter">MILEX</h1>
            <p className="text-right text-xs  mt-2 font-mono bg-slate-100 px-2 py-1 inline-block border font-bold text-slate-800">
              ID: {escapeHtml(c.barcode)}
            </p>
          </div>
        )}

        {data.type === 'offer' && (
          <div className="space-y-4 text-sm whitespace-pre-wrap leading-relaxed">{c.offerText}</div>
        )}

        {data.type === 'agreement' && (
          <div className="space-y-4 text-sm whitespace-pre-wrap leading-relaxed">{c.agreementText}</div>
        )}

        {data.type === 'recommendation' && (() => {
          const keyContact = getContactByType(c.contacts, 'KEY_CONTACT_PERSON');
          const financialContact = getContactByType(c.contacts, 'FINANCIAL_CONTACT');
          const seniorContact = getContactByType(c.contacts, 'SENIOR_MANAGEMENT');
          const shipping = c.shippingDetails || [];
          const rateRefDisplay = c.rateRef ? `${c.rateRef}${c.revision > 0 ? `(Revised-${c.revision})` : ''}` : '';

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
                  ['Service Required', c.serviceRequired === 'BOTH' ? 'Inbound (IB) / Outbound (OB)' : c.serviceRequired === 'IB' ? 'Inbound (IB)' : c.serviceRequired === 'OB' ? 'Outbound (OB)' : ''],
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
                    <span className="flex-1 border border-slate-800 px-2 py-0.5 text-[10px] min-h-[17px] text-center">{c.rateRef}</span>
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