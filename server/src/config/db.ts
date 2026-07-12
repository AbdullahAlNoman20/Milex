// src/config/db.ts
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { env } from './env';

// Prisma 7's default "client" engine requires an explicit driver adapter —
// bare `new PrismaClient()` against a connection string alone no longer works.
const pool = new Pool({ connectionString: env.DATABASE_URL });
const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({
  adapter,
  log: env.IS_PRODUCTION ? ['error', 'warn'] : ['error', 'warn', 'query'],
});

export const disconnectDb = async () => {
  await prisma.$disconnect();
  await pool.end();
};