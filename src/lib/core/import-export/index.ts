/**
 * @file index.ts
 * @description Unified import/export module - consolidates CSV/Excel utilities
 * @module lib/core/import-export
 *
 * This module provides a centralized location for all import/export related
 * utilities used across the application:
 *
 * - csv-utils: Low-level CSV/Excel parsing and generation using ExcelJS
 * - import-utils: Import validation, parsing, and result tracking
 * - export-utils: Export transformation and response generation
 *
 * @example
 * // Import from barrel export
 * import { csvToArray, parseImportFile, createExportResponse } from '@/lib/core/import-export';
 *
 * // Or import specific modules
 * import { arrayToCSV } from '@/lib/core/import-export/csv-utils';
 */

// CSV/Excel parsing and generation
export * from './csv-utils';

// Import validation and parsing utilities
export * from './import-utils';

// Export transformation utilities
export * from './export-utils';
