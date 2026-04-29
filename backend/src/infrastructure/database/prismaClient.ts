import { PrismaClient } from '@prisma/client';

// Single Prisma instance for the whole process.
// Connection pool is configured via DATABASE_URL query params — no code changes needed:
//   ?connection_limit=25&pool_timeout=30   → tune when deploying (RAM / 25 per instance)
//   ?pgbouncer=true&connection_limit=1     → if running PgBouncer as external pooler
const prisma = new PrismaClient();

export default prisma;
