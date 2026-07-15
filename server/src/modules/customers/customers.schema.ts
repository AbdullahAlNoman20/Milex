// src/modules/customers/customers.schema.ts
import { z } from 'zod';

const contactSchema = z
  .object({
    type: z.enum(['SENIOR_MANAGEMENT', 'KEY_CONTACT_PERSON', 'FINANCIAL_CONTACT']),
    name: z.string().min(1).max(150),
    designation: z.string().max(100).optional(),
    mobile: z.string().max(16).optional(),
    email: z.string().email().max(254).optional().or(z.literal('')),
  })
  .strict();

const shippingDetailSchema = z
  .object({
    shipmentType: z.array(z.enum(['Document', 'Non-Document', 'Others'])).min(1),
    shipmentTypeOther: z.string().max(150).optional(),
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
    accountName: z.string().min(1).max(200),
    address: z.string().min(1).max(500),
    phone: z.string().min(7).max(16),
    email: z.string().email().max(254),
    businessType: z.string().min(1).max(120),
    serviceRequired: z.enum(['IB', 'OB', 'BOTH']),
    accountMode: z.enum(['Express', 'Fair']),
    accountType: z.enum(['CREDIT CUSTOMER', 'CASH']),
    creditLimitTk: z.string().max(20).optional(),
    creditPeriodDays: z.string().max(5).optional(),
    creditPeriodExtended: z.boolean().optional(),
    proposedRate: z.string().min(1).max(300),
    recNote: z.string().min(1).max(2000),
    contacts: z.array(contactSchema).min(2),
    shippingDetails: z.array(shippingDetailSchema).min(1),
  })
  .strict();

export const approveRateSchema = z
  .object({
    approvedRate: z.string().min(1).max(300),
    lmNote: z.string().max(500).optional(),
    creditPeriodDays: z.string().max(5).optional(),
    creditPeriodExtendedByLM: z.boolean().optional(),
  })
  .strict();

export const offerTextSchema = z.object({ offerText: z.string().min(1).max(5000) }).strict();
export const agreementTextSchema = z.object({ agreementText: z.string().min(1).max(5000) }).strict();

export const clientFeedbackSchema = z
  .object({
    accepted: z.boolean(),
    rejectReason: z.string().max(500).optional(),
  })
  .strict()
  .refine((v) => v.accepted || (v.rejectReason && v.rejectReason.length > 0), {
    message: 'rejectReason is required when rejecting',
  });

export const requestInfoUpdateSchema = z
  .object({
    field: z.string().min(1).max(100),
    newValue: z.string().min(1).max(500),
  })
  .strict();

export const decideInfoUpdateSchema = z.object({ approve: z.boolean() }).strict();

export const followUpUpdateSchema = z
  .object({
    followUpDate: z.string().datetime().nullable().optional(),
    followUpNote: z.string().max(500).optional(),
  })
  .strict();

export const finalProfileSchema = z
  .object({
    provisionalReason: z.string().min(1).max(500),
    managingPartnerName: z.string().max(150).optional(),
    binNumber: z.string().max(50).optional(),
    tinNumber: z.string().max(50).optional(),
    destinations: z.string().max(500).optional(),
    preferredCarrier: z.string().max(150).optional(),
    natureOfBusiness: z.string().max(150).optional(),
    gainType: z.enum(['NEW_GAIN', 'REGAIN', 'AC_UPDATE']).optional(),
    financeMode: z.enum(['EX', 'FR']).optional(),
    area: z.string().max(100).optional(),
    zone: z.string().max(100).optional(),
    specialInstructions: z.string().max(500).optional(),
  })
  .strict();

export const listCustomersQuerySchema = z
  .object({
    page: z.string().optional(),
    pageSize: z.string().optional(),
    status: z.string().optional(),
    search: z.string().max(100).optional(),
  })
  .strict();