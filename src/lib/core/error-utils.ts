/**
 * @file error-utils.ts
 * @description Error handling utilities - toast notifications, API error parsing,
 *              and standardized error responses for the frontend
 * @module lib/core
 */

import { toast } from 'sonner';

/**
 * Validation error detail from Zod or similar validators.
 */
export interface ValidationErrorDetail {
  path?: string[];
  message: string;
  code?: string;
}

/**
 * Additional context in error responses - either validation errors or key-value data.
 */
export type ErrorDetails = ValidationErrorDetail[] | Record<string, unknown>;

/**
 * Standard error response from API
 */
export interface ApiErrorResponse {
  error: string;
  details?: ErrorDetails;
  message?: string;
}

/**
 * Show standardized error toast with detailed description
 */
export function showErrorToast(
  title: string,
  error?: Error | ApiErrorResponse | string | unknown,
  options?: {
    duration?: number;
    id?: string;
  }
) {
  let description: string | undefined;

  // Extract description from different error types
  if (error instanceof Error) {
    description = error.message;
  } else if (typeof error === 'string') {
    description = error;
  } else if (error && typeof error === 'object') {
    const apiError = error as ApiErrorResponse;
    description = apiError.error || apiError.message;

    // If there are validation details, format them
    if (apiError.details && Array.isArray(apiError.details)) {
      const validationErrors = (apiError.details as ValidationErrorDetail[])
        .map((detail) => {
          const path = detail.path?.join('.') || 'Field';
          return `${path}: ${detail.message}`;
        })
        .join('; ');
      description = validationErrors || description;
    }
  }

  toast.error(title, {
    description,
    duration: options?.duration || 10000,
    id: options?.id,
  });
}

/**
 * Handle API response errors with detailed messaging
 */
export async function handleApiError(
  response: Response,
  fallbackMessage: string = 'An error occurred'
): Promise<never> {
  let errorData: ApiErrorResponse;

  try {
    errorData = await response.json();
  } catch {
    errorData = {
      error: fallbackMessage,
    };
  }

  const errorMessage = errorData.error || errorData.message || fallbackMessage;

  throw new ApiError(errorMessage, response.status, errorData.details);
}

/**
 * Custom API Error class with status code and optional details.
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public details?: ErrorDetails
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Wrap fetch calls with error handling.
 * @template T - Expected response type (defaults to unknown for type safety)
 */
