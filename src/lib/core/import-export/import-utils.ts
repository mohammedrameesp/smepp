/**
 * @file import-utils.ts
 * @description Shared utilities for CSV/Excel import operations
 * @module lib/core/import-export
 *
 * This module consolidates common import patterns used across:
 * - Asset imports
 * - Subscription imports
 * - Supplier imports
 *
 * Provides reusable helpers for file handling, row parsing, results tracking,
 * and duplicate handling strategies.
 */

import { NextResponse } from 'next/server';
import { csvToArray } from './csv-utils';
import { formatNumber } from '@/lib/utils/math-utils';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generic row type for CSV imports with flexible column names
 */
export interface ImportRow {
  [key: string]: string | undefined;
}

/**
 * Standard result tracking structure for import operations
 * Tracks successes, updates, skips, failures, and errors
 */
export interface ImportResults<T = Record<string, unknown>> {
  success: number;
  updated: number;
  skipped: number;
  failed: number;
  errors: ImportError[];
  created: T[];
}

/**
 * Error entry for a failed import row
 */
export interface ImportError {
  row: number;
  error: string;
  data: unknown;
}

/**
 * How to handle duplicate records during import
 * - skip: Ignore duplicates, continue with new records
 * - update: Update existing records with imported data
 */
export type DuplicateStrategy = 'skip' | 'update';

/**
 * Configuration for import file validation
 */
export interface ImportFileConfig {
  /** Maximum file size in bytes (default: 10MB) */
  maxFileSizeBytes?: number;
  /** Allowed MIME types */
  allowedTypes?: string[];
  /** Allowed file extensions (without dot) */
  allowedExtensions?: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

/** Default maximum file size: 10MB */
export const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Magic byte signatures for file type validation.
 * @security Validates actual file content, not just extension/MIME type
 */
const FILE_SIGNATURES = {
  // XLSX/DOCX/PPTX (ZIP-based Office formats) - PK signature
  xlsx: [0x50, 0x4b, 0x03, 0x04],
  // XLS (Legacy Excel BIFF format) - Compound Document signature
  xls: [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1],
  // CSV files start with printable ASCII - we check for common patterns
  // CSV doesn't have a magic number, so we validate it's text-like
} as const;

/** Default allowed MIME types for import files */
export const DEFAULT_ALLOWED_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-excel', // .xls
  'text/csv', // .csv
];

/** Default allowed file extensions */
export const DEFAULT_ALLOWED_EXTENSIONS = ['xlsx', 'xls', 'csv'];

/**
 * Validates file content against magic byte signatures.
 * @security Prevents disguised malicious files (e.g., .exe renamed to .xlsx)
 *
 * @param buffer - File buffer to validate
 * @param extension - Expected file extension
 * @returns true if file content matches expected type, false otherwise
 */
