-- CreateIndex
CREATE INDEX "Customer_followUpDate_idx" ON "Customer"("followUpDate");

-- CreateIndex
CREATE INDEX "Customer_status_provisionalExpiryDate_idx" ON "Customer"("status", "provisionalExpiryDate");

-- CreateIndex
CREATE INDEX "FieldChangeRequest_approved_idx" ON "FieldChangeRequest"("approved");