export async function apiFetch<T = unknown>(
  url: string,
  options?: RequestInit
): Promise<T> {
  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      await handleApiError(response);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new Error(error instanceof Error ? error.message : 'Network error occurred');
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// API ERROR MESSAGES (Standardized for consistency)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Standardized API error messages for consistent user experience.
 * Use these constants in all API routes instead of hardcoded strings.
 */
export const API_ERRORS = {
  // Authentication errors (401)
  AUTH_REQUIRED: 'Authentication required',
  SESSION_EXPIRED: 'Session expired. Please log in again.',
  INVALID_TOKEN: 'Invalid authentication token',

  // Authorization errors (403)
  ADMIN_REQUIRED: 'Admin access required',
  OWNER_REQUIRED: 'Owner access required',
  FORBIDDEN: 'You do not have permission to perform this action',
  MODULE_DISABLED: 'This module is not enabled for your organization',

  // Resource errors (404)
  NOT_FOUND: 'Resource not found',
  USER_NOT_FOUND: 'User not found',
  ORGANIZATION_NOT_FOUND: 'Organization not found',

  // Validation errors (400)
  INVALID_REQUEST: 'Invalid request',
  INVALID_ID: 'Invalid ID provided',
  MISSING_REQUIRED_FIELDS: 'Missing required fields',

  // Conflict errors (409)
  ALREADY_EXISTS: 'Resource already exists',
  DUPLICATE_ENTRY: 'Duplicate entry',

  // Server errors (500)
  INTERNAL_ERROR: 'An unexpected error occurred',
  DATABASE_ERROR: 'Database operation failed',
} as const;

export type ApiErrorKey = keyof typeof API_ERRORS;

// ═══════════════════════════════════════════════════════════════════════════════
// CLIENT-SIDE ERROR REPORTING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generic error messages that indicate the user didn't get helpful feedback.
 * These errors should be reported to super admin for investigation.
 */
const UNHELPFUL_ERROR_PATTERNS = [
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
];

/**
 * Check if an error message is too generic to be helpful to users.
 */
function isUnhelpfulError(message: string): boolean {
  const trimmed = message.trim();
  return UNHELPFUL_ERROR_PATTERNS.some(pattern => pattern.test(trimmed));
}

/**
 * Report a confusing/unhelpful API error to the super admin dashboard.
 *
 * Only reports errors that have generic messages like "Bad Request" without
 * useful context. This helps identify API endpoints that need better error messages.
 *
 * @param error - The API error or response
 * @param context - Additional context about what the user was doing
 *
 * @example
 * ```ts
 * try {
 *   await uploadLogo(file);
 * } catch (error) {
 *   reportConfusingApiError(error, {
 *     action: 'uploadLogo',
 *     metadata: { fileType: file.type, fileSize: file.size }
 *   });
 *   showErrorToast('Upload failed', error);
 * }
 * ```
 */
export async function reportConfusingApiError(
  error: Error | ApiError | ApiErrorResponse | unknown,
  context: {
    /** What action was the user performing */
    action: string;
    /** The API endpoint that failed */
    endpoint?: string;
    /** Additional metadata for debugging */
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  try {
    // Extract error message
    let message: string;
    let statusCode: number | undefined;
    let stack: string | undefined;

    if (error instanceof ApiError) {
      message = error.message;
      statusCode = error.statusCode;
      stack = error.stack;
    } else if (error instanceof Error) {
      message = error.message;
      stack = error.stack;
    } else if (typeof error === 'object' && error !== null) {
      const apiError = error as ApiErrorResponse;
      message = apiError.error || apiError.message || 'Unknown error';
    } else {
      message = String(error);
    }

    // Only report if the error message is unhelpful
    if (!isUnhelpfulError(message)) {
      return;
    }

    // Report to error dashboard (fire and forget)
    fetch('/api/errors/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `Unhelpful API error: ${message}`,
        source: `api/${context.action}`,
        stack,
        url: context.endpoint || window.location.href,
        metadata: {
          originalMessage: message,
          statusCode,
          action: context.action,
          endpoint: context.endpoint,
          ...context.metadata,
        },
      }),
    }).catch(() => {
      // Ignore reporting failures - don't disrupt user experience
    });
  } catch {
    // Never throw from error reporting
  }
}

/**
 * Enhanced API fetch that automatically reports confusing errors.
 *
 * Use this instead of raw fetch for API calls where you want visibility
 * into unhelpful error messages.
 *
 * @example
 * ```ts
 * const result = await apiFetchWithReporting<{ success: boolean }>(
 *   '/api/organizations/logo',
 *   { method: 'POST', body: formData },
 *   { action: 'uploadLogo', metadata: { fileType } }
 * );
 * ```
 */
export async function apiFetchWithReporting<T = unknown>(
  url: string,
  options: RequestInit,
  context: {
    action: string;
    metadata?: Record<string, unknown>;
  }
): Promise<T> {
  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      let errorData: ApiErrorResponse;
      try {
        errorData = await response.json();
      } catch {
        errorData = { error: `Request failed with status ${response.status}` };
      }

      const error = new ApiError(
        errorData.error || errorData.message || 'Request failed',
        response.status,
        errorData.details
      );

      // Report if the error message is unhelpful
      reportConfusingApiError(error, {
        action: context.action,
        endpoint: url,
        metadata: {
          ...context.metadata,
          responseStatus: response.status,
        },
      });

      throw error;
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    // Report network errors too
    reportConfusingApiError(error, {
      action: context.action,
      endpoint: url,
      metadata: context.metadata,
    });

    throw new Error(error instanceof Error ? error.message : 'Network error occurred');
  }
}
