/**
 * @file seed-asset-categories.ts
 * @description Seed default asset categories for new organizations
 * @module domains/operations/assets
 *
 * FEATURES:
 * - Seeds default asset categories for new organizations
 * - Idempotent (safe to call multiple times)
 * - Uses predefined categories from constants
 *
 * DEFAULT CATEGORIES:
 * - CP: Computing (laptops, desktops)
 * - MO: Monitors & Displays
 * - NT: Networking
 * - PH: Phones & Tablets
 * - FN: Furniture
 * - EL: Electronics
 * - VH: Vehicles
 * - PR: Printers & Peripherals
 *
 * USAGE:
 * Called during organization creation to ensure assets
 * module has default categories available.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// IMPORTS
// ═══════════════════════════════════════════════════════════════════════════════

import { prisma } from '@/lib/core/prisma';
import { DEFAULT_ASSET_CATEGORIES } from '@/lib/constants/asset-categories';

// ═══════════════════════════════════════════════════════════════════════════════
// SEEDING FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Seed default asset categories for an organization.
 * This is called when a new organization is created.
 *
 * The function is idempotent - it will skip if categories already exist.
 *
 * @param organizationId - The organization ID to seed categories for
 *
 * @example
 * // During organization creation
 * await seedDefaultAssetCategories(newOrg.id);
 */
export async function seedDefaultAssetCategories(organizationId: string): Promise<void> {
  try {
    // ─────────────────────────────────────────────────────────────────────────────
    // STEP 1: Check if categories already exist
    // ─────────────────────────────────────────────────────────────────────────────
    const existingCount = await prisma.assetCategory.count({
      where: { tenantId: organizationId },
    });

    if (existingCount > 0) {
      console.log(
        `[seedDefaultAssetCategories] Organization ${organizationId} already has ${existingCount} categories, skipping`
      );
      return;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // STEP 2: Create all default categories in bulk
    // ─────────────────────────────────────────────────────────────────────────────
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
 * Ensure asset categories exist for an organization.
 * This is a safe operation that can be called multiple times.
 *
 * Use this for existing organizations that may need categories seeded,
 * or as a safety check before asset operations.
 *
 * @param organizationId - The organization ID to ensure categories for
 *
 * @example
 * // Before asset creation (safety check)
 * await ensureAssetCategories(tenantId);
 */
export async function ensureAssetCategories(organizationId: string): Promise<void> {
  const existingCount = await prisma.assetCategory.count({
    where: { tenantId: organizationId },
  });

  if (existingCount === 0) {
    await seedDefaultAssetCategories(organizationId);
  }
}
