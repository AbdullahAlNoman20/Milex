// src/config/db.ts
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { env } from './env';

// Prisma 7's default "client" engine requires an explicit driver adapter —
// bare `new PrismaClient()` against a connection string alone no longer works.
const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: env.PG_POOL_MAX,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});
const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({
  adapter,
  // Query logging is opt-in rather than always-on in development: it buries
  // the output of anything else that runs against the database, seeding most
  // of all. Set PRISMA_LOG_QUERIES=true when you actually want to see them.
  log:
    !env.IS_PRODUCTION && process.env.PRISMA_LOG_QUERIES === 'true'
      ? ['error', 'warn', 'query']
      : ['error', 'warn'],
});

export const disconnectDb = async () => {
  await prisma.$disconnect();
  await pool.end();
};