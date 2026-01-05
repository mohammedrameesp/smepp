/**
 * @file asset-update.ts
 * @description Asset update utilities - price calculation, change detection, and data transformation
 * @module domains/operations/assets
 *
 * PURPOSE:
 * Provides reusable functions for updating assets.
 * Handles currency conversion, change detection, and field transformations.
 *
 * FEATURES:
 * - QAR price calculation with USD conversion
 * - Change detection with human-readable formatting
 * - Data transformation for Prisma compatibility
 */

import { Asset } from '@prisma/client';
import { convertToQAR } from '@/lib/core/currency';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface PriceConversionResult {
  priceQAR: number | null;
}

export interface ChangeDetail {
  field: string;
  label: string;
  oldValue: unknown;
  newValue: unknown;
  formattedChange: string;
}

// Human-readable labels for asset fields
export const ASSET_FIELD_LABELS: Record<string, string> = {
  assetTag: 'Asset Tag',
  brand: 'Brand',
  model: 'Model',
  type: 'Type',
  serial: 'Serial Number',
  configuration: 'Configuration',
  purchaseDate: 'Purchase Date',
  supplier: 'Supplier',
  invoiceNumber: 'Invoice Number',
  price: 'Price',
  priceCurrency: 'Currency',
  priceQAR: 'Price (QAR)',
  warrantyExpiry: 'Warranty Expiry',
  status: 'Status',
  assignedMemberId: 'Assigned Member',
  assignmentDate: 'Assignment Date',
  notes: 'Notes',
  location: 'Location',
  isShared: 'Shared Resource',
};

// ═══════════════════════════════════════════════════════════════════════════════
// PRICE CALCULATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate priceQAR for an asset update, handling various scenarios:
 * - Price is being updated
 * - Currency is being updated
 * - Both are being updated
 *
 * Supports ALL currencies configured by the tenant, not just USD.
 * Uses tenant-specific exchange rates from SystemSettings.
 *
 * @param data - Update data with optional price/priceCurrency
 * @param currentAsset - Current asset state
 * @param tenantId - Organization ID for exchange rate lookup
 * @param explicitPriceQAR - Explicitly provided priceQAR (if any)
 * @returns Calculated priceQAR or undefined if no calculation needed
 *
 * @example
 * // USD price being updated
 * const qar = await calculateAssetPriceQAR({ price: 100, priceCurrency: 'USD' }, asset, 'tenant-123');
 *
 * // EUR price with tenant-specific rate
 * const qar = await calculateAssetPriceQAR({ price: 100, priceCurrency: 'EUR' }, asset, 'tenant-123');
 */
