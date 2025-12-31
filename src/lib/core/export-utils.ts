/**
 * @file export-utils.ts
 * @description Shared utilities for CSV/Excel export operations
 * @module core
 *
 * This module consolidates common export patterns used across:
 * - Asset exports
 * - Subscription exports
 * - Supplier exports
 * - Employee exports
 * - Purchase request exports
 *
 * Provides reusable helpers for data transformation, header definition,
 * and response generation.
 */

import { NextResponse } from 'next/server';
import { arrayToCSV, formatDateForCSV, formatCurrencyForCSV } from '@/lib/csv-utils';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Column header definition for CSV/Excel exports
 */
export interface ExportHeader<T> {
  /** Key in the data object */
  key: keyof T;
  /** Display header text in the exported file */
  header: string;
}

/**
 * Configuration for multi-sheet Excel exports
 */
export interface ExportSheet<T = Record<string, unknown>> {
  /** Sheet name */
  name: string;
  /** Data rows for this sheet */
  data: T[];
  /** Column headers */
  headers: ExportHeader<T>[];
}

/**
 * Options for createExportResponse
 */
export interface ExportResponseOptions {
  /** Base filename (without extension) */
  filename: string;
  /** Content type (default: Excel) */
  contentType?: 'excel' | 'csv';
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

/** MIME type for Excel files */
export const EXCEL_MIME_TYPE =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/** MIME type for CSV files */
export const CSV_MIME_TYPE = 'text/csv';

// ─────────────────────────────────────────────────────────────────────────────
// DATA TRANSFORMATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Transforms a database record to export format
 * Handles common transformations: dates, currency, nullable fields
 *
 * @param record - Database record to transform
 * @param transform - Transformation function for each field
 * @returns Transformed record ready for export
 *
 * @example
 * const exportData = transformForExport(asset, (key, value) => {
 *   if (key === 'purchaseDate') return formatDateForCSV(value);
 *   if (key === 'price') return formatCurrencyForCSV(value);
 *   return value ?? '';
 * });
 */
export function transformForExport<T extends Record<string, unknown>>(
  record: T,
  transform: (key: keyof T, value: unknown) => unknown
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const key of Object.keys(record) as Array<keyof T>) {
    result[key as string] = transform(key, record[key]);
  }

  return result;
}

/**
 * Safely formats a date field for export
 * Handles null/undefined values
 *
 * @param value - Date value (Date object, string, or null)
 * @returns Formatted date string or empty string
 */
export function safeFormatDate(value: Date | string | null | undefined): string {
  if (!value) return '';
  return formatDateForCSV(value instanceof Date ? value : new Date(value));
}

/**
 * Safely formats a currency field for export
 * Handles Decimal types from Prisma and null values
 *
 * @param value - Numeric value (number, Decimal, or null)
 * @returns Formatted currency string or empty string
 */
export function safeFormatCurrency(value: unknown): string {
  if (value === null || value === undefined) return '';
  const num = typeof value === 'number' ? value : Number(value);
  if (isNaN(num)) return '';
  return formatCurrencyForCSV(num);
}

/**
 * Safely converts a value to string for export
 * Handles null/undefined by returning empty string
 *
 * @param value - Any value
 * @returns String representation or empty string
 */
export function safeString(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value);
}

// ─────────────────────────────────────────────────────────────────────────────
// HEADER BUILDERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a typed header definition
 * Utility to ensure type safety when defining export headers
 *
 * @param key - Field key
 * @param header - Display header text
 * @returns Typed header object
 *
 * @example
 * const headers = [
 *   createHeader<AssetExport>('assetTag', 'Asset Tag'),
 *   createHeader<AssetExport>('model', 'Model'),
 * ];
 */
export function createHeader<T>(key: keyof T, header: string): ExportHeader<T> {
  return { key, header };
}

/**
 * Common header fields that appear in most exports
 * Can be spread into specific export header arrays
 */