export function validateFileMagicBytes(buffer: Buffer, extension: string): boolean {
  const ext = extension.toLowerCase();

  if (ext === 'xlsx') {
    // Check for ZIP/PK signature (XLSX is a ZIP archive)
    const signature = FILE_SIGNATURES.xlsx;
    if (buffer.length < signature.length) return false;
    return signature.every((byte, i) => buffer[i] === byte);
  }

  if (ext === 'xls') {
    // Check for Compound Document signature (legacy Excel)
    const signature = FILE_SIGNATURES.xls;
    if (buffer.length < signature.length) return false;
    return signature.every((byte, i) => buffer[i] === byte);
  }

  if (ext === 'csv') {
    // CSV doesn't have a magic number - validate it's text-like content
    // Check first 1000 bytes for printable ASCII + common control chars
    const sampleSize = Math.min(1000, buffer.length);
    for (let i = 0; i < sampleSize; i++) {
      const byte = buffer[i];
      // Allow: printable ASCII (32-126), tab (9), newline (10), carriage return (13)
      // Also allow UTF-8 continuation bytes (128-255) for international characters
      const isValid =
        (byte >= 32 && byte <= 126) || // Printable ASCII
        byte === 9 ||  // Tab
        byte === 10 || // LF
        byte === 13 || // CR
        byte >= 128;   // UTF-8 continuation / international chars
      if (!isValid) {
        return false;
      }
    }
    return true;
  }

  // Unknown extension - allow (fallback to MIME type validation)
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// FILE HANDLING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validates and parses an uploaded import file
 *
 * @param formData - The form data containing the file
 * @param config - Optional file validation configuration
 * @returns Either an error response or the parsed file data
 *
 * @example
 * const result = await parseImportFile(formData, { maxFileSizeBytes: 5 * 1024 * 1024 });
 * if ('error' in result) return result.error;
 * const { buffer, file, duplicateStrategy } = result;
 */
export async function parseImportFile(
  formData: FormData,
  config: ImportFileConfig = {}
): Promise<
  | { error: NextResponse }
  | { buffer: Buffer; file: File; duplicateStrategy: DuplicateStrategy }
> {
  const {
    maxFileSizeBytes = DEFAULT_MAX_FILE_SIZE,
    allowedTypes = DEFAULT_ALLOWED_TYPES,
    allowedExtensions = DEFAULT_ALLOWED_EXTENSIONS,
  } = config;

  const file = formData.get('file') as File;
  const duplicateStrategy =
    (formData.get('duplicateStrategy') as DuplicateStrategy) || 'skip';

  // Validate file exists
  if (!file) {
    return {
      error: NextResponse.json({ error: 'No file uploaded' }, { status: 400 }),
    };
  }

  // Validate file size
  if (file.size > maxFileSizeBytes) {
    const sizeMB = formatNumber(file.size / 1024 / 1024);
    const maxMB = formatNumber(maxFileSizeBytes / 1024 / 1024, 0);
    return {
      error: NextResponse.json(
        { error: `File size exceeds maximum limit of ${maxMB}MB. Your file is ${sizeMB}MB` },
        { status: 400 }
      ),
    };
  }

  // Validate file type
  const extension = file.name.split('.').pop()?.toLowerCase();
  const isValidType = allowedTypes.includes(file.type);
  const isValidExtension = extension && allowedExtensions.includes(extension);

  if (!isValidType && !isValidExtension) {
    return {
      error: NextResponse.json(
        {
          error: `Invalid file type. Please upload a ${allowedExtensions.join(', ').toUpperCase()} file`,
        },
        { status: 400 }
      ),
    };
  }

  // Convert to buffer
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // Validate file content matches expected type (magic byte validation)
  // @security Prevents disguised malicious files
  if (extension && !validateFileMagicBytes(buffer, extension)) {
    return {
      error: NextResponse.json(
        {
          error: `File content does not match expected ${extension.toUpperCase()} format. The file may be corrupted or incorrectly named.`,
        },
        { status: 400 }
      ),
    };
  }

  return { buffer, file, duplicateStrategy };
}

/**
 * Parses CSV/Excel buffer into rows
 *
 * @param buffer - File buffer to parse
 * @returns Parsed rows or error response
 */
export async function parseImportRows<T extends ImportRow>(
  buffer: Buffer
): Promise<{ error: NextResponse } | { rows: T[] }> {
  const rows = await csvToArray<T>(buffer);

  if (rows.length === 0) {
    return {
      error: NextResponse.json(
        { error: 'No data found in file' },
        { status: 400 }
      ),
    };
  }

  return { rows };
}

// ─────────────────────────────────────────────────────────────────────────────
// ROW PARSING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Characters that could trigger formula execution in Excel/Google Sheets
 * when a cell value starts with them.
 * @security Prevents CSV formula injection attacks
 */
const FORMULA_TRIGGER_CHARS = ['=', '+', '-', '@', '\t', '\r'];

/**
 * Sanitizes a cell value to prevent CSV formula injection.
 * If the value starts with a formula trigger character, it's prefixed with a single quote.
 *
 * @security Prevents Excel/Sheets formula injection attacks
 * @param value - Raw cell value from import
 * @returns Sanitized value safe for database storage
 *
 * @example
 * sanitizeCellValue('=HYPERLINK("http://evil.com")') // Returns "'=HYPERLINK..."
 * sanitizeCellValue('Normal text') // Returns 'Normal text'
 */
export function sanitizeCellValue(value: string | undefined): string | undefined {
  if (!value) return value;
  const trimmed = value.trim();
  if (trimmed.length === 0) return trimmed;

  // Check if first character is a formula trigger
  if (FORMULA_TRIGGER_CHARS.includes(trimmed[0])) {
    // Don't sanitize if it looks like a legitimate negative number
    if (trimmed[0] === '-' && /^-\d/.test(trimmed)) {
      return trimmed;
    }
    // Don't sanitize if it looks like a positive number with + prefix
    if (trimmed[0] === '+' && /^\+\d/.test(trimmed)) {
      return trimmed.substring(1); // Just remove the + prefix
    }
    // Prefix with single quote to neutralize the formula
    return `'${trimmed}`;
  }

  return trimmed;
}

/**
 * Creates a helper function to get values from a row with flexible column name matching
 *
 * This allows imports to work with various column naming conventions:
 * - "Asset Tag", "asset_tag", "assetTag", "Tag" all map to the same field
 *
 * @security Uses sanitizeCellValue to prevent formula injection
 * @param row - The row to extract values from
 * @param sanitize - Whether to sanitize cell values (default: true)
 * @returns A function that takes possible column names and returns the first match
 *
 * @example
 * const getRowValue = createRowValueGetter(row);
 * const name = getRowValue(['Name', 'name', 'Full Name']); // Returns first matching value
 */
export function createRowValueGetter(
  row: ImportRow,
  sanitize: boolean = true
): (possibleNames: string[]) => string | undefined {
  return (possibleNames: string[]): string | undefined => {
    for (const name of possibleNames) {
      const value = row[name];
      if (value && value.trim()) {
        return sanitize ? sanitizeCellValue(value.trim()) : value.trim();
      }
    }
    return undefined;
  };
}

/**
 * Calculates the Excel row number for error reporting
 * Excel rows are 1-indexed and include a header row
 *
 * @param arrayIndex - The 0-based array index
 * @returns The 1-based Excel row number (accounting for header)
 */
export function getExcelRowNumber(arrayIndex: number): number {
  return arrayIndex + 2; // +1 for 1-indexing, +1 for header row
}

// ─────────────────────────────────────────────────────────────────────────────
// DATE PARSING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parses a date string in dd/mm/yyyy format
 * This format is commonly used in Qatar and other regions
 *
 * @param dateStr - Date string in dd/mm/yyyy format
 * @returns Parsed Date object or null if invalid
 *
 * @example
 * parseDDMMYYYY('15/01/2024') // Returns Date for Jan 15, 2024
 * parseDDMMYYYY('invalid')    // Returns null
 */
export function parseDDMMYYYY(dateStr: string | undefined): Date | null {
  if (!dateStr) return null;

  const parts = dateStr.split('/');
  if (parts.length !== 3) return null;

  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // JS months are 0-indexed
  const year = parseInt(parts[2], 10);

  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;

  const date = new Date(year, month, day);

  // Validate the date is real (handles invalid dates like Feb 30)
  if (
    date.getDate() !== day ||
    date.getMonth() !== month ||
    date.getFullYear() !== year
  ) {
    return null;
  }

  return date;
}

/**
 * Parses a date string in ISO or common formats
 * Supports: YYYY-MM-DD, MM/DD/YYYY, DD/MM/YYYY
 *
 * @param dateStr - Date string to parse
 * @returns Parsed Date object or null if invalid
 */
export function parseFlexibleDate(dateStr: string | undefined): Date | null {
  if (!dateStr) return null;

  // Try ISO format first (YYYY-MM-DD)
  const isoDate = new Date(dateStr);
  if (!isNaN(isoDate.getTime())) {
    return isoDate;
  }

  // Try dd/mm/yyyy format
  return parseDDMMYYYY(dateStr);
}

// ─────────────────────────────────────────────────────────────────────────────
// RESULTS TRACKING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a new import results tracker
 *
 * @returns Fresh ImportResults object with zeroed counters
 */
export function createImportResults<T = Record<string, unknown>>(): ImportResults<T> {
  return {
    success: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    errors: [],
    created: [],
  };
}

/**
 * Records an error for a specific row
 *
 * @param results - The results tracker to update
 * @param row - The row data that failed
 * @param rowNumber - The Excel row number
 * @param error - Error message or Error object
 */
export function recordImportError<T>(
  results: ImportResults<T>,
  row: unknown,
  rowNumber: number,
  error: string | Error
): void {
  results.errors.push({
    row: rowNumber,
    error: error instanceof Error ? error.message : error,
    data: row,
  });
  results.failed++;
}

/**
 * Generates a standard import completion message
 *
 * @param results - The completed import results
 * @param extras - Additional info to include (e.g., history entries imported)
 * @returns Formatted message string
 */
export function formatImportMessage<T>(
  results: ImportResults<T>,
  extras?: Record<string, number>
): string {
  let message = `Import completed: ${results.success} created, ${results.updated} updated, ${results.skipped} skipped, ${results.failed} failed`;

  if (extras) {
    for (const [key, value] of Object.entries(extras)) {
      if (value > 0) {
        message += `, ${value} ${key}`;
      }
    }
  }

  return message;
}

// ─────────────────────────────────────────────────────────────────────────────
// VALUE PARSING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parses a string value to a normalized enum-like value
 * Converts to uppercase and replaces spaces with underscores
 *
 * @param value - Input string
 * @param validValues - Array of valid enum values
 * @param defaultValue - Default if input is invalid
 * @returns Normalized value or default
 *
 * @example
 * parseEnumValue('in use', ['IN_USE', 'SPARE', 'REPAIR'], 'IN_USE')
 * // Returns 'IN_USE'
 */
export function parseEnumValue<T extends string>(
  value: string | undefined,
  validValues: T[],
  defaultValue: T
): T {
  if (!value) return defaultValue;

  const normalized = value.toUpperCase().replace(/\s+/g, '_');
  if (validValues.includes(normalized as T)) {
    return normalized as T;
  }

  return defaultValue;
}

/**
 * Parses a boolean-like string value
 * Recognizes: yes, true, 1, no, false, 0
 *
 * @param value - Input string
 * @param defaultValue - Default if input is undefined
 * @returns Parsed boolean
 */
export function parseBooleanValue(
  value: string | undefined,
  defaultValue: boolean = false
): boolean {
  if (!value) return defaultValue;

  const lower = value.toLowerCase().trim();
  if (['yes', 'true', '1'].includes(lower)) return true;
  if (['no', 'false', '0'].includes(lower)) return false;

  return defaultValue;
}

/**
 * Parses a numeric string with validation
 *
 * @param value - Input string
 * @param options - Validation options
 * @returns Parsed number or null if invalid
 */
export function parseNumericValue(
  value: string | undefined,
  options?: {
    min?: number;
    max?: number;
    allowDecimals?: boolean;
  }
): number | null {
  if (!value) return null;

  const parsed = parseFloat(value);
  if (isNaN(parsed)) return null;

  const { min, max, allowDecimals = true } = options || {};

  if (!allowDecimals && !Number.isInteger(parsed)) return null;
  if (min !== undefined && parsed < min) return null;
  if (max !== undefined && parsed > max) return null;

  return parsed;
}

// ─────────────────────────────────────────────────────────────────────────────
// CURRENCY HANDLING
// ─────────────────────────────────────────────────────────────────────────────

/** QAR to USD exchange rate (approximate) */
export const QAR_TO_USD_RATE = 3.64;

/**
 * Converts price between currencies and calculates QAR equivalent
 *
 * @param price - Price value
 * @param currency - Original currency (QAR or USD)
 * @returns Object with price in original currency and USD equivalent
 */
export function convertPriceWithQAR(
  price: number,
  currency: 'QAR' | 'USD'
): { price: number; priceQAR: number } {
  if (currency === 'QAR') {
    return {
      price,
      priceQAR: price / QAR_TO_USD_RATE,
    };
  } else {
    return {
      price: price * QAR_TO_USD_RATE,
      priceQAR: price,
    };
  }
}
