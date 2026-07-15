// src/Pages/modules/sales/constants/formOptions.js
export const AREA_OPTIONS = Object.freeze([
  'Gulshan-1',
  'Gulshan-2',
  'Banani',
  'Uttara',
  'Motijheel',
]);

export const ZONE_OPTIONS = Object.freeze([
  'Dhaka South',
  'Dhaka North',
  'Old Dhaka',
]);

export const BUSINESS_TYPE_OPTIONS = Object.freeze([
  'Leather',
  'Garments',
  'Textile',
  'Electronics',
  'Pharmaceuticals',
]);

export const ACCOUNT_MODE_OPTIONS = Object.freeze(['Express', 'Fair']);

export const ACCOUNT_TYPE_OPTIONS = Object.freeze(['CREDIT CUSTOMER', 'CASH']);

export const SERVICE_REQUIRED_OPTIONS = Object.freeze(['IB', 'OB', 'BOTH']);

export const SHIPMENT_TYPE_OPTIONS = Object.freeze(['Document', 'Non-Document', 'Others']);

export const RATE_FOR_OPTIONS = Object.freeze(['Import', 'Export', 'Both']);

export const buildEmptyShippingRow = () => ({
  shipmentType: [],
  shipmentTypeOther: '',
  rateFor: '',
  country: '',
  volume: '',
  weight: '',
  revenue: '',
  provider: '',
});

export const DOCUMENT_TYPE_OPTIONS = Object.freeze([
  'Trade License',
  'LC (Letter of Credit)',
  'TIN Certificate',
  'BIN Certificate',
  'NID / Passport',
  'Other',
]);

export const GAIN_TYPE_OPTIONS = Object.freeze([
  { value: 'NEW_GAIN', label: 'N. Gain' },
  { value: 'REGAIN', label: 'R. Gain' },
  { value: 'AC_UPDATE', label: 'A/C Update' },
]);

export const FINANCE_MODE_OPTIONS = Object.freeze([
  { value: 'EX', label: 'Ex' },
  { value: 'FR', label: 'FR' },
]);

export const SIGNATURE_LIBRARY = Object.freeze({
  LM: '\n\n___________________________\nLine Manager\n[DIGITAL SIGNATURE: AUTH-LM-7738]\nMilex Logistics Auth. Signatory',
  SALES: '\n\n___________________________\nSales Coordinator\n[DIGITAL SIGNATURE: AUTH-SC-9912]\nMilex Logistics',
});

