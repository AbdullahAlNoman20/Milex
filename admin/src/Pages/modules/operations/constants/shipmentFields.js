// src/Pages/modules/operations/constants/shipmentFields.js
export const PARTY_ADDRESS_FIELDS = Object.freeze([
  { key: 'companyName', label: 'Company Name', type: 'text', required: true, placeholder: 'Advance Denim Co Ltd', help: 'Full legal / registered name of the company.' },
  { key: 'contactPerson', label: 'Contact Person', type: 'text', required: true, placeholder: 'Bonnie Zhang', help: 'Name of the person to contact about this shipment.' },
  { key: 'contactPhone', label: 'Contact Phone', type: 'tel', required: true, placeholder: '+8801711223344', help: 'Include the country code, e.g. +880 for Bangladesh.' },
  { key: 'contactEmail', label: 'Contact Email', type: 'email', required: true, placeholder: 'contact@company.com', help: 'Used for shipment notifications and document delivery.' },
  { key: 'address', label: 'Address', type: 'textarea', required: true, placeholder: 'House 7, Ground Floor, Road 17, Block-E, Banani', help: 'Full street address including building / road / block.' },
  { key: 'city', label: 'City', type: 'text', required: true, placeholder: 'Dhaka', help: 'City or town name.' },
  { key: 'postCode', label: 'Post / Zip Code', type: 'text', required: false, placeholder: '1213', help: 'Postal code, if applicable.' },
  { key: 'country', label: 'Country', type: 'text', required: true, placeholder: 'Bangladesh', help: 'Full country name.' },
]);

export const PARCEL_DETAIL_FIELDS = Object.freeze([
  { key: 'shipmentContents', label: 'Shipment Contents', type: 'textarea', required: true, placeholder: 'Cotton Fabric Rolls', help: 'General description of what is being shipped.' },
  { key: 'pieces', label: 'No. of Pieces', type: 'number', required: true, placeholder: '4', help: 'Total number of individual pieces / items.' },
  { key: 'weightKg', label: 'Weight (KG)', type: 'number', required: true, placeholder: '29.5', help: 'Actual gross weight in kilograms.' },
  { key: 'cartons', label: 'No. of Cartons', type: 'number', required: true, placeholder: '1', help: 'Number of cartons / boxes used for packing.' },
  { key: 'remarks', label: 'Remarks', type: 'textarea', required: false, placeholder: 'Please approve for SS27', help: 'Any special instruction or note for this shipment.' },
]);

export const AWB_HEADER_FIELDS = Object.freeze([
  { key: 'awbNumber', label: 'AWB / CN Number', type: 'text', required: true, placeholder: 'MLE-260763', help: 'Use the Generate button, or enter a specific AWB number.' },
  { key: 'refNo', label: 'Reference No.', type: 'text', required: true, placeholder: '260763', help: 'Internal reference number used for this booking.' },
  { key: 'costCarriedBy', label: 'Cost Carried By', type: 'text', required: true, placeholder: 'KENPARK BANGLADESH APPAREL PVT LIMITED K-2', help: 'Company responsible for paying the shipment charges.' },
  { key: 'bookingDate', label: 'Booking Date', type: 'date', required: true, help: 'Date the shipment was booked.' },
  { key: 'shipmentMode', label: 'Shipment Mode', type: 'select', options: ['EXPORT', 'IMPORT'], required: true, help: 'Whether this shipment is leaving (Export) or entering (Import) Bangladesh.' },
  { key: 'clientEmail', label: 'Client Portal Email (optional)', type: 'email', required: false, placeholder: 'client@milex.local', help: 'Links this shipment to a client login so they can track it themselves.' },
]);

export const DOCUMENT_CHECKLIST = Object.freeze([
  'Trade License',
  'LC (Letter of Credit)',
  'TIN Certificate',
  'BIN Certificate',
  'NID / Passport',
  'Other',
]);

export const AWB_SHIPMENT_TYPE_OPTIONS = Object.freeze(['DOCUMENT', 'NON_DOCUMENT']);
export const PAYMENT_PARTY_OPTIONS = Object.freeze(['Sender', 'Recipient', 'Third Party']);
export const PACKAGING_OPTIONS = Object.freeze(['Envelope', 'Pouch', 'Carton']);
export const SERVICE_OPTIONS = Object.freeze(['Express', 'Premium', 'Special', 'e-Parcel']);
export const CURRENCY_OPTIONS = Object.freeze(['USD', 'BDT', 'GBP', 'EUR']);

export const emptyInvoiceItem = () => ({ description: '', hsCode: '', pcs: '', unitCost: '' });