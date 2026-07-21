// src/Components/utils/validators.js
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MOBILE_REGEX = /^\+?[0-9]{7,15}$/;
const BARCODE_REGEX = /^[A-Z0-9]{5,20}$/;

export const isRequired = (value) => value !== null && value !== undefined && String(value).trim().length > 0;

export const isValidEmail = (value) => typeof value === 'string' && EMAIL_REGEX.test(value.trim()) && value.length <= 254;

export const isValidMobile = (value) => typeof value === 'string' && MOBILE_REGEX.test(value.trim());

export const isValidBarcode = (value) => typeof value === 'string' && BARCODE_REGEX.test(value.trim());

export const isPositiveNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) && num >= 0;
};

export const isWithinRange = (value, min, max) => {
  const num = Number(value);
  return Number.isFinite(num) && num >= min && num <= max;
};

export const isValidCreditPeriod = (days) => {
  const num = Number(days);
  return Number.isFinite(num) && num >= 1 && num <= 90;
};

export const validateRecommendationStep1 = (form) => {
  const errors = {};
  if (!isRequired(form.accountName)) errors.accountName = 'Account name is required';
  if (!isRequired(form.address)) errors.address = 'Address is required';
  if (!isValidMobile(form.mobile)) errors.mobile = 'Valid mobile number is required';
  if (!isValidEmail(form.email)) errors.email = 'Valid email is required';
  if (!isRequired(form.businessType)) errors.businessType = 'Business type is required';
  return { valid: Object.keys(errors).length === 0, errors };
};

export const validateShippingRow = (row) => {
  const errors = {};
  if (!Array.isArray(row.shipmentType) || row.shipmentType.length === 0) errors.shipmentType = 'Select at least one shipment type';
  if ((row.shipmentType || []).includes('Others') && !isRequired(row.shipmentTypeOther)) {
    errors.shipmentTypeOther = 'Specify the other shipment type';
  }
  if (!isRequired(row.rateFor) || row.rateFor === 'Select Import or Export') errors.rateFor = 'Rate direction is required';
  if (!isRequired(row.country) || row.country === 'Select country') errors.country = 'Country is required';
  if (!isPositiveNumber(row.volume)) errors.volume = 'Valid volume is required';
  if (!isPositiveNumber(row.weight)) errors.weight = 'Valid weight is required';
  if (!isPositiveNumber(row.revenue)) errors.revenue = 'Valid revenue is required';
  if (!isRequired(row.provider)) errors.provider = 'Current service provider is required';
  return { valid: Object.keys(errors).length === 0, errors };
};

export const isValidDateString = (value) => {
  if (typeof value !== 'string' || !value) return false;
  const d = new Date(value);
  return !Number.isNaN(d.getTime());
};