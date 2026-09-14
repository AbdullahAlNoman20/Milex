-- An offer rejected by the customer no longer moves the account out of
-- PROVISIONAL_ACTIVE. The account stays provisional (so the 21-day document
-- countdown keeps running) and this flag records that the offer currently
-- sits rejected, awaiting a fresh rate from the Line Manager.
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "offerRejected" BOOLEAN NOT NULL DEFAULT false;

-- Drives the Line Manager's "Action Required" queue.
CREATE INDEX IF NOT EXISTS "Customer_status_offerRejected_idx"
  ON "Customer" ("status", "offerRejected");