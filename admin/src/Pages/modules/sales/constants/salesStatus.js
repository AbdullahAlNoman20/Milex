// src/Pages/modules/sales/constants/salesStatus.js
export const STATUS = Object.freeze({
  PENDING_RATE: 'PENDING_RATE_PREPARATION',
  PENDING_APPROVAL: 'PENDING_RATE_APPROVAL',
  APPROVED_PENDING_OFFER: 'RATE_APPROVED_PENDING_OFFER',
  OFFER_DRAFTING: 'DRAFTING_OFFER_LETTER',
  OFFER_REVIEW: 'OFFER_SENT_AWAITING_FEEDBACK',
  OFFER_REJECTED: 'OFFER_REJECTED_REVISE_RATE',
  PENDING_AGREEMENT: 'OFFER_ACCEPTED_PENDING_AGREEMENT',
  AGREEMENT_DRAFTING: 'DRAFTING_AGREEMENT',
  AGREEMENT_REVIEW: 'AGREEMENT_SENT_AWAITING_SIGNATURE',
  PENDING_PROFILE: 'AGREEMENT_SIGNED_PENDING_PROFILE',
  PROVISIONAL_ACTIVE: 'PROVISIONAL_ACTIVE',
  PROVISIONAL_DOCS_PENDING: 'PROVISIONAL_DOCS_PENDING',
  PROVISIONAL_EXTENSION_REQUESTED: 'PROVISIONAL_EXTENSION_REQUESTED',
  PROVISIONAL_FINAL_REVIEW_PENDING: 'PROVISIONAL_FINAL_REVIEW_PENDING',
  PROVISIONAL_EXPIRED: 'PROVISIONAL_EXPIRED',
  INFO_UPDATE_PENDING: 'INFO_UPDATE_PENDING_LM_APPROVAL',
  ACTIVE: 'ACTIVE_ACCOUNT',
});

export const TERMINAL_STATUSES = Object.freeze([STATUS.ACTIVE, STATUS.PROVISIONAL_EXPIRED]);

export const isPipelineStatus = (status) => !TERMINAL_STATUSES.includes(status) || status === STATUS.PROVISIONAL_ACTIVE;

export const STATUS_STYLE = Object.freeze({
  danger: [STATUS.OFFER_REJECTED, STATUS.PROVISIONAL_EXPIRED],
  success: [STATUS.ACTIVE, STATUS.PROVISIONAL_ACTIVE],
});

export const getStatusTone = (status) => {
  if (STATUS_STYLE.danger.includes(status)) return 'danger';
  if (STATUS_STYLE.success.includes(status)) return 'success';
  return 'pending';
};

export const PROVISIONAL_RULES = Object.freeze({
  VALIDITY_DAYS: 21,
  LM_EXTENSION_DAYS: 5,
});

export const getWorkflowStageLabel = (customer) => {
  if (!customer) return '';
  switch (customer.status) {
    case STATUS.PENDING_RATE:
      return 'Waiting for KAM to Submit / Revise Rate';
    case STATUS.PENDING_APPROVAL:
      return 'Waiting for Line Manager Approval';
    case STATUS.INFO_UPDATE_PENDING:
      return 'Waiting for Line Manager Approval (Info Update)';
    case STATUS.PROVISIONAL_EXTENSION_REQUESTED:
      return 'Waiting for Line Manager to Decide on Extension Request';
    case STATUS.PROVISIONAL_FINAL_REVIEW_PENDING:
      return 'Waiting for Line Manager Final Verification';
    case STATUS.PROVISIONAL_ACTIVE:
      if (!customer.offerSent) return 'Waiting for Sales Coordinator to Send Offer Letter';
      if (!customer.offerAccepted) return "Waiting for Customer's Feedback (via KAM)";
      if (!customer.agreementSent) return 'Waiting for Sales Coordinator to Collect Agreement';
      return 'Waiting for Document Upload & Final Onboarding';
    case STATUS.ACTIVE:
      return 'Completed — Active Customer';
    default:
      return 'In Progress';
  }
};

export const CREDIT_RULES = Object.freeze({
  DEFAULT_PERIOD_DAYS: 15,
  MAX_EXTENDED_PERIOD_DAYS: 90,
});