// src/Pages/modules/sales/components/PrintTemplate.jsx
import React from 'react';
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
            <p className="text-right text-xs text-slate-600 mt-2 font-mono bg-slate-100 px-2 py-1 inline-block border font-bold text-slate-800">
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

        {data.type === 'recommendation' && (
          <div className="text-center mt-20">
            <h2 className="text-2xl font-bold">Recommendation Form Printout</h2>
            {c.accountProfileType === 'PROVISIONAL' && (
              <p className="text-red-600 font-bold mt-4">PROVISIONAL ACCOUNT</p>
            )}
          </div>
        )}

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