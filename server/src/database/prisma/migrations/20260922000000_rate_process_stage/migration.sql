ALTER TABLE "Customer" ADD COLUMN "rateProcessStage" TEXT;
CREATE INDEX "Customer_rateProcessStage_idx" ON "Customer"("rateProcessStage");