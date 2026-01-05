/**
 * @file service.ts
 * @description Asset depreciation service - database operations for depreciation calculations
 * @module domains/operations/assets/depreciation
 */

import { prisma } from '@/lib/core/prisma';
import { Prisma } from '@prisma/client';
import {
  calculateMonthlyDepreciation,
  isPeriodAlreadyProcessed,
  DepreciationInput,
} from './calculator';

export interface DepreciationResult {
  assetId: string;
  success: boolean;
  record?: {
    id: string;
    periodStart: Date;
    periodEnd: Date;
    depreciationAmount: number;
    accumulatedAmount: number;
    netBookValue: number;
  };
  error?: string;
  skipped?: boolean;
  skipReason?: string;
}

/**
 * Run depreciation calculation for a single asset
 */
export async function runDepreciationForAsset(
  assetId: string,
  tenantId: string,
  calculationType: 'SCHEDULED' | 'MANUAL',
  calculatedById?: string,
  calculationDate: Date = new Date()
): Promise<DepreciationResult> {
  try {
    // Fetch asset with depreciation category
    const asset = await prisma.asset.findFirst({
      where: { id: assetId, tenantId },
      include: { depreciationCategory: true },
    });

    if (!asset) {
      return { assetId, success: false, error: 'Asset not found' };
    }

    if (!asset.depreciationCategory) {
      return { assetId, success: false, error: 'No depreciation category assigned' };
    }

    if (asset.isFullyDepreciated) {
      return {
        assetId,
        success: false,
        skipped: true,
        skipReason: 'Asset is fully depreciated',
      };
    }

    // Calculate useful life in months
    const usefulLifeMonths =
      asset.customUsefulLifeMonths || asset.depreciationCategory.usefulLifeYears * 12;

    if (usefulLifeMonths <= 0) {
      return { assetId, success: false, error: 'Invalid useful life (must be > 0)' };
    }

    // Get acquisition cost
    const acquisitionCost = Number(asset.priceQAR || asset.price || 0);
    if (acquisitionCost <= 0) {
      return { assetId, success: false, error: 'Asset has no cost/price value' };
    }

    // Build depreciation input
    const input: DepreciationInput = {
      acquisitionCost,
      salvageValue: Number(asset.salvageValue || 0),
      usefulLifeMonths,
      depreciationStartDate: asset.depreciationStartDate || asset.purchaseDate || new Date(),
      accumulatedDepreciation: Number(asset.accumulatedDepreciation || 0),
    };

    // Check if period already processed
    const periodEnd = new Date(calculationDate.getFullYear(), calculationDate.getMonth() + 1, 0);
    if (isPeriodAlreadyProcessed(periodEnd, asset.lastDepreciationDate)) {
      return {
        assetId,
        success: false,
        skipped: true,
        skipReason: `Depreciation already recorded for period ending ${periodEnd.toISOString().split('T')[0]}`,
      };
    }

    // Calculate monthly depreciation
    const result = calculateMonthlyDepreciation(input, calculationDate);

    if (!result) {
      return {
        assetId,
        success: false,
        skipped: true,
        skipReason: 'No depreciation calculated (may not have started or fully depreciated)',
      };
    }

    // Check for duplicate period in database
    const existing = await prisma.depreciationRecord.findFirst({
      where: {
        assetId,
        tenantId,
        periodEnd: result.periodEnd,
      },
    });

    if (existing) {
      return {
        assetId,
        success: false,
        skipped: true,
        skipReason: `Depreciation already recorded for period ending ${result.periodEnd.toISOString().split('T')[0]}`,
      };
    }

    // Create record and update asset in transaction
    const record = await prisma.$transaction(async (tx) => {
      // Create depreciation record
      const newRecord = await tx.depreciationRecord.create({
        data: {
          tenantId,
          assetId,
          periodStart: result.periodStart,
          periodEnd: result.periodEnd,
          depreciationAmount: new Prisma.Decimal(result.monthlyAmount),
          accumulatedAmount: new Prisma.Decimal(result.newAccumulatedAmount),
          netBookValue: new Prisma.Decimal(result.newNetBookValue),
          calculationType,
          calculatedById,
        },
      });

      // Update asset with new values
      await tx.asset.update({
        where: { id: assetId },
        data: {
          accumulatedDepreciation: new Prisma.Decimal(result.newAccumulatedAmount),
          netBookValue: new Prisma.Decimal(result.newNetBookValue),
          lastDepreciationDate: result.periodEnd,
          isFullyDepreciated: result.isFullyDepreciated,
        },
      });

      return newRecord;
    });

    return {
      assetId,
      success: true,
      record: {
        id: record.id,
        periodStart: record.periodStart,
        periodEnd: record.periodEnd,
        depreciationAmount: Number(record.depreciationAmount),
        accumulatedAmount: Number(record.accumulatedAmount),
        netBookValue: Number(record.netBookValue),
      },
    };
  } catch (error) {
    console.error(`[Depreciation] Error processing asset ${assetId}:`, error);
    return {
      assetId,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Run depreciation for all eligible assets in a tenant
 */
export async function runDepreciationForTenant(
  tenantId: string,
  calculationDate: Date = new Date()
): Promise<{
  totalAssets: number;
  processed: number;
  skipped: number;
  failed: number;
  results: DepreciationResult[];
}> {
  // Find all assets with depreciation categories that are not fully depreciated
  const assets = await prisma.asset.findMany({
    where: {
      tenantId,
      depreciationCategoryId: { not: null },
      isFullyDepreciated: false,
      status: { not: 'DISPOSED' },
    },
    select: { id: true },
  });

  const results: DepreciationResult[] = [];

  for (const asset of assets) {
    const result = await runDepreciationForAsset(
      asset.id,
      tenantId,
      'SCHEDULED',
      undefined,
      calculationDate
    );
    results.push(result);
  }

  return {
    totalAssets: assets.length,
    processed: results.filter((r) => r.success).length,
    skipped: results.filter((r) => r.skipped).length,
    failed: results.filter((r) => !r.success && !r.skipped).length,
    results,
  };
}

/**
 * Get depreciation records for an asset
 */
export async function getDepreciationRecords(
  assetId: string,
  tenantId: string,
  options?: {
    limit?: number;
    offset?: number;
    orderBy?: 'asc' | 'desc';
  }
) {
  const { limit = 100, offset = 0, orderBy = 'desc' } = options || {};

  const records = await prisma.depreciationRecord.findMany({
    where: { assetId, tenantId },
    orderBy: { periodEnd: orderBy },
    take: limit,
    skip: offset,
    include: {
      calculatedBy: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  const total = await prisma.depreciationRecord.count({
    where: { assetId, tenantId },
  });

  return {
    records: records.map((r) => ({
      id: r.id,
      periodStart: r.periodStart,
      periodEnd: r.periodEnd,
      depreciationAmount: Number(r.depreciationAmount),
      accumulatedAmount: Number(r.accumulatedAmount),
      netBookValue: Number(r.netBookValue),
      calculationType: r.calculationType,
      calculatedAt: r.calculatedAt,
      calculatedBy: r.calculatedBy,
      notes: r.notes,
    })),
    total,
    hasMore: offset + records.length < total,
  };
}

/**
 * Assign depreciation category to an asset
 */
export async function assignDepreciationCategory(
  assetId: string,
  tenantId: string,
  data: {
    depreciationCategoryId: string;
    salvageValue?: number;
    customUsefulLifeMonths?: number;
    depreciationStartDate?: Date;
  }
) {
  // Verify category exists
  const category = await prisma.depreciationCategory.findUnique({
    where: { id: data.depreciationCategoryId },
  });

  if (!category) {
    throw new Error('Depreciation category not found');
  }

  // Get the asset to set initial netBookValue
  const asset = await prisma.asset.findFirst({
    where: { id: assetId, tenantId },
    select: { priceQAR: true, price: true, purchaseDate: true },
  });

  if (!asset) {
    throw new Error('Asset not found');
  }

  const acquisitionCost = Number(asset.priceQAR || asset.price || 0);

  // Update asset
  const updatedAsset = await prisma.asset.update({
    where: { id: assetId },
    data: {
      depreciationCategoryId: data.depreciationCategoryId,
      salvageValue: data.salvageValue !== undefined ? new Prisma.Decimal(data.salvageValue) : undefined,
      customUsefulLifeMonths: data.customUsefulLifeMonths,
      depreciationStartDate: data.depreciationStartDate || asset.purchaseDate || new Date(),
      // Reset depreciation values when assigning new category
      accumulatedDepreciation: new Prisma.Decimal(0),
      netBookValue: new Prisma.Decimal(acquisitionCost),
      lastDepreciationDate: null,
      isFullyDepreciated: false,
    },
    include: { depreciationCategory: true },
  });

  return updatedAsset;
}

/**
 * Get all depreciation categories for a tenant
 */
export async function getDepreciationCategories(tenantId: string, activeOnly = true) {
  return prisma.depreciationCategory.findMany({
    where: {
      tenantId,
      ...(activeOnly ? { isActive: true } : {}),
    },
    orderBy: { name: 'asc' },
  });
}

/**
 * Seed default depreciation categories for a tenant (Qatar Tax Rates)
 * Also sets up default mappings to asset categories
 */
export async function seedDepreciationCategories(tenantId: string) {
  const { DEFAULT_DEPRECIATION_CATEGORIES } = await import('./constants');

  const results = [];

  for (const category of DEFAULT_DEPRECIATION_CATEGORIES) {
    const existing = await prisma.depreciationCategory.findFirst({
      where: { tenantId, code: category.code },
    });

    if (!existing) {
      const created = await prisma.depreciationCategory.create({
        data: {
          tenantId,
          name: category.name,
          code: category.code,
          annualRate: new Prisma.Decimal(category.annualRate),
          usefulLifeYears: category.usefulLifeYears,
          description: category.description,
          isActive: true,
        },
      });
      results.push({ code: category.code, action: 'created', id: created.id });

      // Set up default mapping to asset category if specified
      if (category.assetCategoryCode) {
        const assetCategory = await prisma.assetCategory.findFirst({
          where: { tenantId, code: category.assetCategoryCode },
        });
        if (assetCategory) {
          await prisma.assetCategory.update({
            where: { id: assetCategory.id },
            data: { defaultDepreciationCategoryId: created.id },
          });
          results[results.length - 1] = {
            ...results[results.length - 1],
            mappedToAssetCategory: category.assetCategoryCode,
          };
        }
      }
    } else {
      results.push({ code: category.code, action: 'exists', id: existing.id });
    }
  }

  return results;
}

/**
 * Create a depreciation category for a tenant
 */
export async function createDepreciationCategory(
  tenantId: string,
  data: {
    name: string;
    code: string;
    annualRate: number;
    usefulLifeYears: number;
    description?: string;
    isActive?: boolean;
  }
) {
  return prisma.depreciationCategory.create({
    data: {
      tenantId,
      name: data.name,
      code: data.code,
      annualRate: new Prisma.Decimal(data.annualRate),
      usefulLifeYears: data.usefulLifeYears,
      description: data.description,
      isActive: data.isActive ?? true,
    },
  });
}

/**
 * Update a depreciation category
 */
export async function updateDepreciationCategory(
  id: string,
  tenantId: string,
  data: {
    name?: string;
    code?: string;
    annualRate?: number;
    usefulLifeYears?: number;
    description?: string | null;
    isActive?: boolean;
  }
) {
  return prisma.depreciationCategory.update({
    where: { id, tenantId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.code !== undefined && { code: data.code }),
      ...(data.annualRate !== undefined && { annualRate: new Prisma.Decimal(data.annualRate) }),
      ...(data.usefulLifeYears !== undefined && { usefulLifeYears: data.usefulLifeYears }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    },
  });
}

/**
 * Delete a depreciation category (only if not in use)
 */
export async function deleteDepreciationCategory(id: string, tenantId: string) {
  // Check if any assets are using this category
  const assetsUsingCategory = await prisma.asset.count({
    where: { depreciationCategoryId: id, tenantId },
  });

  if (assetsUsingCategory > 0) {
    throw new Error(`Cannot delete: ${assetsUsingCategory} asset(s) are using this category`);
  }

  // Clear any asset category mappings
  await prisma.assetCategory.updateMany({
    where: { defaultDepreciationCategoryId: id, tenantId },
    data: { defaultDepreciationCategoryId: null },
  });

  return prisma.depreciationCategory.delete({
    where: { id, tenantId },
  });
}
