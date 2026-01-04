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
  category: string | null;
  brand: string | null;
  model: string;
  serial: string | null;
  configuration: string | null;
  location: string | null;
  supplier: string | null;
  purchaseDate: Date | null;
  warrantyExpiry: Date | null;
  price: number | null;
  priceCurrency: 'QAR' | 'USD';
  priceQAR: number | null;
  status: AssetStatus;
  assignedUserId: string | null;
  assignmentDate: string | null;
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
  category: ['Category', 'category', 'Category / Department', 'Department'],
  model: ['Model', 'model', 'Model / Version'],
  brand: ['Brand', 'brand', 'Brand / Manufacturer'],
  serial: ['Serial', 'serial', 'Serial Number'],
  configuration: ['Configuration', 'configuration', 'Configuration / Specs', 'Specs'],
  location: ['Location', 'location', 'Physical Location'],
  purchaseDate: ['Purchase Date', 'purchase_date', 'purchaseDate'],
  warrantyExpiry: ['Warranty Expiry', 'warranty_expiry', 'warrantyExpiry', 'Warranty'],
  supplier: ['Supplier', 'supplier', 'Supplier / Vendor', 'Vendor'],
  assignedUserId: ['Assigned User ID', 'assignedUserId', 'assigned_user_id'],
  assignedUser: ['Assigned User', 'assigned_user', 'Assigned To', 'User'],
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
  const category = getRowValue(ASSET_COLUMN_MAPPINGS.category);
  const model = getRowValue(ASSET_COLUMN_MAPPINGS.model);
  const brand = getRowValue(ASSET_COLUMN_MAPPINGS.brand);
  const serial = getRowValue(ASSET_COLUMN_MAPPINGS.serial);
  const configuration = getRowValue(ASSET_COLUMN_MAPPINGS.configuration);
  const location = getRowValue(ASSET_COLUMN_MAPPINGS.location);
  const purchaseDateStr = getRowValue(ASSET_COLUMN_MAPPINGS.purchaseDate);
  const warrantyExpiryStr = getRowValue(ASSET_COLUMN_MAPPINGS.warrantyExpiry);
  const supplier = getRowValue(ASSET_COLUMN_MAPPINGS.supplier);
  const assignedUserId = getRowValue(ASSET_COLUMN_MAPPINGS.assignedUserId);
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
      category: category || null,
      brand: brand || null,
      model,
      serial: serial || null,
      configuration: configuration || null,
      location: location || null,
      supplier: supplier || null,
      purchaseDate,
      warrantyExpiry,
      price,
      priceCurrency,
      priceQAR,
      status,
      assignedUserId: assignedUserId || null,
      assignmentDate: assignmentDate || null,
    },
  };
}

/**
 * Asset data ready for Prisma create/update operations
 */
export interface AssetDbData {
  type: string;
  category: string | null;
  brand: string | null;
  model: string;
  serial: string | null;
  configuration: string | null;
  location: string | null;
  supplier: string | null;
  purchaseDate: Date | null;
  warrantyExpiry: Date | null;
  price: number | null;
  priceCurrency: 'QAR' | 'USD';
  priceQAR: number | null;
  status: AssetStatus;
  assignedUserId: string | null;
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
    category: data.category,
    brand: data.brand,
    model: data.model,
    serial: data.serial,
    configuration: data.configuration,
    location: data.location,
    supplier: data.supplier,
    purchaseDate: data.purchaseDate,
    warrantyExpiry: data.warrantyExpiry,
    price: data.price,
    priceCurrency: data.priceCurrency,
    priceQAR: data.priceQAR,
    status: data.status,
    assignedUserId: data.assignedUserId,
    assignmentDate: data.assignmentDate,
  };
}
