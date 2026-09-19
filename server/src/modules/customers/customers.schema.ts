// src/modules/customers/customers.schema.ts
import { z } from 'zod';

const contactSchema = z
  .object({
    type: z.enum(['SENIOR_MANAGEMENT', 'KEY_CONTACT_PERSON', 'FINANCIAL_CONTACT']),
    name: z.string().min(1).max(150),
    designation: z.string().max(100).optional(),
    mobile: z.string().max(20).optional(),
    email: z.string().email().max(254).optional().or(z.literal('')),
  })
  .strict();

const shippingDetailSchema = z
  .object({
    shipmentType: z.array(z.enum(['Document', 'Non-Document', 'Others'])).min(1),
    shipmentTypeOther: z.string().max(150).optional(),
    // 'Both' is accepted only so records created before the option was
    // retired remain editable; it is no longer offered in the form.
    rateFor: z.enum(['Import', 'Export', 'Both']),
    country: z.string().min(1).max(80),
    volume: z.string().min(1),
    weight: z.string().min(1),
    revenue: z.string().min(1),
    provider: z.string().min(1).max(150),
  })
  .strict();

export const createRecommendationSchema = z
  .object({
    accountName: z.string().min(1, 'Please enter the account name.').max(200, 'The account name is too long.'),
    address: z.string().min(1, 'Please enter an address.').max(500, 'The address is too long.'),
    // Company phone is optional — the Senior Management contact carries the
    // number that has to be reachable.
    phone: z.string().max(16, 'That phone number looks too long.').optional().or(z.literal('')),
    email: z.string().email('Please enter a valid email address.').max(254, 'That email address is too long.'),
    businessType: z.string().min(1, 'Please choose a business type.').max(120),
    serviceRequired: z.enum(['IB', 'OB', 'BOTH'], { message: 'Please choose a valid service type.' }),
// Accepts legacy 'Fair' value too (old data / not-yet-updated clients)
    // and normalizes it to 'Freight' so nothing breaks either way.
    accountMode: z
      .enum(['Express', 'Fair', 'Freight', 'Express & Freight'], { message: 'Please choose a valid account mode.' })
      .transform((v) => (v === 'Fair' ? 'Freight' : v)),
    accountType: z.enum(['CREDIT CUSTOMER', 'CASH'], { message: 'Please choose a valid account type.' }),
    creditLimitTk: z.string().max(20, 'That credit limit looks too long.').optional(),
    creditPeriodDays: z.string().max(5).optional(),
    creditPeriodExtended: z.boolean().optional(),
    proposedRate: z.string().min(1, 'Please enter a proposed rate.').max(300),
    recNote: z.string().min(1, 'Please add a recommendation note.').max(2000),
    contacts: z.array(contactSchema).min(2, 'Please add at least two contacts.'),
    shippingDetails: z.array(shippingDetailSchema).min(1, 'Please add at least one shipping detail.'),
  })
  .strict();

export const approveRateSchema = z
  .object({
    approvedRate: z.string().min(1, 'Please enter the approved rate.').max(300),
    lmNote: z.string().max(500).optional(),
    creditPeriodDays: z.string().max(5).optional(),
    creditPeriodExtendedByLM: z.boolean().optional(),
  })
  .strict();

export const offerTextSchema = z
  .object({
    offerText: z.string().min(1, 'The offer letter can\'t be empty.').max(5000, 'The offer letter is too long.'),
    // How the letter reached the customer, kept with the copy so the record
    // says not just what was sent but how.
    sentVia: z.enum(['MAIL', 'HARD_COPY']).optional(),
  })
  .strict();
export const agreementTextSchema = z.object({ agreementText: z.string().min(1, 'The agreement text can\'t be empty.').max(5000, 'The agreement text is too long.') }).strict();

export const clientFeedbackSchema = z
  .object({
    accepted: z.boolean(),
    rejectReason: z.string().max(500).optional(),
  })
  .strict()
  .refine((v) => v.accepted || (v.rejectReason && v.rejectReason.length > 0), {
    message: 'Please provide a reason for rejecting this offer.',
  });

