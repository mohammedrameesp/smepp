/**
 * @file asset-utils.ts
 * @description Asset utility functions - tag generation and type prefix mapping
 * @module domains/operations/assets
 */

import { prisma } from '@/lib/core/prisma';
import { getOrganizationCodePrefix } from '@/lib/utils/code-prefix';

/**
 * Generate a unique asset tag based on category code
 * Format: {ORG_PREFIX}-{CATEGORY_CODE}-{YY}{SEQUENCE}
 * Example: BCE-CP-25001 (BeCreative, Computing, 2025, sequence 001)
 *
 * @param categoryCode - 2-letter category code (e.g., "CP", "MO", "DP")
 * @param tenantId - Organization ID
 * @param orgPrefix - Organization code prefix (e.g., "BCE")
 */
export async function generateAssetTagByCategory(
  categoryCode: string,
  tenantId: string,
  orgPrefix: string
): Promise<string> {
  const yearSuffix = new Date().getFullYear().toString().slice(-2); // "25" for 2025

  // Format: ORG-CAT-YYSEQ (e.g., BCE-CP-25001)
  const searchPrefix = `${orgPrefix.toUpperCase()}-${categoryCode.toUpperCase()}-${yearSuffix}`;

  // Find the highest sequence number for this org/category/year
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

  let nextSequence = 1;

  if (existingAssets.length > 0) {
    const latestTag = existingAssets[0].assetTag;
    if (latestTag) {
      // Extract sequence number from tag like "BCE-CP-25001"
      const seqPart = latestTag.substring(searchPrefix.length);
      const currentSequence = parseInt(seqPart, 10);
      if (!isNaN(currentSequence)) {
        nextSequence = currentSequence + 1;
      }
    }
  }

  // Format sequence with leading zeros (3 digits)
  const sequence = nextSequence.toString().padStart(3, '0');

  return `${searchPrefix}${sequence}`;
}

/**
 * Generate a unique asset tag based on the asset type
 * DEPRECATED: Use generateAssetTagByCategory instead
 * Format: {ORG_PREFIX}-{TYPE_PREFIX}-{YEAR}-{SEQUENCE}
 * Example: BCE-LAP-2024-001, JAS-PHN-2024-002
 */
export async function generateAssetTag(
  assetType: string,
  tenantId: string
): Promise<string> {
  // Get organization's code prefix
  const orgPrefix = await getOrganizationCodePrefix(tenantId);

  const year = new Date().getFullYear();

  // Get type prefix from asset type
  const typePrefix = getAssetTypePrefix(assetType);

  const searchPrefix = `${orgPrefix}-${typePrefix}-${year}-`;

  // Find the highest sequence number for this year, type, and tenant
  const existingAssets = await prisma.asset.findMany({
    where: {
      tenantId,
      assetTag: {
        startsWith: searchPrefix
      }
    },
    orderBy: {
      assetTag: 'desc'
    },
    take: 1
  });

  let nextSequence = 1;

  if (existingAssets.length > 0) {
    const latestTag = existingAssets[0].assetTag;
    if (latestTag) {
      // Extract sequence number from tag like "BCE-LAP-2024-001"
      const parts = latestTag.split('-');
      if (parts.length === 4) {
        const currentSequence = parseInt(parts[3], 10);
        if (!isNaN(currentSequence)) {
          nextSequence = currentSequence + 1;
        }
      }
    }
  }

  // Format sequence with leading zeros (3 digits)
  const sequence = nextSequence.toString().padStart(3, '0');

  return `${searchPrefix}${sequence}`;
}

/**
 * Generate asset tag suggestions based on common asset types
 */
export function getAssetTypePrefix(assetType: string): string {
  const type = assetType.toLowerCase();
  
  // Common prefixes for asset types
  const prefixMap: Record<string, string> = {
    'laptop': 'LAP',
    'desktop': 'DSK', 
    'monitor': 'MON',
    'phone': 'PHN',
    'tablet': 'TAB',
    'printer': 'PRT',
    'camera': 'CAM',
    'headset': 'HDS',
    'keyboard': 'KBD',
    'mouse': 'MSE',
    'server': 'SRV',
    'router': 'RTR',
    'switch': 'SWT',
    'projector': 'PRJ',
    'scanner': 'SCN'
  };
  
  // Try to find a match
  for (const [key, prefix] of Object.entries(prefixMap)) {
    if (type.includes(key)) {
      return prefix;
    }
  }
  
  // Default: first 3 characters of type
  return assetType.toUpperCase().substring(0, 3);
}