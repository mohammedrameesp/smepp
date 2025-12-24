import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Build connection URL with pool settings for serverless
function getConnectionUrl(): string {
  const baseUrl = process.env.DATABASE_URL || '';

  // If URL already has query params, append with &, otherwise use ?
  const separator = baseUrl.includes('?') ? '&' : '?';

  // Limit connections per serverless instance to prevent pool exhaustion
  // connection_limit=1 is recommended for serverless to prevent MaxClientsInSessionMode
  return `${baseUrl}${separator}connection_limit=1&pool_timeout=10`;
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
  });

// Cache Prisma client to prevent connection exhaustion in serverless
globalForPrisma.prisma = prisma;

// Type for Prisma transaction client (used inside $transaction callbacks)
export type PrismaTransactionClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;