/**
 * @file asset-export.ts
 * @description Asset export utilities - column definitions and data transformation
 * @module domains/operations/assets
 *
 * PURPOSE:
 * Provides reusable functions for exporting assets to CSV/Excel.
 * Handles column definitions, data formatting, and transformation.
 *
 * FEATURES:
 * - Standardized column definitions for consistent exports
 * - Data transformation with proper null handling
 * - Date and currency formatting
 * - Supports assigned member and location relations
 */

import { Asset, AssetCategory, Location, TeamMember } from '@prisma/client';
import { formatDateForCSV, formatCurrencyForCSV } from '@/lib/core/import-export';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Asset with relations needed for export
 */
export type AssetWithExportRelations = Asset & {
  assignedMember: Pick<TeamMember, 'name' | 'email'> | null;
  location: Pick<Location, 'name'> | null;
  assetCategory: Pick<AssetCategory, 'name'> | null;
};

/**
 * Flattened asset data ready for CSV/Excel export
 */
export interface AssetExportRow {
  [key: string]: string; // Index signature for Record<string, unknown> compatibility
  id: string;
  assetTag: string;
  type: string;
  category: string;
  brand: string;
  model: string;
  serial: string;
  configuration: string;
  supplier: string;
  invoiceNumber: string;
  location: string;
  purchaseDate: string;
  price: string;
  priceCurrency: string;
  priceQAR: string;
  warrantyExpiry: string;
  status: string;
  assignmentDate: string;
  notes: string;
  assignedMemberId: string;
  assignedMemberName: string;
  assignedMemberEmail: string;
  createdAt: string;
  updatedAt: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// COLUMN DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Export column definitions with keys and human-readable headers.
 * Used for CSV/Excel header row generation.
 */
export const ASSET_EXPORT_COLUMNS: Array<{ key: keyof AssetExportRow; header: string }> = [
  { key: 'id', header: 'ID' },
  { key: 'assetTag', header: 'Asset Tag' },
  { key: 'type', header: 'Type' },
  { key: 'category', header: 'Category' },
  { key: 'brand', header: 'Brand' },
  { key: 'model', header: 'Model' },
  { key: 'serial', header: 'Serial Number' },
  { key: 'configuration', header: 'Configuration/Specs' },
  { key: 'supplier', header: 'Supplier' },
  { key: 'invoiceNumber', header: 'Invoice/PO Number' },
  { key: 'location', header: 'Location' },
  { key: 'purchaseDate', header: 'Purchase Date' },
  { key: 'price', header: 'Price' },
  { key: 'priceCurrency', header: 'Currency' },
  { key: 'priceQAR', header: 'Price (QAR)' },
  { key: 'warrantyExpiry', header: 'Warranty Expiry' },
  { key: 'status', header: 'Status' },
  { key: 'assignmentDate', header: 'Assignment Date' },
  { key: 'notes', header: 'Notes' },
  { key: 'assignedMemberId', header: 'Assigned Member ID' },
  { key: 'assignedMemberName', header: 'Assigned Member Name' },
  { key: 'assignedMemberEmail', header: 'Assigned Member Email' },
  { key: 'createdAt', header: 'Created At' },
  { key: 'updatedAt', header: 'Updated At' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// TRANSFORMATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Transform a single asset record into a flat export row.
 *
 * @param asset - Asset with relations
 * @returns Flattened row ready for CSV export
 *
 * @example
 * const row = transformAssetForExport(asset);
 * // { id: 'clx...', assetTag: 'ORG-CP-25001', ... }
 */
export function transformAssetForExport(asset: AssetWithExportRelations): AssetExportRow {
  return {
    id: asset.id,
    assetTag: asset.assetTag || '',
    type: asset.type,
    category: asset.assetCategory?.name || '',
    brand: asset.brand || '',
    model: asset.model,
    serial: asset.serial || '',
    configuration: asset.configuration || '',
    supplier: asset.supplier || '',
    invoiceNumber: asset.invoiceNumber || '',
    location: asset.location?.name || '',
    purchaseDate: formatDateForCSV(asset.purchaseDate),
    price: formatCurrencyForCSV(asset.price ? Number(asset.price) : null),
    priceCurrency: asset.priceCurrency || '',
    priceQAR: formatCurrencyForCSV(asset.priceQAR ? Number(asset.priceQAR) : null),
    warrantyExpiry: formatDateForCSV(asset.warrantyExpiry),
    status: asset.status,
    assignmentDate: asset.assignmentDate ? String(asset.assignmentDate) : '',
    notes: asset.notes || '',
    assignedMemberId: asset.assignedMemberId || '',
    assignedMemberName: asset.assignedMember?.name || '',
    assignedMemberEmail: asset.assignedMember?.email || '',
    createdAt: formatDateForCSV(asset.createdAt),
    updatedAt: formatDateForCSV(asset.updatedAt),
  };
}

/**
 * Transform multiple assets for export.
 *
 * @param assets - Array of assets with relations
 * @returns Array of flattened rows
 *
 * @example
 * const rows = transformAssetsForExport(assets);
 */
export function transformAssetsForExport(assets: AssetWithExportRelations[]): AssetExportRow[] {
  return assets.map(transformAssetForExport);
}

/**
 * Generate export filename with current date.
 *
 * @param prefix - Filename prefix (default: 'assets_export')
 * @param extension - File extension (default: 'xlsx')
 * @returns Formatted filename
 *
 * @example
 * getExportFilename(); // 'assets_export_2025-01-05.xlsx'
 * getExportFilename('my_assets', 'csv'); // 'my_assets_2025-01-05.csv'
 */
export function getExportFilename(prefix = 'assets_export', extension = 'xlsx'): string {
  const date = new Date().toISOString().split('T')[0];
  return `${prefix}_${date}.${extension}`;
}
