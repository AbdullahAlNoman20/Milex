ALTER TABLE "Customer" ADD COLUMN "rateProcessOwnerId" TEXT;
CREATE INDEX "Customer_rateProcessOwnerId_idx" ON "Customer"("rateProcessOwnerId");

-- Anything already mid-flight keeps running under whoever holds the account,
-- which is how it behaved before this column existed.
UPDATE "Customer" SET "rateProcessOwnerId" = "handledById" WHERE "rateProcessActive" = true;