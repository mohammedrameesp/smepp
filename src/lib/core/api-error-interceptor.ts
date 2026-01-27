/**
 * @file api-error-interceptor.ts
 * @description Global fetch interceptor that automatically reports confusing API errors
 *              to the super admin dashboard. Catches errors with generic messages like
 *              "Bad Request" that don't help users understand what went wrong.
 * @module lib/core
 *
 * USAGE:
 * Import and call initApiErrorInterceptor() once in your app's root layout or provider:
 *
 * ```tsx
 * // In app/layout.tsx or a client provider
 * 'use client';
 * import { initApiErrorInterceptor } from '@/lib/core/api-error-interceptor';
 *
 * // Initialize once on client
 * if (typeof window !== 'undefined') {
 *   initApiErrorInterceptor();
 * }
 * ```
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Common API error response body structure.
 * APIs may use different field names for the error message.
 */
interface ApiErrorResponseBody {
  error?: string;
  message?: string;
  errorMessage?: string;
  msg?: string;
  detail?: string;
  Error?: string;
  Message?: string;
  [key: string]: unknown;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generic error messages that indicate the user didn't get helpful feedback.
 * These errors will be reported to super admin for investigation.
 */
const UNHELPFUL_ERROR_PATTERNS: readonly RegExp[] = [
  /^bad request$/i,
  /^invalid request$/i,
  /^request failed$/i,
  /^an error occurred$/i,
  /^something went wrong$/i,
  /^internal server error$/i,
  /^server error$/i,
  /^unknown error$/i,
  /^error$/i,
  /^failed$/i,
  /^undefined$/i,
  /^null$/i,
];

/**
 * Only intercept requests to our own API.
 * External APIs are excluded.
 */
const API_PATH_PREFIX = '/api/' as const;

/**
 * Endpoints to exclude from error reporting (e.g., the error report endpoint itself).
 */
const EXCLUDED_ENDPOINTS: readonly string[] = [
  '/api/errors/report',
  '/api/health',
  '/api/auth/', // Auth errors are handled separately
];

/**
 * Status codes that indicate client/server errors worth investigating.
 */
const REPORTABLE_STATUS_CODES: readonly number[] = [400, 401, 403, 404, 405, 422, 429, 500, 502, 503, 504];

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check if an error message is too generic to be helpful.
 * @param message - The error message to check
 * @returns True if the message matches known unhelpful patterns
 */
function isUnhelpfulMessage(message: string): boolean {
  if (!message) return true;
  const trimmed = message.trim();
  if (trimmed.length === 0) return true;
  return UNHELPFUL_ERROR_PATTERNS.some(pattern => pattern.test(trimmed));
}

/**
 * Check if the URL should be intercepted.
 * @param url - The request URL to check
 * @returns True if the URL is an API endpoint we should monitor
 */
function shouldIntercept(url: string): boolean {
  try {
    const urlObj = new URL(url, window.location.origin);
    const pathname = urlObj.pathname;

    // Only intercept our API
    if (!pathname.startsWith(API_PATH_PREFIX)) {
      return false;
    }

    // Exclude certain endpoints
    if (EXCLUDED_ENDPOINTS.some(excluded => pathname.startsWith(excluded))) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Extract action name from API path for error categorization.
 * @param url - The API URL
 * @returns The path segment after /api/ (e.g., "organizations/logo")
 * @example getActionFromPath('/api/organizations/logo') // returns 'organizations/logo'
 */
function getActionFromPath(url: string): string {
  try {
    const urlObj = new URL(url, window.location.origin);
    return urlObj.pathname.replace(/^\/api\//, '') || 'unknown';
  } catch {
    return 'unknown';
  }
}

/**
 * Report a confusing error to the super admin dashboard.
 * @param url - The API endpoint URL
 * @param method - HTTP method (GET, POST, etc.)
 * @param status - HTTP status code
 * @param errorMessage - The unhelpful error message received
 * @param responseBody - Optional response body for context
 */
async function reportError(
  url: string,
  method: string,
  status: number,
  errorMessage: string,
  responseBody: ApiErrorResponseBody | null
): Promise<void> {
  try {
    const action = getActionFromPath(url);

    await fetch('/api/errors/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `Unhelpful API error: "${errorMessage}" (${status})`,
        source: `api-interceptor/${action}`,
        url: window.location.href,
        metadata: {
          apiEndpoint: url,
          httpMethod: method,
          statusCode: status,
          originalMessage: errorMessage,
          responsePreview: typeof responseBody === 'object'
            ? JSON.stringify(responseBody).slice(0, 500)
            : undefined,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
        },
      }),
    });
  } catch {
    // Silently fail - don't disrupt user experience
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FETCH INTERCEPTOR
// ═══════════════════════════════════════════════════════════════════════════════

let isInitialized = false;
let originalFetch: typeof fetch;

/**
 * Initialize the global API error interceptor.
 *
 * Call this once when your app loads. It wraps the global fetch to automatically
 * detect and report confusing API errors to the super admin dashboard.
 *
 * Safe to call multiple times - will only initialize once.
 *
 * @example
 * ```tsx
 * // In a client component or layout
 * 'use client';
 * import { initApiErrorInterceptor } from '@/lib/core/api-error-interceptor';
 *
 * if (typeof window !== 'undefined') {
 *   initApiErrorInterceptor();
 * }
 * ```
 */
export function initApiErrorInterceptor(): void {
  // Only run on client
  if (typeof window === 'undefined') {
    return;
  }

  // Only initialize once
  if (isInitialized) {
    return;
  }

  isInitialized = true;
  originalFetch = window.fetch.bind(window);

  window.fetch = async function interceptedFetch(
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    // Get URL string
    const url = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.href
        : input.url;

    // Check if we should intercept this request
    if (!shouldIntercept(url)) {
      return originalFetch(input, init);
    }

    const method = init?.method || 'GET';

    // Make the actual request
    const response = await originalFetch(input, init);

    // Check if this is an error response we should analyze
    if (!REPORTABLE_STATUS_CODES.includes(response.status)) {
      return response;
    }

    // Clone response so we can read the body without consuming it
    const clonedResponse = response.clone();

    // Analyze the error response (don't await - fire and forget)
    analyzeErrorResponse(url, method, clonedResponse).catch(() => {
      // Ignore analysis errors
    });

    return response;
  };
}

/**
 * Analyze an error response and report if the message is unhelpful.
 * @param url - The API endpoint URL
 * @param method - HTTP method used
 * @param response - The cloned Response object to analyze
 */
async function analyzeErrorResponse(
  url: string,
  method: string,
  response: Response
): Promise<void> {
  try {
    // Try to parse JSON response
    const body: ApiErrorResponseBody | null = await response.json().catch(() => null);

    if (!body || typeof body !== 'object') {
      // No JSON body or not an object - report as unhelpful
      await reportError(url, method, response.status, response.statusText || 'No error message', null);
      return;
    }

    // Extract error message from common field names
    const errorMessage: string =
      body.error ||
      body.message ||
      body.errorMessage ||
      body.msg ||
      body.detail ||
      body.Error ||
      body.Message ||
      '';

    // Check if the message is unhelpful
    if (isUnhelpfulMessage(errorMessage)) {
      await reportError(url, method, response.status, errorMessage || 'Empty error message', body);
    }
  } catch {
    // Failed to analyze - ignore
  }
}

/**
 * Disable the interceptor and restore original fetch.
 * Useful for testing or when you need to temporarily disable error reporting.
 */
export function disableApiErrorInterceptor(): void {
  if (typeof window === 'undefined' || !isInitialized || !originalFetch) {
    return;
  }

  window.fetch = originalFetch;
  isInitialized = false;
}

/**
 * Check if the interceptor is currently active.
 * @returns True if the interceptor has been initialized and is actively monitoring
 */
export function isInterceptorActive(): boolean {
  return isInitialized;
}
