-- AlterTable
ALTER TABLE "FieldChangeRequest" ADD COLUMN     "documentType" TEXT,
ALTER COLUMN "newValue" DROP NOT NULL;
