import { prisma } from '@/lib/core/prisma';

/**
 * Generate a unique asset tag based on the asset type
 * Format: {TYPE_PREFIX}-{YEAR}-{SEQUENCE}
 * Example: LAP-2024-001, PHN-2024-002, MON-2024-003
 */
export async function generateAssetTag(assetType: string): Promise<string> {
  const year = new Date().getFullYear();
  
  // Create prefix from asset type (first 3 characters, uppercase)
  const prefix = assetType.toUpperCase().substring(0, 3);
  
  // Find the highest sequence number for this year and type
  const existingAssets = await prisma.asset.findMany({
    where: {
      assetTag: {
        startsWith: `${prefix}-${year}-`
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
      // Extract sequence number from tag like "LAP-2024-001"
      const parts = latestTag.split('-');
      if (parts.length === 3) {
        const currentSequence = parseInt(parts[2], 10);
        if (!isNaN(currentSequence)) {
          nextSequence = currentSequence + 1;
        }
      }
    }
  }
  
  // Format sequence with leading zeros (3 digits)
  const sequence = nextSequence.toString().padStart(3, '0');
  
  return `${prefix}-${year}-${sequence}`;
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