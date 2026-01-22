/**
 * @file subscription-utils.ts
 * @description Subscription utility functions for tag generation
 * @module features/subscriptions/lib
 *
 * FEATURES:
 * - Unique subscription tag generation with collision handling
 * - Tenant-specific sequential numbering
 * - Configurable tag format via organization settings
 * - Retry logic for concurrent creation scenarios
 *
 * TAG FORMAT (default, configurable):
 * - {PREFIX}-SUB-{YYMM}-{SEQ:3}
 * - Example: ORG-SUB-2501-001 (BeCreative, Subscription, Jan 2025, sequence 001)
 * - Sequence resets each month per organization (when format includes {YYMM})
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
import { generateFormattedCode, getEntityFormat, applyFormat, getOrganizationCodePrefix } from '@/lib/utils/code-prefix';

/** Maximum retries for tag generation on collision */
const MAX_TAG_GENERATION_RETRIES = 3;

/**
 * Generate a unique subscription tag using configurable format.
 *
 * Default Format: {PREFIX}-SUB-{YYMM}-{SEQ:3}
 * Example: ORG-SUB-2501-001 (BeCreative, Jan 2025, sequence 001)
 *
 * The format can be customized per organization via settings.
 * The sequence number resets based on the time tokens in the format:
 * - {YYMM} or {YYYYMM}: Resets monthly
 * - {YYYY} or {YY}: Resets yearly
 * - No time token: Global sequence
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
  const now = new Date();

  // Get the configurable format for subscriptions
  const format = await getEntityFormat(tenantId, 'subscriptions');

  // Build search prefix by applying format without sequence
  // This determines what prefix to search for existing tags
  const searchPrefix = buildSearchPrefix(format, orgPrefix, now);

  // Find highest sequence number for this prefix
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
      // Extract sequence number from the end of the tag
      const seqMatch = latestTag.match(/(\d+)$/);
      if (seqMatch) {
        const currentSequence = parseInt(seqMatch[1], 10);
        if (!isNaN(currentSequence)) {
          nextSequence = currentSequence + 1;
        }
      }
    }
  }

  // Add retry offset for collision handling
  nextSequence += retryOffset;

  // Generate the complete tag using the configurable format
  return applyFormat(format, {
    prefix: orgPrefix,
    sequenceNumber: nextSequence,
    date: now,
  });
}

/**
 * Build a search prefix from format by replacing time tokens but not SEQ
 * This creates a prefix to search for existing tags in the same period
 */
function buildSearchPrefix(format: string, prefix: string, date: Date): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  let result = format;

  // Replace all tokens except SEQ
  result = result.replace(/\{PREFIX\}/gi, prefix);
  result = result.replace(/\{YYYY\}/gi, year.toString());
  result = result.replace(/\{YY\}/gi, year.toString().slice(-2));
  result = result.replace(/\{MM\}/gi, month.toString().padStart(2, '0'));
  result = result.replace(/\{DD\}/gi, day.toString().padStart(2, '0'));
  result = result.replace(/\{YYMM\}/gi, year.toString().slice(-2) + month.toString().padStart(2, '0'));
  result = result.replace(/\{YYYYMM\}/gi, year.toString() + month.toString().padStart(2, '0'));
  result = result.replace(/\{TYPE\}/gi, ''); // Subscriptions don't use TYPE

  // Remove SEQ token and everything after it for prefix matching
  result = result.replace(/\{SEQ(:\d+)?\}.*$/, '');

  return result;
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
