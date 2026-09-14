-- Performance indexes for queries that were doing sequential scans.
-- All are IF NOT EXISTS so re-running is safe.

-- attachVisitOutcomes() does WHERE sourceVisitId IN (...) on every
-- Weekly Plan / Team Reports load — this was a full table scan.
CREATE INDEX IF NOT EXISTS "ReportVisit_sourceVisitId_idx" ON "ReportVisit" ("sourceVisitId");

-- My Activity / Team Activity read LoginLog by userId; only email was indexed.
CREATE INDEX IF NOT EXISTS "LoginLog_userId_createdAt_idx" ON "LoginLog" ("userId", "createdAt" DESC);

-- Daily Visiting Report filters weekly-plan visits by calendar day.
CREATE INDEX IF NOT EXISTS "Visit_day_idx" ON "Visit" ("day");

CREATE INDEX IF NOT EXISTS "FieldChangeRequest_requestedById_idx" ON "FieldChangeRequest" ("requestedById");

-- Document lookups are always (customer + category).
CREATE INDEX IF NOT EXISTS "OnboardingDocument_customerId_documentType_idx"
  ON "OnboardingDocument" ("customerId", "documentType");

-- The customer list is always: not deleted, newest first.
CREATE INDEX IF NOT EXISTS "Customer_isDeleted_createdAt_idx"
  ON "Customer" ("isDeleted", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "AuditLog_entity_entityId_action_idx"
  ON "AuditLog" ("entity", "entityId", "action");

CREATE INDEX IF NOT EXISTS "DailyReport_kamId_date_idx" ON "DailyReport" ("kamId", "date" DESC);

-- Admin can force a password change on next login.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;

-- Case-insensitive customer search without a full scan (safe if extension
-- is unavailable — the CREATE EXTENSION will simply be skipped by the DBA).
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS "Customer_accountName_trgm_idx"
  ON "Customer" USING gin ("accountName" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Customer_barcode_trgm_idx"
  ON "Customer" USING gin ("barcode" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Customer_rateRef_trgm_idx"
  ON "Customer" USING gin ("rateRef" gin_trgm_ops);