// src/Pages/modules/operations/constants/shipmentStatus.js
import { OPERATIONS_ROLES, OPERATIONS_ROLE_LABELS } from './operationsRoles';

export const SHIPMENT_MODE = Object.freeze({
  EXPORT: 'EXPORT',
  IMPORT: 'IMPORT',
});

export const SHIPMENT_TYPE = Object.freeze({
  DOCUMENT: 'DOCUMENT',
  NON_DOCUMENT: 'NON_DOCUMENT',
});

// Standard International Courier Tracking Sequence — EXPORT
// description = sub-activities under each stage, per Milex's Export Tracking Update Sequence doc
export const EXPORT_STATUS_SEQUENCE = Object.freeze([
  { code: 'BOOKED', label: 'Booked', description: 'Shipment received from customer; AWB/Tracking Number generated; Invoice, Packing List & required documents collected.' },
  { code: 'PICKED_UP', label: 'Picked Up', description: 'Pickup completed from shipper as per booking.' },
  { code: 'RECEIVED_AT_ORIGIN_HUB', label: 'Received at Origin Hub', description: 'Shipment received at origin HUB Operations; weight & dimension verified; shipment sorted.' },
  { code: 'EXPORT_DOCUMENTATION', label: 'Export Documentation', description: 'Export documents prepared — Commercial Invoice, Packing List, Export B/E, and CCIE / CO / NOC where applicable.' },
  { code: 'EXPORT_CUSTOMS_CLEARANCE', label: 'Export Customs Clearance', description: 'Export B/E submitted; customs assessment in progress; customs approval / release.' },
  { code: 'MANIFESTED', label: 'Manifested', description: 'Shipment manifested; final AWB and manifest prepared and shared with the airline.' },
  { code: 'HANDED_OVER_TO_AIRLINE', label: 'Handed Over to Airline', description: 'Airline space booked, MAWB prepared, cargo handed over to airline / ground handling agent for security screening and acceptance.' },
  { code: 'DEPARTED_ORIGIN', label: 'Departed Origin', description: 'Export manifest / EGM completed; shipment departed from the origin airport.' },
  { code: 'ARRIVED_AT_TRANSIT_HUB', label: 'Arrived at Transit Hub', description: 'Arrived at transit hub; hub sorting completed.' },
  { code: 'IN_TRANSIT', label: 'In Transit', description: 'Connected to the destination flight; departed the transit hub.' },
  { code: 'ARRIVED_AT_DESTINATION', label: 'Arrived at Destination', description: 'Cargo arrived at the destination airport and received by the airline / handling agent.' },
  { code: 'IMPORT_CUSTOMS_CLEARANCE', label: 'Import Customs Clearance', description: 'Import declaration / customs clearance in progress; duties and VAT assessed where applicable.' },
  { code: 'CUSTOMS_RELEASED', label: 'Customs Released', description: 'Customs clearance completed and cargo released.' },
  { code: 'HANDED_OVER_TO_LAST_MILE', label: 'Handed Over to Last Mile', description: 'Shipment handed over to the local delivery network at destination.' },
  { code: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', description: 'Shipment dispatched for final delivery to the consignee address.' },
  { code: 'DELIVERED', label: 'Delivered', description: 'Shipment delivered to the consignee.' },
]);

// Standard Shipment Tracking Sequence — IMPORT
// description = Process / Activity column, per Milex's Import Tracking Update Sequence doc
export const IMPORT_STATUS_SEQUENCE = Object.freeze([
  { code: 'BOOKING_CONFIRMED', label: 'Booking Confirmed', description: 'Customer shipment booking confirmed.' },
  { code: 'PICKED_UP', label: 'Shipment Picked Up / Cargo Received', description: 'Cargo received from supplier; shipment collected from shipper.' },
  { code: 'RECEIVED_AT_ORIGIN_WAREHOUSE', label: 'Received at Origin Warehouse', description: 'Shipment received at the origin warehouse.' },
  { code: 'EXPORT_DOCUMENTATION', label: 'Documents Under Process', description: 'Export documents (Invoice, Packing List, AWB, and others) received and under process.' },
  { code: 'EXPORT_CUSTOMS_CLEARANCE', label: 'Export Customs Cleared', description: 'Origin-side export customs processing completed.' },
  { code: 'DEPARTED_ORIGIN', label: 'Departed from Origin', description: 'Shipment ready and departed from the origin airport.' },
  { code: 'IN_TRANSIT', label: 'In Transit', description: 'Shipment in transit / transshipment, moving toward the destination.' },
  { code: 'ARRIVED_AT_DESTINATION', label: 'Arrived at Destination', description: 'Shipment arrived at the destination airport.' },
  { code: 'IMPORT_DOCUMENTATION', label: 'Import Documents Received / Under Process', description: 'AWB, Manifest, Invoice, Packing List and other import documents under process.' },
  { code: 'CUSTOMS_DECLARATION', label: 'Customs Clearance in Progress', description: 'Import customs declaration / B/E submission in progress.' },
  { code: 'CUSTOMS_CLEARANCE', label: 'Under Customs Clearance', description: 'Customs assessment / examination in progress, if applicable.' },
  { code: 'CUSTOMS_RELEASED', label: 'Customs Cleared / Released', description: 'Customs clearance completed and cargo released.' },
  { code: 'RECEIVED_AT_DESTINATION_HUB', label: 'Received at Destination HUB', description: 'Cargo moved to the destination HUB / warehouse.' },
  { code: 'OUT_FOR_DELIVERY', label: 'Out for Delivery / Delivery Arranged', description: 'Delivery arrangement completed; shipment dispatched for final delivery.' },
  { code: 'DELIVERED', label: 'Delivered', description: 'Shipment delivered to the consignee.' },
  { code: 'POD_UPDATED', label: 'POD Updated / Completed', description: 'Proof of Delivery uploaded and confirmed.' },
]);

// "Recommended IT Tracking Flow" / "Short Flow" reference chains from the source docs
export const SHORT_FLOW_BY_MODE = Object.freeze({
  [SHIPMENT_MODE.EXPORT]:
    'Booking → Cargo Receive → Documents → Export B/E → Customs Clearance → Airline Booking → Cargo Handover → AWB/Manifest → EGM → Flight Departure → Arrival → Customs Clearance → Delivery',
  [SHIPMENT_MODE.IMPORT]:
    'Booking → Pickup → Origin Received → Documentation → Export Clearance → Departed Origin → In Transit → Arrived Destination → Import Documentation → Customs Clearance → Customs Released → Destination HUB → Out for Delivery → Delivered → POD',
});

export const getShortFlow = (mode) => SHORT_FLOW_BY_MODE[mode] || '';

// Groups the flat status sequence into logical business stages, used to
// render the tracking timeline as a collapsible accordion instead of one
// long scrolling list.
export const EXPORT_STAGE_GROUPS = Object.freeze([
  { title: 'Booking & Origin', codes: ['BOOKED', 'PICKED_UP', 'RECEIVED_AT_ORIGIN_HUB'] },
  { title: 'Documentation & Customs', codes: ['EXPORT_DOCUMENTATION', 'EXPORT_CUSTOMS_CLEARANCE'] },
  { title: 'Airline & Transit', codes: ['MANIFESTED', 'HANDED_OVER_TO_AIRLINE', 'DEPARTED_ORIGIN', 'ARRIVED_AT_TRANSIT_HUB', 'IN_TRANSIT'] },
  { title: 'Destination Processing', codes: ['ARRIVED_AT_DESTINATION', 'IMPORT_CUSTOMS_CLEARANCE', 'CUSTOMS_RELEASED'] },
  { title: 'Last Mile Delivery', codes: ['HANDED_OVER_TO_LAST_MILE', 'OUT_FOR_DELIVERY', 'DELIVERED'] },
]);

export const IMPORT_STAGE_GROUPS = Object.freeze([
  { title: 'Booking & Origin', codes: ['BOOKING_CONFIRMED', 'PICKED_UP', 'RECEIVED_AT_ORIGIN_WAREHOUSE'] },
  { title: 'Export-Side Processing', codes: ['EXPORT_DOCUMENTATION', 'EXPORT_CUSTOMS_CLEARANCE', 'DEPARTED_ORIGIN'] },
  { title: 'Transit', codes: ['IN_TRANSIT', 'ARRIVED_AT_DESTINATION'] },
  { title: 'Import Documentation & Customs', codes: ['IMPORT_DOCUMENTATION', 'CUSTOMS_DECLARATION', 'CUSTOMS_CLEARANCE', 'CUSTOMS_RELEASED'] },
  { title: 'Destination & Delivery', codes: ['RECEIVED_AT_DESTINATION_HUB', 'OUT_FOR_DELIVERY', 'DELIVERED', 'POD_UPDATED'] },
]);

export const getStageGroups = (mode) => (mode === 'IMPORT' ? IMPORT_STAGE_GROUPS : EXPORT_STAGE_GROUPS);

// Role ownership: which role is responsible for PERFORMING the activity that
// produces each status code. This drives both permissions (who is allowed to
// advance a shipment past its current status) and the "Waiting for..." badge
// (who the shipment is currently sitting with).
//
// Export flow (BD → abroad): Client books → Operations Head approves/creates
// AWB → Domestic Administrator handles everything up to Arrived at
// Destination → Foreign Administrator clears customs abroad and delivers.
//
// Import flow (abroad → BD): reversed — Foreign Administrator handles the
// origin side abroad up to Arrived at Destination → Domestic Administrator
// clears customs in Bangladesh and delivers.
const EXPORT_STATUS_OWNER = Object.freeze({
  BOOKED: OPERATIONS_ROLES.OPERATIONS_HEAD,
  PICKED_UP: OPERATIONS_ROLES.DOMESTIC_ADMIN,
  RECEIVED_AT_ORIGIN_HUB: OPERATIONS_ROLES.DOMESTIC_ADMIN,
  EXPORT_DOCUMENTATION: OPERATIONS_ROLES.DOMESTIC_ADMIN,
  EXPORT_CUSTOMS_CLEARANCE: OPERATIONS_ROLES.DOMESTIC_ADMIN,
  MANIFESTED: OPERATIONS_ROLES.DOMESTIC_ADMIN,
  HANDED_OVER_TO_AIRLINE: OPERATIONS_ROLES.DOMESTIC_ADMIN,
  DEPARTED_ORIGIN: OPERATIONS_ROLES.DOMESTIC_ADMIN,
  ARRIVED_AT_TRANSIT_HUB: OPERATIONS_ROLES.DOMESTIC_ADMIN,
  IN_TRANSIT: OPERATIONS_ROLES.DOMESTIC_ADMIN,
  ARRIVED_AT_DESTINATION: OPERATIONS_ROLES.DOMESTIC_ADMIN,
  IMPORT_CUSTOMS_CLEARANCE: OPERATIONS_ROLES.FOREIGN_ADMIN,
  CUSTOMS_RELEASED: OPERATIONS_ROLES.FOREIGN_ADMIN,
  HANDED_OVER_TO_LAST_MILE: OPERATIONS_ROLES.FOREIGN_ADMIN,
  OUT_FOR_DELIVERY: OPERATIONS_ROLES.FOREIGN_ADMIN,
  DELIVERED: OPERATIONS_ROLES.FOREIGN_ADMIN,
});

const IMPORT_STATUS_OWNER = Object.freeze({
  BOOKING_CONFIRMED: OPERATIONS_ROLES.OPERATIONS_HEAD,
  PICKED_UP: OPERATIONS_ROLES.FOREIGN_ADMIN,
  RECEIVED_AT_ORIGIN_WAREHOUSE: OPERATIONS_ROLES.FOREIGN_ADMIN,
  EXPORT_DOCUMENTATION: OPERATIONS_ROLES.FOREIGN_ADMIN,
  EXPORT_CUSTOMS_CLEARANCE: OPERATIONS_ROLES.FOREIGN_ADMIN,
  DEPARTED_ORIGIN: OPERATIONS_ROLES.FOREIGN_ADMIN,
  IN_TRANSIT: OPERATIONS_ROLES.FOREIGN_ADMIN,
  ARRIVED_AT_DESTINATION: OPERATIONS_ROLES.FOREIGN_ADMIN,
  IMPORT_DOCUMENTATION: OPERATIONS_ROLES.DOMESTIC_ADMIN,
  CUSTOMS_DECLARATION: OPERATIONS_ROLES.DOMESTIC_ADMIN,
  CUSTOMS_CLEARANCE: OPERATIONS_ROLES.DOMESTIC_ADMIN,
  CUSTOMS_RELEASED: OPERATIONS_ROLES.DOMESTIC_ADMIN,
  RECEIVED_AT_DESTINATION_HUB: OPERATIONS_ROLES.DOMESTIC_ADMIN,
  OUT_FOR_DELIVERY: OPERATIONS_ROLES.DOMESTIC_ADMIN,
  DELIVERED: OPERATIONS_ROLES.DOMESTIC_ADMIN,
  POD_UPDATED: OPERATIONS_ROLES.DOMESTIC_ADMIN,
});

// Role permitted to mark a shipment as HAVING REACHED this status code.
export const getStatusOwnerRole = (mode, code) => {
  const map = mode === 'IMPORT' ? IMPORT_STATUS_OWNER : EXPORT_STATUS_OWNER;
  return map[code] || null;
};

// The role who must act next, i.e. the owner of the step immediately after
// the shipment's current status.
export const getNextStepOwnerRole = (mode, currentStatusCode) => {
  const sequence = getSequenceForMode(mode);
  const idx = sequence.findIndex((s) => s.code === currentStatusCode);
  if (idx === -1 || idx === sequence.length - 1) return null;
  return getStatusOwnerRole(mode, sequence[idx + 1].code);
};

// All status labels a given role is permitted to set within a mode — used
// to tell each admin exactly what they can and can't touch, per mode.
export const getOwnedStageLabels = (role, mode) => {
  const sequence = getSequenceForMode(mode);
  return sequence.filter((s) => getStatusOwnerRole(mode, s.code) === role).map((s) => s.label);
};

export const getWaitingForInfo = (mode, statusCode, exceptionCode) => {
  if (exceptionCode) {
    return { text: `Stuck: ${getExceptionLabel(exceptionCode)}`, isNegative: true, ownerRole: null };
  }
  const sequence = getSequenceForMode(mode);
  const isLast = sequence[sequence.length - 1]?.code === statusCode;
  if (isLast) {
    return { text: 'Completed', isNegative: false, isComplete: true, ownerRole: null };
  }
  const ownerRole = getNextStepOwnerRole(mode, statusCode);
  const roleLabel = ownerRole ? OPERATIONS_ROLE_LABELS[ownerRole] : null;
  return {
    text: roleLabel ? `Waiting for ${roleLabel} Action` : 'In Progress',
    isNegative: false,
    isComplete: false,
    ownerRole,
  };
};

// Which upcoming step indices (strictly after currentIndex) is this role
// allowed to move the shipment into — a consecutive run starting right
// after the current status, stopping the moment ownership shifts away.
export const getAllowedNextSteps = (role, mode, currentIndex) => {
  const sequence = getSequenceForMode(mode);
  const allowed = [];
  for (let i = currentIndex + 1; i < sequence.length; i += 1) {
    if (getStatusOwnerRole(mode, sequence[i].code) !== role) break;
    allowed.push(i);
  }
  return allowed;
};

export const STATUS_SEQUENCE_BY_MODE = Object.freeze({
  [SHIPMENT_MODE.EXPORT]: EXPORT_STATUS_SEQUENCE,
  [SHIPMENT_MODE.IMPORT]: IMPORT_STATUS_SEQUENCE,
});

// Exception / Hold statuses — always shown as a separate flag on top of the
// main sequence, never mixed into the linear progress bar.
export const EXCEPTION_STATUSES = Object.freeze([
  { code: 'AWAITING_SUPPLIER_CARGO', label: 'Awaiting Supplier Cargo', modes: [SHIPMENT_MODE.IMPORT] },
  { code: 'DOCUMENTATION_PENDING', label: 'Documentation Pending', modes: [SHIPMENT_MODE.EXPORT, SHIPMENT_MODE.IMPORT] },
  { code: 'SHIPMENT_SHORT_RECEIVED', label: 'Shipment Short Received', modes: [SHIPMENT_MODE.EXPORT, SHIPMENT_MODE.IMPORT] },
  { code: 'DAMAGED', label: 'Damaged', modes: [SHIPMENT_MODE.EXPORT, SHIPMENT_MODE.IMPORT] },
  { code: 'CUSTOMS_HOLD', label: 'Customs Hold', modes: [SHIPMENT_MODE.EXPORT, SHIPMENT_MODE.IMPORT] },
  { code: 'CUSTOMS_EXAMINATION', label: 'Customs Examination', modes: [SHIPMENT_MODE.EXPORT, SHIPMENT_MODE.IMPORT] },
  { code: 'DUTY_TAX_PENDING', label: 'Duty / Tax Pending', modes: [SHIPMENT_MODE.EXPORT, SHIPMENT_MODE.IMPORT] },
  { code: 'FLIGHT_DELAY', label: 'Flight Delay', modes: [SHIPMENT_MODE.EXPORT, SHIPMENT_MODE.IMPORT] },
  { code: 'TRANSSHIPMENT', label: 'Transshipment', modes: [SHIPMENT_MODE.EXPORT, SHIPMENT_MODE.IMPORT] },
  { code: 'MANIFEST_PENDING', label: 'Manifest Pending', modes: [SHIPMENT_MODE.IMPORT] },
  { code: 'IGM_PENDING', label: 'IGM Pending', modes: [SHIPMENT_MODE.IMPORT] },
  { code: 'DELIVERY_HOLD', label: 'Delivery Hold', modes: [SHIPMENT_MODE.EXPORT, SHIPMENT_MODE.IMPORT] },
  { code: 'ADDRESS_ISSUE', label: 'Address Issue', modes: [SHIPMENT_MODE.EXPORT, SHIPMENT_MODE.IMPORT] },
  { code: 'DELIVERY_ATTEMPTED', label: 'Delivery Attempted', modes: [SHIPMENT_MODE.EXPORT, SHIPMENT_MODE.IMPORT] },
  { code: 'SHIPMENT_REFUSED', label: 'Shipment Refused', modes: [SHIPMENT_MODE.EXPORT] },
  { code: 'SHIPMENT_CANCELLED', label: 'Shipment Cancelled', modes: [SHIPMENT_MODE.IMPORT] },
]);

export const getExceptionsForMode = (mode) =>
  EXCEPTION_STATUSES.filter((e) => e.modes.includes(mode));

export const getSequenceForMode = (mode) => STATUS_SEQUENCE_BY_MODE[mode] || [];

export const getStatusIndex = (mode, code) =>
  getSequenceForMode(mode).findIndex((s) => s.code === code);

export const getExceptionLabel = (code) => {
  if (!code) return '';
  const found = EXCEPTION_STATUSES.find((e) => e.code === code);
  return found ? found.label : code;
};

export const getStepDescription = (mode, code) => {
  const step = getSequenceForMode(mode).find((s) => s.code === code);
  return step?.description || '';
};