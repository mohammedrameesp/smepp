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
