import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'src/database/prisma/schema.prisma',

  migrations: {
    path: 'src/database/prisma/migrations',
    seed: 'ts-node src/database/seed/seed.ts',
  },

  datasource: {
    url: process.env.DIRECT_URL,
  },
}); 