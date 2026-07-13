-- CreateEnum
CREATE TYPE "RoleName" AS ENUM ('KAM', 'SALES_COORDINATOR', 'LINE_MANAGER', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "CustomerStatus" AS ENUM ('PENDING_RATE_PREPARATION', 'PENDING_RATE_APPROVAL', 'RATE_APPROVED_PENDING_OFFER', 'DRAFTING_OFFER_LETTER', 'OFFER_SENT_AWAITING_FEEDBACK', 'OFFER_REJECTED_REVISE_RATE', 'OFFER_ACCEPTED_PENDING_AGREEMENT', 'DRAFTING_AGREEMENT', 'AGREEMENT_SENT_AWAITING_SIGNATURE', 'AGREEMENT_SIGNED_PENDING_PROFILE', 'PROVISIONAL_ACTIVE', 'PROVISIONAL_DOCS_PENDING', 'PROVISIONAL_EXTENSION_REQUESTED', 'PROVISIONAL_FINAL_REVIEW_PENDING', 'PROVISIONAL_EXPIRED', 'INFO_UPDATE_PENDING_LM_APPROVAL', 'ACTIVE_ACCOUNT');

-- CreateEnum
CREATE TYPE "AccountProfileType" AS ENUM ('REGULAR', 'PROVISIONAL');

-- CreateEnum
CREATE TYPE "WeeklyPlanStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'NEEDS_REVISION', 'APPROVED');

-- CreateEnum
CREATE TYPE "ContactType" AS ENUM ('SENIOR_MANAGEMENT', 'KEY_CONTACT_PERSON', 'FINANCIAL_CONTACT');

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "name" "RoleName" NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("roleId","permissionId")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "passwordHistory" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "roleId" TEXT NOT NULL,
    "branchId" TEXT,
    "mfaSecret" TEXT,
    "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "failedLoginCount" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoginLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "barcode" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "businessType" TEXT NOT NULL,
    "serviceRequired" TEXT NOT NULL,
    "accountMode" TEXT NOT NULL,
    "accountType" TEXT NOT NULL,
    "creditLimitTk" TEXT,
    "creditPeriodDays" TEXT,
    "creditPeriodExtendedByLM" BOOLEAN NOT NULL DEFAULT false,
    "proposedRate" TEXT,
    "approvedRate" TEXT,
    "lmNote" TEXT,
    "recNote" TEXT,
    "rejectReason" TEXT,
    "rateRef" TEXT,
    "offerText" TEXT,
    "agreementText" TEXT,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "status" "CustomerStatus" NOT NULL DEFAULT 'PENDING_RATE_PREPARATION',
    "accountProfileType" "AccountProfileType" NOT NULL DEFAULT 'REGULAR',
    "pendingInfoUpdateField" TEXT,
    "pendingInfoUpdateValue" TEXT,
    "pendingInfoUpdateAt" TIMESTAMP(3),
    "provisionalCreatedAt" TIMESTAMP(3),
    "provisionalExpiryDate" TIMESTAMP(3),
    "provisionalExtensionDays" INTEGER NOT NULL DEFAULT 0,
    "followUpDate" TIMESTAMP(3),
    "followUpNote" TEXT,
    "recommendedById" TEXT NOT NULL,
    "handledById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "type" "ContactType" NOT NULL,
    "name" TEXT NOT NULL,
    "designation" TEXT,
    "mobile" TEXT,
    "email" TEXT,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShippingDetail" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "shipmentType" TEXT[],
    "rateFor" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "volume" TEXT NOT NULL,
    "weight" TEXT NOT NULL,
    "revenue" TEXT NOT NULL,
    "provider" TEXT NOT NULL,

    CONSTRAINT "ShippingDetail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerHistoryEntry" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "subText" TEXT,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerHistoryEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnboardingDocument" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "scanStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OnboardingDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimeExtensionRequest" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "requestedDays" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "approved" BOOLEAN,
    "decidedById" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TimeExtensionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyPlan" (
    "id" TEXT NOT NULL,
    "kamId" TEXT NOT NULL,
    "weekStartDate" TEXT NOT NULL,
    "status" "WeeklyPlanStatus" NOT NULL DEFAULT 'DRAFT',
    "lmComments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeeklyPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Visit" (
    "id" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "outcomeNotes" TEXT,
    "existingPlanId" TEXT,
    "prospectPlanId" TEXT,

    CONSTRAINT "Visit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyReport" (
    "id" TEXT NOT NULL,
    "kamId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportVisit" (
    "id" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT true,
    "reasonIfNotCompleted" TEXT,
    "outcomeNotes" TEXT,
    "dailyReportId" TEXT NOT NULL,

    CONSTRAINT "ReportVisit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorId" TEXT,
    "beforeState" JSONB,
    "afterState" JSONB,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_key_key" ON "Permission"("key");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- CreateIndex
CREATE INDEX "LoginLog_email_idx" ON "LoginLog"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_barcode_key" ON "Customer"("barcode");

-- CreateIndex
CREATE INDEX "Customer_status_idx" ON "Customer"("status");

-- CreateIndex
CREATE INDEX "Customer_recommendedById_idx" ON "Customer"("recommendedById");

-- CreateIndex
CREATE INDEX "Customer_handledById_idx" ON "Customer"("handledById");

-- CreateIndex
CREATE INDEX "Contact_customerId_idx" ON "Contact"("customerId");

-- CreateIndex
CREATE INDEX "ShippingDetail_customerId_idx" ON "ShippingDetail"("customerId");

-- CreateIndex
CREATE INDEX "CustomerHistoryEntry_customerId_idx" ON "CustomerHistoryEntry"("customerId");

-- CreateIndex
CREATE INDEX "OnboardingDocument_customerId_idx" ON "OnboardingDocument"("customerId");

-- CreateIndex
CREATE INDEX "TimeExtensionRequest_customerId_idx" ON "TimeExtensionRequest"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyPlan_kamId_weekStartDate_key" ON "WeeklyPlan"("kamId", "weekStartDate");

-- CreateIndex
CREATE UNIQUE INDEX "DailyReport_kamId_date_key" ON "DailyReport"("kamId", "date");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoginLog" ADD CONSTRAINT "LoginLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_recommendedById_fkey" FOREIGN KEY ("recommendedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_handledById_fkey" FOREIGN KEY ("handledById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShippingDetail" ADD CONSTRAINT "ShippingDetail_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerHistoryEntry" ADD CONSTRAINT "CustomerHistoryEntry_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingDocument" ADD CONSTRAINT "OnboardingDocument_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeExtensionRequest" ADD CONSTRAINT "TimeExtensionRequest_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyPlan" ADD CONSTRAINT "WeeklyPlan_kamId_fkey" FOREIGN KEY ("kamId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_existingPlanId_fkey" FOREIGN KEY ("existingPlanId") REFERENCES "WeeklyPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_prospectPlanId_fkey" FOREIGN KEY ("prospectPlanId") REFERENCES "WeeklyPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyReport" ADD CONSTRAINT "DailyReport_kamId_fkey" FOREIGN KEY ("kamId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportVisit" ADD CONSTRAINT "ReportVisit_dailyReportId_fkey" FOREIGN KEY ("dailyReportId") REFERENCES "DailyReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
