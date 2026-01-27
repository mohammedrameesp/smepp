/**
 * @file csv-utils.ts
 * @description CSV/Excel import and export utilities using ExcelJS.
 *              Provides functions for converting data to/from CSV and Excel formats,
 *              with support for multi-sheet workbooks and import templates.
 * @module lib/core/import-export
 *
 * @example
 * // Export data to Excel
 * const buffer = await arrayToCSV(assets, [
 *   { key: 'name', header: 'Asset Name' },
 *   { key: 'serialNumber', header: 'Serial Number' }
 * ]);
 *
 * @example
 * // Import data from CSV/Excel
 * const data = await csvToArray<AssetImport>(buffer, {
 *   'Asset Name': 'name',
 *   'Serial Number': 'serialNumber'
 * });
 *
 * @security This module handles user-uploaded files. All imported data should be
 *           validated and sanitized before database insertion. CSV injection
 *           protection is applied during export.
 */

import ExcelJS from 'exceljs';

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

/** Default column width for single-sheet exports */
const DEFAULT_COLUMN_WIDTH = 15;

/** Column width for multi-sheet exports */
const MULTI_SHEET_COLUMN_WIDTH = 20;

/** Header background color (light gray) */
const HEADER_BG_COLOR = 'FFE0E0E0';

/** Template header background color (blue) */
const TEMPLATE_HEADER_BG_COLOR = 'FF4472C4';

/** Maximum file size for import (10MB) */
const MAX_IMPORT_FILE_SIZE = 10 * 1024 * 1024;

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/** Configuration for a single sheet in multi-sheet exports */
export interface SheetConfig {
  /** Sheet name (appears as tab in Excel) */
  name: string;
  /** Data rows to export */
  data: Record<string, unknown>[];
  /** Column headers configuration */
  headers: { key: string; header: string }[];
}

/** Header configuration for exports */
export interface ExportHeader<T> {
  /** Object property key to read from */
  key: keyof T;
  /** Display name in the header row */
  header: string;
}

/** Header configuration for templates with optional examples */
export interface TemplateHeader {
  /** Column key */
  key: string;
  /** Display header text */
  header: string;
  /** Example value to show in first data row */
  example?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Apply standard header styling to a worksheet.
 * Makes headers bold with a light gray background.
 *
 * @param worksheet - The ExcelJS worksheet to style
 * @param bgColor - Background color in ARGB format (default: light gray)
 * @param fontColor - Font color in ARGB format (default: black/auto)
 */
function styleWorksheetHeaders(
  worksheet: ExcelJS.Worksheet,
  bgColor: string = HEADER_BG_COLOR,
  fontColor?: string
): void {
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, ...(fontColor && { color: { argb: fontColor } }) };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: bgColor },
  };
}

/**
 * Sanitize a cell value to prevent CSV injection attacks.
 * Prefixes dangerous characters with a single quote.
 *
 * @security Prevents formula injection attacks where malicious formulas
 *           (starting with =, +, -, @, tab, carriage return) could execute
 *           when the file is opened in Excel.
 *
 * @param value - The value to sanitize
 * @returns Sanitized value safe for CSV/Excel export
 */
function sanitizeCellValue(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) return trimmed;

  // Characters that could trigger formula execution in Excel
  const dangerousChars = ['=', '+', '-', '@', '\t', '\r'];

  if (dangerousChars.includes(trimmed[0])) {
    // Don't sanitize if it looks like a legitimate negative number
    if (trimmed[0] === '-' && /^-\d/.test(trimmed)) {
      return trimmed;
    }
    // Don't sanitize if it looks like a positive number with + prefix
    if (trimmed[0] === '+' && /^\+\d/.test(trimmed)) {
      return trimmed.substring(1); // Just remove the + prefix
    }
    // Prefix with single quote to treat as text literal
    return `'${trimmed}`;
  }

  return trimmed;
}

/**
 * Sanitize all values in a data row for safe export.
 *
 * @param row - The data row to sanitize
 * @returns Row with all string values sanitized
 */
