-- AlterTable
ALTER TABLE "ReportVisit" ADD COLUMN     "purpose" TEXT,
ALTER COLUMN "completed" DROP NOT NULL,
ALTER COLUMN "completed" DROP DEFAULT;