export const requestInfoUpdateSchema = z
  .object({
    field: z.string().min(1, 'Please choose which field to update.').max(100),
    newValue: z.string().min(1, 'Please enter the new value.').max(500),
  })
  .strict();

export const decideInfoUpdateSchema = z.object({ approve: z.boolean() }).strict();

export const followUpUpdateSchema = z
  .object({
    followUpDate: z.string().datetime().nullable().optional(),
    followUpNote: z.string().max(500).optional(),
  })
  .strict();

// Empty-string is what an unselected <select> or a blank text input sends —
// treat it the same as "not provided" instead of a validation error.
const emptyToUndefined = (v: unknown) => (v === '' ? undefined : v);

export const finalProfileSchema = z
  .object({
    managingPartnerName: z.preprocess(emptyToUndefined, z.string().max(150).optional().nullable()),
    binNumber: z.preprocess(emptyToUndefined, z.string().max(50).optional().nullable()),
    tinNumber: z.preprocess(emptyToUndefined, z.string().max(50).optional().nullable()),
    destinations: z.preprocess(emptyToUndefined, z.string().max(500).optional().nullable()),
    preferredCarrier: z.preprocess(emptyToUndefined, z.string().max(150).optional().nullable()),
    natureOfBusiness: z.preprocess(emptyToUndefined, z.string().max(150).optional().nullable()),
    gainType: z.preprocess(emptyToUndefined, z.enum(['NEW_GAIN', 'REGAIN', 'AC_UPDATE']).optional().nullable()),
    financeMode: z.preprocess(emptyToUndefined, z.enum(['EX', 'FR']).optional().nullable()),
    area: z.preprocess(emptyToUndefined, z.string().max(100).optional().nullable()),
    zone: z.preprocess(emptyToUndefined, z.string().max(100).optional().nullable()),
    specialInstructions: z.preprocess(emptyToUndefined, z.string().max(500).optional().nullable()),
  })
  .strict();

export const fieldChangeRequestSchema = z
  .object({
    fieldKey: z.string().min(1).max(120).optional(),
    newValue: z.string().max(2000).optional(),
    reason: z.string().max(500).optional(),
    documentType: z.string().min(1).max(60).optional(),
  })
  .strict()
  .refine((v) => v.fieldKey || v.documentType, { message: 'Please choose what you\'d like to change.' });

export const listCustomersQuerySchema = z
  .object({
    page: z.string().optional(),
    pageSize: z.string().optional(),
    status: z.string().optional(),
    search: z.string().max(100).optional(),
    group: z.enum(['customer', 'provisional', 'pending', 'pipeline', 'queue']).optional(),
    withCounts: z.enum(['true', 'false']).optional(),
  })
  .strict();

export const reassignCustomerSchema = z.object({ newKamId: z.string().min(1, 'Please choose a Key Account Manager to reassign to.') }).strict();

export const reapproveRateSchema = z
  .object({
    approvedRate: z.string().min(1, 'Please enter the new approved rate.').max(300),
    lmNote: z.string().max(500).optional(),
  })
  .strict();

// These routes previously took an unvalidated body. `approve` arriving as
// anything other than a boolean left the request marked "decided" with no
// decision actually recorded, and `mode` wrote arbitrary text to the column.
export const accountConfigModeSchema = z
  .object({ mode: z.enum(['REGULAR', 'PROVISIONAL'], { message: 'Please choose a valid account mode.' }) })
  .strict();

export const decideFieldChangeSchema = z.object({ approve: z.boolean() }).strict();

export const directFieldEditSchema = z
  .object({
    fieldKey: z.string().min(1, 'Please choose which field to change.').max(120),
    newValue: z.string().max(2000, 'That value is too long.'),
  })
  .strict();

export const reviseRateSchema = z
  .object({ proposedRate: z.string().min(1, 'Please enter a proposed rate.').max(300) })
  .strict();