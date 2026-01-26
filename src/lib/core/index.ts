// Core utilities - organized for easy imports
// For full module exports, import from individual files directly

// Database
export { prisma } from './prisma';

// Auth
export { authOptions } from './auth';

// Utilities
export { cn } from './utils';

// Logging
export { default as logger, createRequestLogger, logRequest, generateRequestId } from './log';

// Activity logging
export { logAction, ActivityActions } from './activity';

// Import utilities (for CSV/Excel bulk imports)
export {
  parseImportFile,
  parseImportRows,
  createRowValueGetter,
  getExcelRowNumber,
  parseDDMMYYYY,
  parseFlexibleDate,
  createImportResults,
  recordImportError,
  formatImportMessage,
  parseEnumValue,
  parseBooleanValue,
  parseNumericValue,
  convertPriceWithQAR,
  type ImportRow,
  type ImportResults,
  type ImportError,
  type DuplicateStrategy,
} from './import-utils';

// Export utilities (for CSV/Excel exports)
export {
  createExportResponse,
  generateSimpleExport,
  generateMultiSheetExport,
  safeFormatDate,
  safeFormatCurrency,
  safeString,
  extractUserFields,
  standardTransform,
  createHeader,
  type ExportHeader,
  type ExportSheet,
} from './export-utils';

