/**
 * @file asset-import.ts
 * @description Asset CSV/Excel import utilities - parsing, validation, and processing
 * @module domains/operations/assets
 *
 * PURPOSE:
 * Provides reusable functions for importing assets from CSV/Excel files.
 * Handles flexible column name matching, validation, and database operations.
 *
 * FEATURES:
 * - Flexible column name matching (accepts various naming conventions)
 * - Currency conversion (QAR/USD)
 * - Status parsing
 * - Date parsing with multiple format support
 */

import { AssetStatus } from '@prisma/client';
import {
  createRowValueGetter,
  parseEnumValue,
  convertPriceWithQAR,
  type ImportRow,
} from '@/lib/core/import-utils';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface ParsedAssetData {
  id?: string;
  assetTag?: string;
  type: string;
  brand: string | null;
  model: string;
  serial: string | null;
  configuration: string | null;
  supplier: string | null;
  purchaseDate: Date | null;
  warrantyExpiry: Date | null;
  price: number | null;
  priceCurrency: 'QAR' | 'USD';
  priceQAR: number | null;
  status: AssetStatus;
  assignedMemberId: string | null;
  assignmentDate: string | null;
  // Note: Location and Category are now relationships - must be assigned manually after import
}

export type AssetParseResult =
  | { success: true; data: ParsedAssetData }
  | { success: false; error: string };

// ═══════════════════════════════════════════════════════════════════════════════
// COLUMN MAPPINGS
// Each key maps to an array of possible column names in CSV/Excel
// ═══════════════════════════════════════════════════════════════════════════════

const ASSET_COLUMN_MAPPINGS: Record<string, string[]> = {
  id: ['ID', 'id', 'Asset ID'],
  assetTag: ['Asset Tag', 'asset_tag', 'assetTag', 'Tag'],
  type: ['Asset Type', 'Type', 'type', 'asset_type'],
  // Note: category column removed - use AssetCategory relation via UI after import
  model: ['Model', 'model', 'Model / Version'],
  brand: ['Brand', 'brand', 'Brand / Manufacturer'],
  serial: ['Serial', 'serial', 'Serial Number'],
  configuration: ['Configuration', 'configuration', 'Configuration / Specs', 'Specs'],
  location: ['Location', 'location', 'Physical Location'],
  purchaseDate: ['Purchase Date', 'purchase_date', 'purchaseDate'],
  warrantyExpiry: ['Warranty Expiry', 'warranty_expiry', 'warrantyExpiry', 'Warranty'],
  supplier: ['Supplier', 'supplier', 'Supplier / Vendor', 'Vendor'],
  assignedMemberId: ['Assigned Member ID', 'Assigned User ID', 'assignedMemberId', 'assigned_member_id', 'assigned_user_id'],
  assignedMember: ['Assigned Member', 'Assigned User', 'assigned_member', 'assigned_user', 'Assigned To'],
  assignmentDate: ['Assignment Date', 'assignmentDate', 'assignment_date'],
  status: ['Status', 'status'],
  price: ['Price', 'price', 'Cost', 'Cost / Value'],
  currency: ['Currency', 'currency'],
};

// ═══════════════════════════════════════════════════════════════════════════════
// PARSING FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Parse a single row from CSV/Excel into asset data
 *
 * @param row - Raw row data from CSV/Excel parser
 * @returns Parsed asset data or error message
 *
 * @example
 * const result = parseAssetRow({ 'Type': 'Laptop', 'Model': 'ThinkPad X1' });
 * if (result.success) {
 *   console.log(result.data.type); // 'Laptop'
 * }
 */
