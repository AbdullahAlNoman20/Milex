-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "offerAccepted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "OnboardingDocument" ADD COLUMN     "documentNumber" TEXT,
ADD COLUMN     "expiryDate" TIMESTAMP(3);
