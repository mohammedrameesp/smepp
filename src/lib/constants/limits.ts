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
 * Used by: upload API, import routes, storage utilities, sanity checks.
 */
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

/**
 * Maximum size for organization logo uploads.
 * Smaller limit for logos since they should be web-optimized.
 */
export const MAX_LOGO_SIZE_BYTES = 2 * 1024 * 1024; // 2MB

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
