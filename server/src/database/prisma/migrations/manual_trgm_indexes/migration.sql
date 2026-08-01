-- server/src/database/prisma/migrations/manual_feature_columns/migration.sql
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lineManagerId" TEXT;
CREATE INDEX IF NOT EXISTS "User_lineManagerId_idx" ON "User"("lineManagerId");

ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "isDeleted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "rateHistory" JSONB[] NOT NULL DEFAULT '{}';
CREATE INDEX IF NOT EXISTS "Customer_isDeleted_idx" ON "Customer"("isDeleted");

ALTER TABLE "Visit" ADD COLUMN IF NOT EXISTS "customerId" TEXT;
ALTER TABLE "ReportVisit" ADD COLUMN IF NOT EXISTS "customerId" TEXT;

-- Run `prisma migrate dev` afterward once so Prisma's own FK for
-- User.lineManagerId gets created/tracked normally.