export async function calculateAssetPriceQAR(
  data: { price?: number | null; priceCurrency?: string | null },
  currentAsset: Pick<Asset, 'price' | 'priceCurrency'>,
  tenantId: string,
  explicitPriceQAR?: number | null
): Promise<number | null | undefined> {
  // If explicit priceQAR provided and price is being updated, use explicit
  if (explicitPriceQAR !== undefined && data.price !== undefined) {
    return explicitPriceQAR;
  }

  // If price is being updated
  if (data.price !== undefined) {
    const price = data.price;
    // Handle null priceCurrency by treating it as 'QAR' (default base currency)
    const currency = data.priceCurrency ?? currentAsset.priceCurrency ?? 'QAR';

    if (price && !explicitPriceQAR) {
      return convertToQAR(price, currency, tenantId);
    }
  }

  // If only currency is changing (not price)
  if (data.priceCurrency !== undefined && data.priceCurrency !== null && data.price === undefined) {
    const currentPrice = currentAsset.price ? Number(currentAsset.price) : 0;
    if (currentPrice > 0) {
      return convertToQAR(currentPrice, data.priceCurrency, tenantId);
    }
  }

  return undefined;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHANGE DETECTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Format a value for display in change logs
 *
 * @param value - Value to format
 * @param fieldKey - Field name for context-specific formatting
 * @param userMap - Map of user IDs to names/emails for user fields
 * @returns Formatted string representation
 */
export function formatChangeValue(
  value: unknown,
  fieldKey?: string,
  userMap?: Map<string, { name: string | null; email: string }>
): string {
  if (value === null || value === undefined || value === '') {
    // For member field, show "Unassigned" instead of "(empty)"
    if (fieldKey === 'assignedMemberId') return 'Unassigned';
    return '(empty)';
  }
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return value.toString();
  if (value instanceof Date) return value.toISOString().split('T')[0];

  // For member ID fields, use pre-fetched member data
  if (fieldKey === 'assignedMemberId' && typeof value === 'string' && userMap) {
    const user = userMap.get(value);
    return user?.name || user?.email || value;
  }

  return String(value);
}

/**
 * Normalize a value for comparison (handles dates, decimals, empty values)
 */
function normalizeForComparison(value: unknown): unknown {
  // Convert dates to ISO date string
  if (value instanceof Date) {
    return value.toISOString().split('T')[0];
  }

  // Convert Decimal to number
  if (value && typeof value === 'object' && 'toNumber' in value) {
    return (value as { toNumber: () => number }).toNumber();
  }

  // Normalize empty values
  if (value === null || value === undefined || value === '') {
    return null;
  }

  return value;
}

/**
 * Detect which fields changed between old and new data
 *
 * @param newData - New values being set
 * @param currentAsset - Current asset state
 * @param userMap - Map of user IDs to names for display
 * @param skipFields - Fields to skip (e.g., 'assignmentDate' which isn't stored)
 * @returns Array of change details
 */
export function detectAssetChanges(
  newData: Record<string, unknown>,
  currentAsset: Record<string, unknown>,
  userMap: Map<string, { name: string | null; email: string }>,
  skipFields: string[] = ['assignmentDate']
): ChangeDetail[] {
  const changes: ChangeDetail[] = [];

  for (const key in newData) {
    // Skip fields that are not stored on the asset model
    if (skipFields.includes(key)) continue;

    const newValue = newData[key];
    const oldValue = currentAsset[key];

    // Normalize values for comparison
    const normalizedOld = normalizeForComparison(oldValue);
    let normalizedNew = normalizeForComparison(newValue);

    // Convert numeric strings to numbers for comparison
    if (typeof newValue === 'string' && !isNaN(parseFloat(newValue)) && isFinite(Number(newValue))) {
      if (typeof normalizedOld === 'number') {
        normalizedNew = parseFloat(newValue);
      }
    }

    // Check if value actually changed
    if (normalizedOld !== normalizedNew) {
      const label = ASSET_FIELD_LABELS[key] || key;
      const beforeText = formatChangeValue(oldValue, key, userMap);
      const afterText = formatChangeValue(newValue, key, userMap);

      changes.push({
        field: key,
        label,
        oldValue,
        newValue,
        formattedChange: `${label}: ${beforeText} → ${afterText}`,
      });
    }
  }

  return changes;
}

/**
 * Get list of changed field labels
 */
export function getChangedFieldLabels(changes: ChangeDetail[]): string[] {
  return changes.map(c => c.label);
}

/**
 * Get formatted change messages for history/logging
 */
export function getFormattedChanges(changes: ChangeDetail[]): string[] {
  return changes.map(c => c.formattedChange);
}

// ═══════════════════════════════════════════════════════════════════════════════
// DATA TRANSFORMATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Transform update data for Prisma compatibility
 * - Converts date strings to Date objects
 * - Converts relation IDs to Prisma connect/disconnect syntax
 * - Removes non-model fields like assignmentDate
 *
 * @param data - Raw update data
 * @returns Transformed data ready for Prisma
 */
export function transformAssetUpdateData(
  data: Record<string, unknown>
): Record<string, unknown> {
  const transformed = { ...data };

  // Remove fields that are only used for history tracking
  delete transformed.assignmentDate;
  delete transformed.statusChangeDate;

  // Convert date strings to Date objects
  if (transformed.purchaseDate !== undefined) {
    transformed.purchaseDate = transformed.purchaseDate
      ? new Date(transformed.purchaseDate as string)
      : null;
  }
  if (transformed.warrantyExpiry !== undefined) {
    transformed.warrantyExpiry = transformed.warrantyExpiry
      ? new Date(transformed.warrantyExpiry as string)
      : null;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Convert relation IDs to Prisma connect/disconnect syntax
  // Prisma requires relations to be set via nested writes, not direct IDs
  // ─────────────────────────────────────────────────────────────────────────────

  // assignedMemberId → assignedMember
  if (transformed.assignedMemberId !== undefined) {
    const memberId = transformed.assignedMemberId === '' ? null : transformed.assignedMemberId;
    delete transformed.assignedMemberId;
    if (memberId) {
      transformed.assignedMember = { connect: { id: memberId } };
    } else {
      transformed.assignedMember = { disconnect: true };
    }
  }

  // categoryId → assetCategory
  if (transformed.categoryId !== undefined) {
    const categoryId = transformed.categoryId === '' ? null : transformed.categoryId;
    delete transformed.categoryId;
    if (categoryId) {
      transformed.assetCategory = { connect: { id: categoryId } };
    } else {
      transformed.assetCategory = { disconnect: true };
    }
  }

  // locationId → location
  if (transformed.locationId !== undefined) {
    const locationId = transformed.locationId === '' ? null : transformed.locationId;
    delete transformed.locationId;
    if (locationId) {
      transformed.location = { connect: { id: locationId } };
    } else {
      transformed.location = { disconnect: true };
    }
  }

  // depreciationCategoryId → depreciationCategory
  if (transformed.depreciationCategoryId !== undefined) {
    const depCategoryId = transformed.depreciationCategoryId === '' ? null : transformed.depreciationCategoryId;
    delete transformed.depreciationCategoryId;
    if (depCategoryId) {
      transformed.depreciationCategory = { connect: { id: depCategoryId } };
    } else {
      transformed.depreciationCategory = { disconnect: true };
    }
  }

  return transformed;
}
