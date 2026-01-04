/**
 * @file seed-asset-categories.ts
 * @description Seed default asset categories for new organizations
 * @module domains/operations/assets
 */

import { prisma } from '@/lib/core/prisma';
import { DEFAULT_ASSET_CATEGORIES } from '@/lib/constants/asset-categories';

/**
 * Seed default asset categories for an organization
 * This is called when a new organization is created
 *
 * @param organizationId - The organization ID to seed categories for
 */
export async function seedDefaultAssetCategories(organizationId: string): Promise<void> {
  try {
    // Check if categories already exist for this organization
    const existingCount = await prisma.assetCategory.count({
      where: { tenantId: organizationId },
    });

    if (existingCount > 0) {
      console.log(
        `[seedDefaultAssetCategories] Organization ${organizationId} already has ${existingCount} categories, skipping`
      );
      return;
    }

    // Create all default categories
    await prisma.assetCategory.createMany({
      data: DEFAULT_ASSET_CATEGORIES.map((cat, index) => ({
        tenantId: organizationId,
        code: cat.code,
        name: cat.name,
        description: cat.description,
        icon: cat.icon,
        isDefault: true,
        isActive: true,
        sortOrder: index,
      })),
    });

    console.log(
      `[seedDefaultAssetCategories] Created ${DEFAULT_ASSET_CATEGORIES.length} categories for organization ${organizationId}`
    );
  } catch (error) {
    console.error('[seedDefaultAssetCategories] Error:', error);
    throw error;
  }
}

/**
 * Ensure asset categories exist for an organization
 * This is a safe operation that can be called multiple times
 * Used for existing organizations that need categories seeded
 *
 * @param organizationId - The organization ID
 */
export async function ensureAssetCategories(organizationId: string): Promise<void> {
  const existingCount = await prisma.assetCategory.count({
    where: { tenantId: organizationId },
  });

  if (existingCount === 0) {
    await seedDefaultAssetCategories(organizationId);
  }
}