function sanitizeRowForExport(row: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    sanitized[key] = sanitizeCellValue(value);
  }
  return sanitized;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Convert an array of objects to an Excel buffer.
 * Supports both single-sheet and multi-sheet exports.
 *
 * @template T - Type of the data objects
 * @param data - Array of objects to export (used for single-sheet mode)
 * @param headers - Column header configuration for single-sheet mode
 * @param sheets - Optional array of sheet configurations for multi-sheet export
 * @returns Promise resolving to Excel file as Buffer
 *
 * @example
 * // Single sheet export
 * const buffer = await arrayToCSV(users, [
 *   { key: 'name', header: 'Full Name' },
 *   { key: 'email', header: 'Email Address' }
 * ]);
 *
 * @example
 * // Multi-sheet export
 * const buffer = await arrayToCSV([], [], [
 *   { name: 'Users', data: users, headers: userHeaders },
 *   { name: 'Roles', data: roles, headers: roleHeaders }
 * ]);
 *
 * @security All exported values are sanitized to prevent CSV injection attacks.
 */
export async function arrayToCSV<T extends Record<string, unknown>>(
  data: T[],
  headers: ExportHeader<T>[],
  sheets?: SheetConfig[]
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();

  if (sheets && sheets.length > 0) {
    // Multi-sheet mode: create a worksheet for each sheet configuration
    for (const sheet of sheets) {
      const worksheet = workbook.addWorksheet(sheet.name);

      worksheet.columns = sheet.headers.map(h => ({
        header: h.header,
        key: h.key,
        width: MULTI_SHEET_COLUMN_WIDTH,
      }));

      // Add sanitized data rows
      for (const item of sheet.data) {
        worksheet.addRow(sanitizeRowForExport(item));
      }

      styleWorksheetHeaders(worksheet);
    }
  } else {
    // Single-sheet mode (backward compatible)
    const worksheet = workbook.addWorksheet('Data');

    worksheet.columns = headers.map(h => ({
      header: h.header,
      key: h.key as string,
      width: DEFAULT_COLUMN_WIDTH,
    }));

    // Add sanitized data rows
    for (const item of data) {
      worksheet.addRow(sanitizeRowForExport(item as Record<string, unknown>));
    }

    styleWorksheetHeaders(worksheet);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

// ═══════════════════════════════════════════════════════════════════════════════
// IMPORT FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Detect if a buffer contains CSV content (vs Excel binary).
 * CSV files are plain text with commas; Excel files (.xlsx) are ZIP archives
 * starting with the "PK" signature.
 *
 * @param buffer - The file buffer to check
 * @returns True if the content appears to be CSV
 */
function isCSVBuffer(buffer: Buffer): boolean {
  const preview = buffer.toString('utf8', 0, 100);
  const signature = buffer.toString('utf8', 0, 2);

  // CSV: contains commas and doesn't start with ZIP signature (PK)
  return preview.includes(',') && !signature.includes('PK');
}

/**
 * Parse a single CSV line handling quoted values correctly.
 * Handles commas inside quoted strings and escaped quotes.
 *
 * @param line - The CSV line to parse
 * @returns Array of parsed values
 */
function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let currentValue = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      // Toggle quote state (handles both opening and closing quotes)
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      // Field delimiter found outside quotes
      values.push(currentValue.trim());
      currentValue = '';
    } else {
      // Regular character, add to current value
      currentValue += char;
    }
  }

  // Don't forget the last value
  values.push(currentValue.trim());

  return values;
}

/**
 * Clean a CSV/Excel cell value for consistency.
 * Removes surrounding quotes and converts empty/null strings to null.
 *
 * @param value - The raw cell value
 * @returns Cleaned value
 */
function cleanCellValue(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  // Remove surrounding quotes
  let cleaned = value.replace(/^"|"$/g, '');

  // Convert empty-ish values to null
  if (cleaned === '' || cleaned === 'null' || cleaned === 'undefined') {
    return null;
  }

  return cleaned;
}

