-- Additive only: one nullable column and an index. No existing row is read,
-- changed or removed, so this is safe against live data.
ALTER TABLE "ReportVisit" ADD COLUMN IF NOT EXISTS "autoClosedAt" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "ReportVisit_autoClosedAt_idx" ON "ReportVisit"("autoClosedAt");