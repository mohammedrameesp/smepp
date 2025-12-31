/**
 * @file limits.ts
 * @description Centralized constants for limits, sizes, and rate limiting.
 *              Consolidates magic numbers to improve maintainability and make
 *              configuration changes easier to audit.
 * @module lib/constants
 */

// ═══════════════════════════════════════════════════════════════════════════════
// FILE SIZE LIMITS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Maximum size for API JSON request bodies (default: 1MB).
 * Prevents memory exhaustion from oversized requests.
 * Can be overridden per-route via handler options.
 */
export const MAX_BODY_SIZE_BYTES = 1048576; // 1MB = 1024 * 1024

/**
 * Maximum size for general file uploads (documents, spreadsheets).
 * Used by: upload API, import routes, storage utilities.
 */
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

/**
 * Maximum size for organization logo uploads.
 * Smaller limit for logos since they should be web-optimized.
 */
export const MAX_LOGO_SIZE_BYTES = 2 * 1024 * 1024; // 2MB

/**
 * Maximum size for HR document uploads (IDs, certificates, contracts).
 * Used by: document-upload component, profile page.
 */
export const MAX_DOCUMENT_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

/**
 * Default maximum file size in MB for UI components.
 * Used as default prop value in DocumentUpload components.
 */
export const DEFAULT_MAX_FILE_SIZE_MB = 5;

// ═══════════════════════════════════════════════════════════════════════════════
// RATE LIMITING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Default maximum requests per rate limit window.
 * Applied to general API endpoints (mutations by default).
 */
export const RATE_LIMIT_MAX_REQUESTS = 60;

/**
 * Default rate limit window duration in milliseconds (1 minute).
 * Requests are counted within this rolling window.
 */
export const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 60,000ms = 1 minute

/**
 * Maximum authentication attempts per window (stricter limit).
 * Applied to login, password reset, and 2FA endpoints.
 */
export const AUTH_RATE_LIMIT_MAX_ATTEMPTS = 5;

/**
 * Authentication rate limit window duration (15 minutes).
 * Longer window for auth to prevent brute force attacks.
 */
export const AUTH_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 900,000ms = 15 minutes

/**
 * Retry-After header value when rate limited (seconds).
 */
export const RATE_LIMIT_RETRY_AFTER_SECONDS = 60;

// ═══════════════════════════════════════════════════════════════════════════════
// CACHE DURATIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Default cache TTL for tenant-specific settings (branding, exchange rates).
 * Balance between fresh data and database load reduction.
 */
export const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Cleanup interval for in-memory rate limiter stores.
 * Removes stale entries to prevent memory leaks.
 */
export const RATE_LIMITER_CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Session token maximum age (for JWT tokens, cookies).
 */
export const SESSION_MAX_AGE_SECONDS = 24 * 60 * 60; // 24 hours

// ═══════════════════════════════════════════════════════════════════════════════
// BUSINESS RULES - QATAR LABOR LAW
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Minimum months of service required for gratuity eligibility.
 * FIN-006: Qatar Labor Law requires 12+ months for end-of-service benefits.
 */
export const MIN_GRATUITY_SERVICE_MONTHS = 12;

/**
 * Gratuity calculation rate: weeks of pay per year of service.
 * FIN-006: Qatar grants 3 weeks per year of completed service.
 */
export const GRATUITY_WEEKS_PER_YEAR = 3;

/**
 * Days per month for salary calculations.
 * Standard payroll convention (not calendar days).
 */
export const DAYS_PER_MONTH = 30;

/**
 * Months per year (for service calculations).
 */
export const MONTHS_PER_YEAR = 12;

/**
 * Working days per week in Qatar.
 * Used for leave day calculations (excluding weekends).
 */
export const QATAR_WORKDAYS_PER_WEEK = 5;

/**
 * Qatar weekend days (Friday and Saturday).
 * Used by leave calculation utilities.
 */
export const QATAR_WEEKEND_DAYS = [5, 6] as const; // Friday = 5, Saturday = 6

// ═══════════════════════════════════════════════════════════════════════════════
// PAGINATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Default page size for paginated API responses.
 */
export const DEFAULT_PAGE_SIZE = 20;

/**
 * Maximum page size allowed (prevents memory issues).
 */
export const MAX_PAGE_SIZE = 100;

// ═══════════════════════════════════════════════════════════════════════════════
// MISC LIMITS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Maximum length for text fields (names, titles).
 */
export const MAX_TEXT_FIELD_LENGTH = 255;

/**
 * Maximum length for description/notes fields.
 */
export const MAX_DESCRIPTION_LENGTH = 2000;

/**
 * Maximum number of items in bulk operations.
 */
export const MAX_BULK_OPERATION_SIZE = 100;

/**
 * Default currency precision (decimal places).
 */
export const CURRENCY_PRECISION = 2;

/**
 * Maximum number of files in multi-file upload.
 */
export const MAX_FILES_PER_UPLOAD = 10;