/**
 * Check if a row has any meaningful data.
 *
 * @param row - The row data to check
 * @returns True if at least one field has a non-null, non-empty value
 */
function rowHasData(row: Record<string, unknown>): boolean {
  return Object.values(row).some(v => v !== null && v !== undefined && v !== '');
}

/**
 * Parse CSV or Excel buffer to array of objects.
 * Automatically detects file format based on content.
 *
 * @template T - Type of the resulting objects
 * @param buffer - The file buffer to parse (CSV or Excel)
 * @param headerMap - Optional mapping from file headers to object keys
 * @returns Promise resolving to array of parsed objects
 *
 * @throws {Error} If file is empty or has no data
 * @throws {Error} If file exceeds maximum size limit (10MB)
 * @throws {Error} If Excel file has no worksheets
 *
 * @example
 * // Parse with automatic header detection
 * const data = await csvToArray<UserImport>(buffer);
 *
 * @example
 * // Parse with header mapping
 * const data = await csvToArray<AssetImport>(buffer, {
 *   'Asset Name': 'name',
 *   'Serial #': 'serialNumber',
 *   'Purchase Date': 'purchaseDate'
 * });
 *
 * @security Imported data is not automatically sanitized. Always validate
 *           and sanitize imported values before database insertion.
 */
export async function csvToArray<T>(
  buffer: Buffer,
  headerMap?: Record<string, keyof T>
): Promise<T[]> {
  // Validate buffer size to prevent DoS
  if (buffer.length > MAX_IMPORT_FILE_SIZE) {
    throw new Error(`File size exceeds maximum limit of ${MAX_IMPORT_FILE_SIZE / 1024 / 1024}MB`);
  }

  if (buffer.length === 0) {
    throw new Error('File is empty');
  }

  if (isCSVBuffer(buffer)) {
    return parseCSVBuffer<T>(buffer, headerMap);
  } else {
    return parseExcelBuffer<T>(buffer, headerMap);
  }
}

/**
 * Parse a CSV buffer to array of objects.
 *
 * @template T - Type of the resulting objects
 * @param buffer - The CSV buffer to parse
 * @param headerMap - Optional mapping from file headers to object keys
 * @returns Array of parsed objects
 */
function parseCSVBuffer<T>(
  buffer: Buffer,
  headerMap?: Record<string, keyof T>
): T[] {
  const text = buffer.toString('utf8');

  // Split into lines, handling both Unix (\n) and Windows (\r\n) line endings
  const lines = text.split(/\r?\n/).filter(line => line.trim());

  if (lines.length === 0) {
    throw new Error('No data found in CSV file');
  }

  // First line contains headers
  const headers = parseCSVLine(lines[0]).map(h => h.replace(/^"|"$/g, ''));

  const rows: T[] = [];

  // Process data rows (skip header row)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const values = parseCSVLine(line);
    const rowData: Record<string, unknown> = {};

    headers.forEach((header, index) => {
      const mappedKey = (headerMap?.[header] as string) || header;
      rowData[mappedKey] = cleanCellValue(values[index] ?? null);
    });

    // Only include rows with actual data
    if (rowHasData(rowData)) {
      rows.push(rowData as T);
    }
  }

  return rows;
}

/**
 * Parse an Excel buffer to array of objects.
 * Uses the first worksheet in the workbook.
 *
 * @template T - Type of the resulting objects
 * @param buffer - The Excel buffer to parse
 * @param headerMap - Optional mapping from file headers to object keys
 * @returns Promise resolving to array of parsed objects
 */