export function parseAssetRow(row: ImportRow): AssetParseResult {
  const getRowValue = createRowValueGetter(row);

  // Extract values with flexible column name matching
  const id = getRowValue(ASSET_COLUMN_MAPPINGS.id);
  const assetTag = getRowValue(ASSET_COLUMN_MAPPINGS.assetTag);
  const type = getRowValue(ASSET_COLUMN_MAPPINGS.type);
  // Note: category removed - use AssetCategory relation via UI after import
  const model = getRowValue(ASSET_COLUMN_MAPPINGS.model);
  const brand = getRowValue(ASSET_COLUMN_MAPPINGS.brand);
  const serial = getRowValue(ASSET_COLUMN_MAPPINGS.serial);
  const configuration = getRowValue(ASSET_COLUMN_MAPPINGS.configuration);
  // Note: Location is now a relationship - must be assigned manually after import
  const purchaseDateStr = getRowValue(ASSET_COLUMN_MAPPINGS.purchaseDate);
  const warrantyExpiryStr = getRowValue(ASSET_COLUMN_MAPPINGS.warrantyExpiry);
  const supplier = getRowValue(ASSET_COLUMN_MAPPINGS.supplier);
  const assignedMemberId = getRowValue(ASSET_COLUMN_MAPPINGS.assignedMemberId);
  const assignmentDate = getRowValue(ASSET_COLUMN_MAPPINGS.assignmentDate);
  const statusStr = getRowValue(ASSET_COLUMN_MAPPINGS.status);
  const priceStr = getRowValue(ASSET_COLUMN_MAPPINGS.price);
  const currencyStr = getRowValue(ASSET_COLUMN_MAPPINGS.currency);

  // Validate required fields
  if (!type || !model) {
    return {
      success: false,
      error: 'Missing required fields: Need at least Type and Model columns',
    };
  }

  // Parse status
  const status = parseEnumValue<AssetStatus>(
    statusStr,
    [AssetStatus.IN_USE, AssetStatus.SPARE, AssetStatus.REPAIR, AssetStatus.DISPOSED],
    AssetStatus.IN_USE
  );

  // Parse currency
  const priceCurrency = parseEnumValue<'QAR' | 'USD'>(currencyStr, ['QAR', 'USD'], 'QAR');

  // Parse price and convert to QAR
  let price: number | null = null;
  let priceQAR: number | null = null;
  if (priceStr) {
    const priceValue = parseFloat(priceStr);
    if (!isNaN(priceValue)) {
      const converted = convertPriceWithQAR(priceValue, priceCurrency);
      price = converted.price;
      priceQAR = converted.priceQAR;
    }
  }

  // Parse dates
  const purchaseDate = purchaseDateStr ? new Date(purchaseDateStr) : null;
  const warrantyExpiry = warrantyExpiryStr ? new Date(warrantyExpiryStr) : null;

  return {
    success: true,
    data: {
      id: id || undefined,
      assetTag: assetTag || undefined,
      type,
      brand: brand || null,
      model,
      serial: serial || null,
      configuration: configuration || null,
      supplier: supplier || null,
      purchaseDate,
      warrantyExpiry,
      price,
      priceCurrency,
      priceQAR,
      status,
      assignedMemberId: assignedMemberId || null,
      assignmentDate: assignmentDate || null,
    },
  };
}

/**
 * Asset data ready for Prisma create/update operations
 * Note: Location and Category are relationships - must be assigned manually after import
 */
export interface AssetDbData {
  type: string;
  brand: string | null;
  model: string;
  serial: string | null;
  configuration: string | null;
  supplier: string | null;
  purchaseDate: Date | null;
  warrantyExpiry: Date | null;
  price: number | null;
  priceCurrency: 'QAR' | 'USD';
  priceQAR: number | null;
  status: AssetStatus;
  assignedMemberId: string | null;
  assignmentDate: string | null;
  assetTag?: string;
}

/**
 * Build Prisma-compatible asset data object from parsed data
 *
 * @param data - Parsed asset data
 * @returns Object ready for Prisma create/update
 */
export function buildAssetDbData(data: ParsedAssetData): AssetDbData {
  return {
    type: data.type,
    brand: data.brand,
    model: data.model,
    serial: data.serial,
    configuration: data.configuration,
    supplier: data.supplier,
    purchaseDate: data.purchaseDate,
    warrantyExpiry: data.warrantyExpiry,
    price: data.price,
    priceCurrency: data.priceCurrency,
    priceQAR: data.priceQAR,
    status: data.status,
    assignedMemberId: data.assignedMemberId,
    assignmentDate: data.assignmentDate,
  };
}
