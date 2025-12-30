import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Query timeout in milliseconds (30 seconds default, configurable via env)
const QUERY_TIMEOUT_MS = parseInt(process.env.PRISMA_QUERY_TIMEOUT_MS || '30000', 10);

// Build connection URL with pool settings for serverless
function getConnectionUrl(): string {
  const baseUrl = process.env.DATABASE_URL || '';

  // If URL already has query params, append with &, otherwise use ?
  const separator = baseUrl.includes('?') ? '&' : '?';

  // Limit connections per serverless instance to prevent pool exhaustion
  // connection_limit=1 is recommended for serverless to prevent MaxClientsInSessionMode
  // statement_timeout limits query execution time (in ms) to prevent long-running queries
  return `${baseUrl}${separator}connection_limit=1&pool_timeout=10&statement_timeout=${QUERY_TIMEOUT_MS}`;
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: getConnectionUrl(),
      },
    },
    // Transaction settings
    transactionOptions: {
      maxWait: 5000, // Max time to wait for a transaction slot (5s)
      timeout: QUERY_TIMEOUT_MS, // Max transaction duration
    },
  });

// Cache Prisma client to prevent connection exhaustion in serverless
globalForPrisma.prisma = prisma;

// Type for Prisma transaction client (used inside $transaction callbacks)
export type PrismaTransactionClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;