/**
 * @file prisma.ts
 * @description Prisma client singleton with serverless-optimized connection pooling
 *              and query timeout configuration
 * @module lib/core
 */

import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Query timeout in milliseconds (60 seconds default for serverless cold starts)
const QUERY_TIMEOUT_MS = parseInt(process.env.PRISMA_QUERY_TIMEOUT_MS || '60000', 10);

// Build connection URL with pool settings for serverless
function getConnectionUrl(): string {
  const baseUrl = process.env.DATABASE_URL || '';

  // If URL already has query params, append with &, otherwise use ?
  const separator = baseUrl.includes('?') ? '&' : '?';

  // For Supabase session pooler (port 5432) with serverless:
  // - connection_limit=1: Each serverless instance gets 1 connection (prevents MaxClientsInSessionMode)
  // - pool_timeout=0: Fail immediately if no connection available (let Vercel retry)
  // - statement_timeout: Max query execution time (ms)
  return `${baseUrl}${separator}connection_limit=1&pool_timeout=0&statement_timeout=${QUERY_TIMEOUT_MS}`;
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
    // Transaction settings - increased for serverless cold starts
    transactionOptions: {
      maxWait: 10000, // Max time to wait for a transaction slot (10s)
      timeout: QUERY_TIMEOUT_MS, // Max transaction duration (60s)
    },
  });

// Cache Prisma client to prevent connection exhaustion in serverless
globalForPrisma.prisma = prisma;

// Type for Prisma transaction client (used inside $transaction callbacks)
export type PrismaTransactionClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;