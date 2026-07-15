-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "area" TEXT,
ADD COLUMN     "binNumber" TEXT,
ADD COLUMN     "destinations" TEXT,
ADD COLUMN     "finalProfileCompleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "financeMode" TEXT,
ADD COLUMN     "gainType" TEXT,
ADD COLUMN     "managingPartnerName" TEXT,
ADD COLUMN     "natureOfBusiness" TEXT,
ADD COLUMN     "preferredCarrier" TEXT,
ADD COLUMN     "provisionalReason" TEXT,
ADD COLUMN     "specialInstructions" TEXT,
ADD COLUMN     "tinNumber" TEXT,
ADD COLUMN     "zone" TEXT;