async function parseExcelBuffer<T>(
  buffer: Buffer,
  headerMap?: Record<string, keyof T>
): Promise<T[]> {
  const workbook = new ExcelJS.Workbook();

  // Type assertion: ExcelJS types don't account for Node.js 18+ Buffer<ArrayBufferLike> generic
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await workbook.xlsx.load(buffer as any);

  const worksheet = workbook.getWorksheet(1);
  if (!worksheet) {
    throw new Error('No worksheet found in Excel file');
  }

  const rows: T[] = [];
  const headers: string[] = [];

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      // First row: extract headers
      row.eachCell((cell, colNumber) => {
        headers[colNumber - 1] = cell.value?.toString() || '';
      });
    } else {
      // Data rows
      const rowData: Record<string, unknown> = {};

      row.eachCell((cell, colNumber) => {
        const header = headers[colNumber - 1];
        if (!header) return; // Skip cells beyond defined headers

        const mappedKey = (headerMap?.[header] as string) || header;
        let value: unknown = cell.value;

        // Convert Date objects to ISO strings for consistency
        if (cell.type === ExcelJS.ValueType.Date && value instanceof Date) {
          value = value.toISOString();
        }

        // Extract formula result values
        if (cell.type === ExcelJS.ValueType.Formula) {
          const formulaCell = cell as ExcelJS.CellFormulaValue;
          value = formulaCell.result;
        }

        // Normalize empty values
        if (value === '' || value === undefined) {
          value = null;
        }

        rowData[mappedKey] = value;
      });

      // Only include rows with actual data
      if (rowHasData(rowData)) {
        rows.push(rowData as T);
      }
    }
  });

  return rows;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FORMATTING UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Format a date for CSV export in dd/mm/yyyy format.
 * This format is commonly used in Qatar and other regions.
 *
 * @param date - The date to format (Date object, ISO string, or null)
 * @returns Formatted date string or empty string if invalid/null
 *
 * @example
 * formatDateForCSV(new Date('2024-01-15')); // '15/01/2024'
 * formatDateForCSV('2024-12-25');            // '25/12/2024'
 * formatDateForCSV(null);                    // ''
 */
export function formatDateForCSV(date: Date | string | null): string {
  if (!date) return '';

  const d = typeof date === 'string' ? new Date(date) : date;

  // Return empty for invalid dates
  if (isNaN(d.getTime())) return '';

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();

  return `${day}/${month}/${year}`;
}

/**
 * Format a currency amount for CSV export.
 * Returns the raw number as a string without formatting symbols
 * to ensure Excel/CSV compatibility.
 *
 * @param amount - The amount to format (number or null)
 * @returns Amount as string or empty string if null/undefined
 *
 * @example
 * formatCurrencyForCSV(1234.56);  // '1234.56'
 * formatCurrencyForCSV(0);        // '0'
 * formatCurrencyForCSV(null);     // ''
 */
export function formatCurrencyForCSV(amount: number | null): string {
  if (amount === null || amount === undefined) return '';
  return amount.toString();
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEMPLATE GENERATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate an Excel template file with headers and optional example row.
 * Useful for providing users with a properly formatted import template.
 *
 * @param headers - Array of header configurations
 * @returns Promise resolving to Excel file as Buffer
 *
 * @example
 * const template = await generateTemplate([
 *   { key: 'name', header: 'Asset Name', example: 'Dell Laptop XPS 15' },
 *   { key: 'serialNumber', header: 'Serial Number', example: 'SN-001-2024' },
 *   { key: 'purchaseDate', header: 'Purchase Date', example: '15/01/2024' }
 * ]);
 */
export async function generateTemplate(headers: TemplateHeader[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Template');

  worksheet.columns = headers.map(h => ({
    header: h.header,
    key: h.key,
    width: MULTI_SHEET_COLUMN_WIDTH,
  }));

  // Add example row if any headers have examples
  const exampleRow: Record<string, string> = {};
  for (const h of headers) {
    if (h.example) {
      exampleRow[h.key] = h.example;
    }
  }

  if (Object.keys(exampleRow).length > 0) {
    worksheet.addRow(exampleRow);
  }

  // Style headers with blue background and white text
  styleWorksheetHeaders(worksheet, TEMPLATE_HEADER_BG_COLOR, 'FFFFFFFF');

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
