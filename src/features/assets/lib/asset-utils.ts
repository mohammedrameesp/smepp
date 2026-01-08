/**
 * @file asset-utils.ts
 * @description Asset utility functions for tag generation and naming
 * @module domains/operations/assets
 *
 * FEATURES:
 * - Unique asset tag generation with category-based prefixes
 * - Tenant-specific sequential numbering
 * - Year-based tag formatting (ORG-CAT-YYSEQ)
 *
 * TAG FORMAT:
 * - {ORG_PREFIX}-{CATEGORY_CODE}-{YY}{SEQUENCE}
 * - Example: ORG-CP-25001 (BeCreative, Computing, 2025, sequence 001)
 * - Sequence resets each year per category
 *
 * USAGE:
 * Called when creating new assets to auto-generate unique tags
 */

// ═══════════════════════════════════════════════════════════════════════════════
// IMPORTS
// ═══════════════════════════════════════════════════════════════════════════════

import { prisma } from '@/lib/core/prisma';

// ═══════════════════════════════════════════════════════════════════════════════
// TAG GENERATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate a unique asset tag based on category code.
 *
 * Format: {ORG_PREFIX}-{CATEGORY_CODE}-{YY}{SEQUENCE}
 * Example: ORG-CP-25001 (BeCreative, Computing, 2025, sequence 001)
 *
 * The sequence number:
 * - Is 3 digits with leading zeros (001, 002, etc.)
 * - Resets each year for each category
 * - Is tenant-isolated (won't conflict across organizations)
 *
 * @param categoryCode - 2-letter category code (e.g., "CP" for Computing, "MO" for Monitor)
 * @param tenantId - Organization ID for tenant isolation
 * @param orgPrefix - Organization code prefix (e.g., "ORG" for BeCreative)
 * @returns Promise resolving to unique asset tag string
 *
 * @example
 * const tag = await generateAssetTagByCategory('CP', 'tenant-123', 'ORG');
 * // Returns: 'ORG-CP-25001' (first computing asset in 2025)
 *
 * @example
 * const tag = await generateAssetTagByCategory('MO', 'tenant-123', 'ORG');
 * // Returns: 'ORG-MO-25001' (first monitor asset in 2025)
 */
export async function generateAssetTagByCategory(
  categoryCode: string,
  tenantId: string,
  orgPrefix: string
): Promise<string> {
  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 1: Build search prefix with year suffix
  // ─────────────────────────────────────────────────────────────────────────────
  const yearSuffix = new Date().getFullYear().toString().slice(-2); // "25" for 2025
  const searchPrefix = `${orgPrefix.toUpperCase()}-${categoryCode.toUpperCase()}-${yearSuffix}`;

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 2: Find highest sequence number for this org/category/year
  // ─────────────────────────────────────────────────────────────────────────────
  const existingAssets = await prisma.asset.findMany({
    where: {
      tenantId,
      assetTag: {
        startsWith: searchPrefix,
      },
    },
    orderBy: {
      assetTag: 'desc',
    },
    take: 1,
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 3: Calculate next sequence number
  // ─────────────────────────────────────────────────────────────────────────────
  let nextSequence = 1;

  if (existingAssets.length > 0) {
    const latestTag = existingAssets[0].assetTag;
    if (latestTag) {
      // Extract sequence number from tag like "ORG-CP-25001"
      const seqPart = latestTag.substring(searchPrefix.length);
      const currentSequence = parseInt(seqPart, 10);
      if (!isNaN(currentSequence)) {
        nextSequence = currentSequence + 1;
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 4: Format and return the complete asset tag
  // ─────────────────────────────────────────────────────────────────────────────
  const sequence = nextSequence.toString().padStart(3, '0');
  return `${searchPrefix}${sequence}`;
}