export const commonExportHeaders = {
  id: { key: 'id', header: 'ID' },
  createdAt: { key: 'createdAt', header: 'Created At' },
  updatedAt: { key: 'updatedAt', header: 'Updated At' },
  assignedUserId: { key: 'assignedUserId', header: 'Assigned User ID' },
  assignedUserName: { key: 'assignedUserName', header: 'Assigned User Name' },
  assignedUserEmail: { key: 'assignedUserEmail', header: 'Assigned User Email' },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// RESPONSE GENERATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a standard export file response
 * Handles proper headers for file download
 *
 * @param buffer - File buffer (from arrayToCSV)
 * @param options - Export configuration
 * @returns NextResponse configured for file download
 *
 * @example
 * const buffer = await arrayToCSV(data, headers);
 * return createExportResponse(buffer, { filename: 'assets_export' });
 */
export function createExportResponse(
  buffer: Buffer,
  options: ExportResponseOptions
): NextResponse {
  const { filename, contentType = 'excel' } = options;

  const mimeType = contentType === 'excel' ? EXCEL_MIME_TYPE : CSV_MIME_TYPE;
  const extension = contentType === 'excel' ? 'xlsx' : 'csv';
  const date = new Date().toISOString().split('T')[0];
  const fullFilename = `${filename}_${date}.${extension}`;

  // Convert Buffer to Uint8Array for NextResponse compatibility
  // Using 'as unknown as BodyInit' cast due to TypeScript strict mode
  const body = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);

  return new NextResponse(body as unknown as BodyInit, {
    status: 200,
    headers: {
      'Content-Type': mimeType,
      'Content-Disposition': `attachment; filename="${fullFilename}"`,
    },
  });
}

/**
 * Generates a standard export for a simple data set
 * Convenience function for single-sheet exports
 *
 * @param data - Array of records to export
 * @param headers - Column definitions
 * @param filename - Base filename for the export
 * @returns NextResponse with downloadable file
 *
 * @example
 * return await generateSimpleExport(assets, assetHeaders, 'assets_export');
 */
export async function generateSimpleExport<T extends Record<string, unknown>>(
  data: T[],
  headers: ExportHeader<T>[],
  filename: string
): Promise<NextResponse> {
  const csvBuffer = await arrayToCSV(data, headers as { key: string; header: string }[]);
  return createExportResponse(csvBuffer, { filename });
}

/**
 * Generates a multi-sheet Excel export
 * For exports that need related data in separate sheets
 *
 * @param sheets - Array of sheet configurations
 * @param filename - Base filename for the export
 * @returns NextResponse with downloadable Excel file
 *
 * @example
 * return await generateMultiSheetExport([
 *   { name: 'Subscriptions', data: subs, headers: subHeaders },
 *   { name: 'History', data: history, headers: historyHeaders },
 * ], 'subscriptions_export');
 */
export async function generateMultiSheetExport(
  sheets: ExportSheet[],
  filename: string
): Promise<NextResponse> {
  // Main sheet is the first one
  const mainSheet = sheets[0];
  const additionalSheets = sheets.slice(1);

  const csvBuffer = await arrayToCSV(
    mainSheet.data,
    mainSheet.headers as { key: string; header: string }[],
    additionalSheets.length > 0
      ? sheets.map((s) => ({
          name: s.name,
          data: s.data,
          headers: s.headers as { key: string; header: string }[],
        }))
      : undefined
  );

  return createExportResponse(csvBuffer, { filename });
}

// ─────────────────────────────────────────────────────────────────────────────
// USER FIELD EXTRACTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extracts common user fields for export
 * Many exports include assigned/related user information
 *
 * @param user - User object with name and email
 * @returns Object with standardized user fields
 *
 * @example
 * const userData = extractUserFields(asset.assignedUser);
 * // { assignedUserName: 'John Doe', assignedUserEmail: 'john@example.com' }
 */
export function extractUserFields(
  user: { name?: string | null; email?: string | null } | null | undefined,
  prefix: string = 'assigned'
): Record<string, string> {
  return {
    [`${prefix}UserId`]: '',
    [`${prefix}UserName`]: user?.name || '',
    [`${prefix}UserEmail`]: user?.email || '',
  };
}

/**
 * Standard transformation for database records to export format
 * Handles common field types automatically
 *
 * @param record - Database record
 * @param dateFields - Array of field names that are dates
 * @param currencyFields - Array of field names that are currency
 * @returns Transformed record for export
 */
export function standardTransform<T extends Record<string, unknown>>(
  record: T,
  dateFields: Array<keyof T> = [],
  currencyFields: Array<keyof T> = []
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(record)) {
    if (dateFields.includes(key as keyof T)) {
      result[key] = safeFormatDate(value as Date | null);
    } else if (currencyFields.includes(key as keyof T)) {
      result[key] = safeFormatCurrency(value);
    } else if (value === null || value === undefined) {
      result[key] = '';
    } else {
      result[key] = value;
    }
  }

  return result;
}
