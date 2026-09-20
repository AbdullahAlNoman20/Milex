// src/common/constants/status.constant.ts
export const CUSTOMER_STATUS = Object.freeze({
  PENDING_RATE_PREPARATION: 'PENDING_RATE_PREPARATION',
  PENDING_RATE_APPROVAL: 'PENDING_RATE_APPROVAL',
  PENDING_HOD_RATE_APPROVAL: 'PENDING_HOD_RATE_APPROVAL',
  PENDING_KAM_RATE_REVIEW: 'PENDING_KAM_RATE_REVIEW',
  PENDING_LM_RATE_REVIEW: 'PENDING_LM_RATE_REVIEW',
  RATE_APPROVED_PENDING_OFFER: 'RATE_APPROVED_PENDING_OFFER',
  DRAFTING_OFFER_LETTER: 'DRAFTING_OFFER_LETTER',
  OFFER_SENT_AWAITING_FEEDBACK: 'OFFER_SENT_AWAITING_FEEDBACK',
  OFFER_REJECTED_REVISE_RATE: 'OFFER_REJECTED_REVISE_RATE',
  OFFER_ACCEPTED_PENDING_AGREEMENT: 'OFFER_ACCEPTED_PENDING_AGREEMENT',
  DRAFTING_AGREEMENT: 'DRAFTING_AGREEMENT',
  AGREEMENT_SENT_AWAITING_SIGNATURE: 'AGREEMENT_SENT_AWAITING_SIGNATURE',
  AGREEMENT_SIGNED_PENDING_PROFILE: 'AGREEMENT_SIGNED_PENDING_PROFILE',
  PROVISIONAL_ACTIVE: 'PROVISIONAL_ACTIVE',
  PROVISIONAL_DOCS_PENDING: 'PROVISIONAL_DOCS_PENDING',
  PROVISIONAL_EXTENSION_REQUESTED: 'PROVISIONAL_EXTENSION_REQUESTED',
  PROVISIONAL_FINAL_REVIEW_PENDING: 'PROVISIONAL_FINAL_REVIEW_PENDING',
  PROVISIONAL_EXPIRED: 'PROVISIONAL_EXPIRED',
  INFO_UPDATE_PENDING_LM_APPROVAL: 'INFO_UPDATE_PENDING_LM_APPROVAL',
  ACTIVE_ACCOUNT: 'ACTIVE_ACCOUNT',
} as const);

export type CustomerStatusKey = keyof typeof CUSTOMER_STATUS;

