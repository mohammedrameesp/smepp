/**
 * @file subscription-utils.ts
 * @description Subscription utility functions for tag generation
 * @module features/subscriptions/lib
 *
 * FEATURES:
 * - Unique subscription tag generation with collision handling
 * - Tenant-specific sequential numbering
 * - Year-month based tag formatting (ORG-SUB-YYMM-SEQ)
 * - Retry logic for concurrent creation scenarios
 *
 * TAG FORMAT:
 * - {ORG_PREFIX}-SUB-{YYMM}-{SEQUENCE}
 * - Example: ORG-SUB-2501-001 (BeCreative, Subscription, Jan 2025, sequence 001)
 * - Sequence resets each month per organization
 *
 * USAGE:
 * Called when creating new subscriptions to auto-generate unique tags
 *
 * CONCURRENCY:
 * Uses optimistic locking - if a collision occurs during creation,
 * the database unique constraint [tenantId, subscriptionTag] will
 * prevent duplicates. The calling code should handle P2002 errors
 * by regenerating the tag.
 */

import { prisma } from '@/lib/core/prisma';

/** Maximum retries for tag generation on collision */
const MAX_TAG_GENERATION_RETRIES = 3;

/**
 * Generate a unique subscription tag.
 *
 * Format: {ORG_PREFIX}-SUB-{YYMM}-{SEQUENCE}
 * Example: ORG-SUB-2501-001 (BeCreative, Jan 2025, sequence 001)
 *
 * The sequence number:
 * - Is 3 digits with leading zeros (001, 002, etc.)
 * - Resets each month
 * - Is tenant-isolated (won't conflict across organizations)
 *
 * CONCURRENCY HANDLING:
 * Under concurrent requests, the find-then-increment pattern could produce
 * duplicates. The database unique constraint [tenantId, subscriptionTag]
 * ensures no actual duplicates. If a collision occurs during insert,
 * Prisma throws P2002 error which should trigger a retry with a new tag.
 *
 * @param tenantId - Organization ID for tenant isolation
 * @param orgPrefix - Organization code prefix (e.g., "ORG" for BeCreative)
 * @param retryOffset - Offset to add to sequence on retry (default: 0)
 * @returns Promise resolving to unique subscription tag string
 *
 * @example
 * const tag = await generateSubscriptionTag('tenant-123', 'ORG');
 * // Returns: 'ORG-SUB-2501-001' (first subscription in Jan 2025)
 */
export async function generateSubscriptionTag(
  tenantId: string,
  orgPrefix: string,
  retryOffset: number = 0
): Promise<string> {
  // Build search prefix with year-month suffix
  const now = new Date();
  const yearMonth = `${now.getFullYear().toString().slice(-2)}${(now.getMonth() + 1).toString().padStart(2, '0')}`;
  const searchPrefix = `${orgPrefix.toUpperCase()}-SUB-${yearMonth}-`;

  // Find highest sequence number for this org/month
  const existingSubscriptions = await prisma.subscription.findMany({
    where: {
      tenantId,
      subscriptionTag: {
        startsWith: searchPrefix,
      },
    },
    orderBy: {
      subscriptionTag: 'desc',
    },
    take: 1,
  });

  // Calculate next sequence number
  let nextSequence = 1;

  if (existingSubscriptions.length > 0) {
    const latestTag = existingSubscriptions[0].subscriptionTag;
    if (latestTag) {
      // Extract sequence number from tag like "ORG-SUB-2501-001"
      const seqPart = latestTag.substring(searchPrefix.length);
      const currentSequence = parseInt(seqPart, 10);
      if (!isNaN(currentSequence)) {
        nextSequence = currentSequence + 1;
      }
    }
  }

  // Add retry offset for collision handling
  nextSequence += retryOffset;

  // Format and return the complete subscription tag
  const sequence = nextSequence.toString().padStart(3, '0');
  return `${searchPrefix}${sequence}`;
}

/**
 * Check if an error is a Prisma unique constraint violation.
 *
 * @param error - Error to check
 * @returns True if this is a unique constraint violation (P2002)
 */
export function isUniqueConstraintError(error: unknown): boolean {
  return (
    error !== null &&
    typeof error === 'object' &&
    'code' in error &&
    error.code === 'P2002'
  );
}

/**
 * Get the maximum number of retries for tag generation.
 * Exported for use in API routes that need retry logic.
 */
export { MAX_TAG_GENERATION_RETRIES };
