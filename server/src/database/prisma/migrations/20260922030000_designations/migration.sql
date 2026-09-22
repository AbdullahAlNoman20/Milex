CREATE TABLE "Designation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Designation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Designation_name_key" ON "Designation"("name");

INSERT INTO "Designation" ("id", "name") VALUES
  (gen_random_uuid(), 'MD'),
  (gen_random_uuid(), 'MP'),
  (gen_random_uuid(), 'Director'),
  (gen_random_uuid(), 'Proprietor')
ON CONFLICT ("name") DO NOTHING;