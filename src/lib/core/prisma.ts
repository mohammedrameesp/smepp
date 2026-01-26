/**
 * @file prisma.ts
 * @description Global Prisma client singleton - UNFILTERED, NO TENANT ISOLATION
 * @module lib/core
 *
 * ════════════════════════════════════════════════════════════════════════════════
 * SECURITY WARNING: This is the RAW Prisma client with NO tenant filtering.
 * ════════════════════════════════════════════════════════════════════════════════
 *
 * WHEN TO USE THIS CLIENT:
 * ──────────────────────────────────────────────────────────────────────────────
 * ✓ Super admin operations (cross-tenant queries)
 * ✓ Global models without tenantId (User, Organization, Session, Account)
 * ✓ Auth flows before tenant context exists (login, signup)
 * ✓ Raw SQL queries with MANUAL tenant filtering
 * ✓ Cron jobs that process multiple tenants
 * ✓ Platform-level analytics and reporting
 *
 * WHEN NOT TO USE THIS CLIENT:
 * ──────────────────────────────────────────────────────────────────────────────
 * ✗ API routes handling tenant data - use context.prisma from handler
 * ✗ Any query on tenant-scoped models (Asset, Employee, Leave, etc.)
 * ✗ Server components displaying tenant data
 * ✗ Server actions modifying tenant data
 *
 * FOR TENANT DATA, ALWAYS USE:
 * ──────────────────────────────────────────────────────────────────────────────
 * ```typescript
 * // In API handlers - prisma is already tenant-scoped
 * export const GET = withErrorHandler(async (req, { prisma }) => {
 *   const assets = await prisma.asset.findMany(); // Auto-filtered by tenant
 * }, { requireAuth: true });
 * ```
 *
 * @see prisma-tenant.ts for the tenant-scoped client
 * @security Using this client for tenant data WITHOUT manual filtering = DATA LEAK
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

  // For Supabase Transaction pooler (port 6543):
  // - No connection_limit needed (transaction mode handles this automatically)
  // - pool_timeout=10: Wait up to 10 seconds for a connection if pool is full
  // - statement_timeout: Max query execution time (ms)
  // Note: Use port 6543 for Transaction mode (serverless) instead of 5432 (Session mode)
  return `${baseUrl}${separator}pool_timeout=10&statement_timeout=${QUERY_TIMEOUT_MS}`;
}

/**
 * Global Prisma client - NO TENANT ISOLATION
 * @security For tenant data, use context.prisma from withErrorHandler instead
 */
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