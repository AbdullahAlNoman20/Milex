/*
  Warnings:

  - You are about to drop the column `provisionalReason` on the `Customer` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Customer" DROP COLUMN "provisionalReason",
ADD COLUMN     "accountConfigMode" TEXT NOT NULL DEFAULT 'PROVISIONAL';

-- CreateTable
CREATE TABLE "FieldChangeRequest" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "fieldLabel" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT NOT NULL,
    "reason" TEXT,
    "requestedById" TEXT NOT NULL,
    "approved" BOOLEAN,
    "decidedById" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FieldChangeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FieldChangeRequest_customerId_idx" ON "FieldChangeRequest"("customerId");

-- AddForeignKey
ALTER TABLE "FieldChangeRequest" ADD CONSTRAINT "FieldChangeRequest_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
