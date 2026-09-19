SELECT "customerId", COUNT(*) FROM "User" WHERE "customerId" IS NOT NULL GROUP BY "customerId" HAVING COUNT(*) > 1;