// Allowed transitions: fromStatus -> [toStatus...]. Enforced centrally so no
// service ever does a raw `status = x` write.
export const CUSTOMER_STATUS_TRANSITIONS: Record<string, string[]> = {
  [CUSTOMER_STATUS.PENDING_RATE_PREPARATION]: [CUSTOMER_STATUS.PENDING_RATE_APPROVAL],

  // The Line Manager's desk. They either set the rate themselves, or escalate
  // to the Head of Department — those are the only two ways forward. Where
  // a set rate goes next depends on who owns the account: back to the KAM
  // who raised it, or straight to the Sales Coordinator when the Line
  // Manager raised it themselves and has nobody to hand it to.
  [CUSTOMER_STATUS.PENDING_RATE_APPROVAL]: [
    CUSTOMER_STATUS.PENDING_KAM_RATE_REVIEW,
    CUSTOMER_STATUS.PENDING_HOD_RATE_APPROVAL,
    CUSTOMER_STATUS.RATE_APPROVED_PENDING_OFFER,
    CUSTOMER_STATUS.PENDING_RATE_PREPARATION,
  ],

  // The Head of Department's desk. The rate they grant goes to whoever owns
  // the account — the KAM, the Line Manager, or, when the Head of Department
  // owns it themselves, straight out to the Sales Coordinator.
  [CUSTOMER_STATUS.PENDING_HOD_RATE_APPROVAL]: [
    CUSTOMER_STATUS.PENDING_KAM_RATE_REVIEW,
    CUSTOMER_STATUS.PENDING_LM_RATE_REVIEW,
    CUSTOMER_STATUS.RATE_APPROVED_PENDING_OFFER,
    CUSTOMER_STATUS.PENDING_RATE_APPROVAL,
  ],

  // The KAM's desk. They take the rate to the Sales Coordinator, or send it
  // back to their Line Manager for a better one. This is the loop the
  // business actually runs on, and it can go round as many times as needed.
  [CUSTOMER_STATUS.PENDING_KAM_RATE_REVIEW]: [
    CUSTOMER_STATUS.RATE_APPROVED_PENDING_OFFER,
    CUSTOMER_STATUS.PENDING_RATE_APPROVAL,
  ],

  // The same decision in the Line Manager's hands, for an account they own
  // themselves: accept what the Head of Department granted, or go back and
  // ask again.
  [CUSTOMER_STATUS.PENDING_LM_RATE_REVIEW]: [
    CUSTOMER_STATUS.RATE_APPROVED_PENDING_OFFER,
    CUSTOMER_STATUS.PENDING_HOD_RATE_APPROVAL,
    CUSTOMER_STATUS.PENDING_RATE_APPROVAL,
  ],

  // The Sales Coordinator's desk.
  [CUSTOMER_STATUS.RATE_APPROVED_PENDING_OFFER]: [
    CUSTOMER_STATUS.OFFER_SENT_AWAITING_FEEDBACK,
  ],
  [CUSTOMER_STATUS.DRAFTING_OFFER_LETTER]: [CUSTOMER_STATUS.OFFER_SENT_AWAITING_FEEDBACK],

  // The customer's answer. Accepting is the moment the account becomes
  // provisional and the document countdown starts; rejecting sends the rate
  // back to the Line Manager and the whole loop runs again.
  // A rejection goes back to whoever owns the rate decision on this account:
  // the Line Manager normally, the Head of Department when the account is
  // theirs and there is nobody above them to ask.
  [CUSTOMER_STATUS.OFFER_SENT_AWAITING_FEEDBACK]: [
    CUSTOMER_STATUS.PROVISIONAL_ACTIVE,
    CUSTOMER_STATUS.PENDING_RATE_APPROVAL,
    CUSTOMER_STATUS.PENDING_HOD_RATE_APPROVAL,
    CUSTOMER_STATUS.OFFER_REJECTED_REVISE_RATE,
  ],

  // Legacy records only — nothing new lands here.
  [CUSTOMER_STATUS.OFFER_REJECTED_REVISE_RATE]: [
    CUSTOMER_STATUS.PENDING_RATE_APPROVAL,
    CUSTOMER_STATUS.PROVISIONAL_ACTIVE,
  ],
  [CUSTOMER_STATUS.OFFER_ACCEPTED_PENDING_AGREEMENT]: [CUSTOMER_STATUS.DRAFTING_AGREEMENT],
  [CUSTOMER_STATUS.DRAFTING_AGREEMENT]: [CUSTOMER_STATUS.AGREEMENT_SENT_AWAITING_SIGNATURE],
  [CUSTOMER_STATUS.AGREEMENT_SENT_AWAITING_SIGNATURE]: [CUSTOMER_STATUS.AGREEMENT_SIGNED_PENDING_PROFILE],
  [CUSTOMER_STATUS.AGREEMENT_SIGNED_PENDING_PROFILE]: [
    CUSTOMER_STATUS.PROVISIONAL_ACTIVE,
    CUSTOMER_STATUS.ACTIVE_ACCOUNT,
  ],
  [CUSTOMER_STATUS.PROVISIONAL_ACTIVE]: [
    // A live account can still be re-quoted: the customer asks, and the rate
    // goes back round the same loop without disturbing their provisional
    // standing or the countdown already running.
    CUSTOMER_STATUS.PENDING_RATE_APPROVAL,
    CUSTOMER_STATUS.OFFER_SENT_AWAITING_FEEDBACK,
    // Extension requests are only allowed once the provisional period has
    // actually expired — see PROVISIONAL_EXPIRED's own transition list
    // below. Requesting one while still active is intentionally blocked.
    CUSTOMER_STATUS.OFFER_REJECTED_REVISE_RATE,
    CUSTOMER_STATUS.PROVISIONAL_FINAL_REVIEW_PENDING,
    CUSTOMER_STATUS.PROVISIONAL_EXPIRED,
    CUSTOMER_STATUS.ACTIVE_ACCOUNT,
  ],
  [CUSTOMER_STATUS.PROVISIONAL_EXTENSION_REQUESTED]: [
    CUSTOMER_STATUS.PROVISIONAL_ACTIVE,
    CUSTOMER_STATUS.PROVISIONAL_EXPIRED,
  ],
  [CUSTOMER_STATUS.PROVISIONAL_FINAL_REVIEW_PENDING]: [
    CUSTOMER_STATUS.ACTIVE_ACCOUNT,
    CUSTOMER_STATUS.PROVISIONAL_ACTIVE,
  ],
  // Grace period: even after auto-expiry, a KAM can still request a
  // 5-day extension instead of the account being permanently dead.
  [CUSTOMER_STATUS.PROVISIONAL_EXPIRED]: [CUSTOMER_STATUS.PROVISIONAL_EXTENSION_REQUESTED],
  [CUSTOMER_STATUS.ACTIVE_ACCOUNT]: [CUSTOMER_STATUS.INFO_UPDATE_PENDING_LM_APPROVAL],
  [CUSTOMER_STATUS.INFO_UPDATE_PENDING_LM_APPROVAL]: [CUSTOMER_STATUS.ACTIVE_ACCOUNT],
};