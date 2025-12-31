import { ZodError, ZodIssue } from 'zod';
import { NextResponse } from 'next/server';

// ═══════════════════════════════════════════════════════════════════════════════
// STANDARDIZED API RESPONSE TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Validation error detail structure returned by Zod parsing.
 */
export interface ValidationErrorDetail {
  field: string;
  message: string;
  code?: string;
}

/**
 * Additional context provided with error responses.
 * Supports both key-value objects and validation error arrays.
 */
export type ErrorDetails =
  | Record<string, unknown>
  | ValidationErrorDetail[];

/**
 * Standard error response format for all API endpoints.
 * All error responses should use this structure for consistency.
 */
export interface APIError {
  error: string;           // Short error type/title (e.g., "Validation Error", "Not Found")
  message?: string;        // Human-readable description
  details?: ErrorDetails;          // Additional context (validation errors, allowed values, etc.)
  code?: string;          // Machine-readable error code (e.g., "VALIDATION_FAILED", "RATE_LIMITED")
  requestId?: string;     // Request tracking ID
  timestamp?: string;     // ISO timestamp
}

/**
 * Standard success response format for mutations.
 * GET requests typically return data directly.
 */
export interface APISuccess<T = unknown> {
  success: true;
  message?: string;
  data?: T;
}

// Error codes for consistent client-side handling
export const ErrorCodes = {
  // Auth errors (401)
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',

  // Authorization errors (403)
  FORBIDDEN: 'FORBIDDEN',
  ADMIN_REQUIRED: 'ADMIN_REQUIRED',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  MODULE_DISABLED: 'MODULE_DISABLED',
  TENANT_REQUIRED: 'TENANT_REQUIRED',
  INSUFFICIENT_ROLE: 'INSUFFICIENT_ROLE',

  // Validation errors (400)
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  INVALID_REQUEST: 'INVALID_REQUEST',
  INVALID_STATE: 'INVALID_STATE',
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',

  // Not found (404)
  NOT_FOUND: 'NOT_FOUND',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',

  // Conflict (409)
  CONFLICT: 'CONFLICT',
  ALREADY_EXISTS: 'ALREADY_EXISTS',

  // Rate limit (429)
  RATE_LIMITED: 'RATE_LIMITED',

  // Server errors (500)
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.name = this.constructor.name;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, _details?: unknown) {
    super(message, 400);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404);
    this.name = 'NotFoundError';
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 429);
    this.name = 'RateLimitError';
  }
}

/**
 * Convert Zod error issues to a standardized validation error format.
 */
export function formatZodError(error: ZodError): APIError {
  const details: ValidationErrorDetail[] = error.issues.map((issue: ZodIssue) => ({
    field: issue.path.join('.'),
    message: issue.message,
    code: issue.code,
  }));

  return {
    error: 'Validation Error',
    message: 'Request validation failed',
    details,
  };
}

export function formatError(
  error: Error | AppError | ZodError,
  requestId?: string
): { response: APIError; statusCode: number } {
  const timestamp = new Date().toISOString();
  
  // Handle Zod validation errors
  if (error instanceof ZodError) {
    return {
      response: {
        ...formatZodError(error),
        requestId,
        timestamp,
      },
      statusCode: 400,
    };
  }

  // Handle custom app errors
  if (error instanceof AppError) {
    return {
      response: {
        error: error.name,
        message: error.message,
        requestId,
        timestamp,
      },
      statusCode: error.statusCode,
    };
  }

  // Handle generic errors (don't expose internal details in production)
  const isDev = process.env.NODE_ENV === 'development';
  
  return {
    response: {
      error: 'Internal Server Error',
      message: isDev ? error.message : 'An unexpected error occurred',
      details: isDev ? { stack: error.stack } : undefined,
      requestId,
      timestamp,
    },
    statusCode: 500,
  };
}

export function formatErrorResponse(
  message: string,
  statusCode: number = 500,
  details?: ErrorDetails,
  requestId?: string
): NextResponse {
  const errorResponse: APIError = {
    error: message,
    details,
    requestId,
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(errorResponse, { status: statusCode });
}

// ═══════════════════════════════════════════════════════════════════════════════
// STANDARDIZED RESPONSE HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a standardized error response.
 * Use this for all error responses to ensure consistency.
 */
export function errorResponse(
  error: string,
  status: number,
  options?: {
    message?: string;
    details?: ErrorDetails;
    code?: ErrorCode;
  }
): NextResponse {
  const response: APIError = {
    error,
    message: options?.message,
    details: options?.details,
    code: options?.code,
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(response, { status });
}

/**
 * Create a validation error response from Zod validation result.
 */
export function validationErrorResponse(
  validation: { success: false; error: ZodError },
  customMessage?: string
): NextResponse {
  const details = validation.error.issues.map((issue) => ({
    field: issue.path.join('.'),
    message: issue.message,
    code: issue.code,
  }));

  return errorResponse('Validation Error', 400, {
    message: customMessage || 'Request validation failed',
    details,
    code: ErrorCodes.VALIDATION_FAILED,
  });
}

/**
 * Create a not found error response.
 */
export function notFoundResponse(resource: string = 'Resource'): NextResponse {
  return errorResponse('Not Found', 404, {
    message: `${resource} not found`,
    code: ErrorCodes.NOT_FOUND,
  });
}

/**
 * Create an unauthorized error response.
 */
export function unauthorizedResponse(message: string = 'Authentication required'): NextResponse {
  return errorResponse('Unauthorized', 401, {
    message,
    code: ErrorCodes.AUTH_REQUIRED,
  });
}

/**
 * Create a forbidden error response.
 */
export function forbiddenResponse(
  message: string = 'Access denied',
  code: ErrorCode = ErrorCodes.FORBIDDEN
): NextResponse {
  return errorResponse('Forbidden', 403, {
    message,
    code,
  });
}

/**
 * Create a bad request error response.
 */
export function badRequestResponse(
  message: string,
  details?: ErrorDetails,
  code: ErrorCode = ErrorCodes.INVALID_REQUEST
): NextResponse {
  return errorResponse('Bad Request', 400, {
    message,
    details,
    code,
  });
}

/**
 * Create a conflict error response.
 */
export function conflictResponse(
  message: string,
  details?: ErrorDetails
): NextResponse {
  return errorResponse('Conflict', 409, {
    message,
    details,
    code: ErrorCodes.CONFLICT,
  });
}

/**
 * Create an invalid state transition error response.
 */
export function invalidStateResponse(
  message: string,
  allowedTransitions?: string[]
): NextResponse {
  return errorResponse('Invalid State', 400, {
    message,
    details: allowedTransitions ? { allowedTransitions } : undefined,
    code: ErrorCodes.INVALID_STATE,
  });
}

/**
 * Create a success response for mutations (POST/PUT/PATCH/DELETE).
 */
export function successResponse<T = unknown>(
  message: string,
  data?: T,
  status: number = 200
): NextResponse {
  const response: APISuccess<T> = {
    success: true,
    message,
    data,
  };

  return NextResponse.json(response, { status });
}

/**
 * Create a created response (201) for POST operations.
 */
export function createdResponse<T = unknown>(data: T, message?: string): NextResponse {
  return NextResponse.json(
    message ? { success: true, message, data } : data,
    { status: 201 }
  );
}

/**
 * Create a no content response (204) for DELETE operations.
 */
export function noContentResponse(): NextResponse {
  return new NextResponse(null, { status: 204 });
}