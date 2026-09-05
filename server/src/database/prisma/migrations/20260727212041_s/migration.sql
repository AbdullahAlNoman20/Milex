-- DropIndex
DROP INDEX IF EXISTS "customer_account_name_trgm_idx";
-- DropIndex
DROP INDEX IF EXISTS "customer_barcode_trgm_idx";
-- DropIndex
DROP INDEX IF EXISTS "customer_rate_ref_trgm_idx";

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "rateHistory" JSONB[] DEFAULT ARRAY[]::JSONB[];

-- AlterTable
ALTER TABLE "ReportVisit" ADD COLUMN     "customerId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "lineManagerId" TEXT;

-- AlterTable
ALTER TABLE "Visit" ADD COLUMN     "customerId" TEXT;

-- CreateIndex
CREATE INDEX "Customer_isDeleted_idx" ON "Customer"("isDeleted");

-- CreateIndex
CREATE INDEX "FieldChangeRequest_pendingFileStorageKey_idx" ON "FieldChangeRequest"("pendingFileStorageKey");

-- CreateIndex
CREATE INDEX "OnboardingDocument_storageKey_idx" ON "OnboardingDocument"("storageKey");

-- CreateIndex
CREATE INDEX "ReportVisit_dailyReportId_idx" ON "ReportVisit"("dailyReportId");

-- CreateIndex
CREATE INDEX "User_lineManagerId_idx" ON "User"("lineManagerId");

-- CreateIndex
CREATE INDEX "Visit_existingPlanId_idx" ON "Visit"("existingPlanId");

-- CreateIndex
CREATE INDEX "Visit_prospectPlanId_idx" ON "Visit"("prospectPlanId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_lineManagerId_fkey" FOREIGN KEY ("lineManagerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
