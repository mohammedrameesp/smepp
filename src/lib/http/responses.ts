/**
 * @file responses.ts
 * @description Response helper functions for API route handlers.
 *              Provides standardized response formats for common API patterns.
 * @module http
 */

import { NextResponse } from 'next/server';

/**
 * Create a successful JSON response.
 */
export function jsonResponse<T>(data: T, status: number = 200): NextResponse {
  return NextResponse.json(data, { status });
}

/**
 * Create a paginated response with metadata.
 */
export function paginatedResponse<T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number
): NextResponse {
  return NextResponse.json({
    items,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
      hasMore: page * pageSize < total,
    },
  });
}

/**
 * Create a file download response.
 */
export function fileResponse(
  buffer: Buffer | Uint8Array,
  filename: string,
  contentType: string
): NextResponse {
  // Convert to Uint8Array for consistent handling across environments.
  // Buffer extends Uint8Array, but NextResponse needs a standard Uint8Array.
  // Using buffer.buffer (ArrayBuffer) with byteOffset and length ensures proper handling.
  const bytes = Buffer.isBuffer(buffer)
    ? new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)
    : buffer;
  // NextResponse accepts Uint8Array as body per Web API spec, but TypeScript's
  // BodyInit type may not include it in all configurations. Cast via unknown.
  return new NextResponse(bytes as unknown as BodyInit, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}

/**
 * Create a no-content response (204).
 */
export function noContentResponse(): NextResponse {
  return new NextResponse(null, { status: 204 });
}

/**
 * Create an error response for validation failures.
 * Use this when Zod validation fails on request body or query params.
 *
 * @example
 * ```ts
 * const validation = mySchema.safeParse(body);
 * if (!validation.success) {
 *   return validationErrorResponse(validation.error);
 * }
 * ```
 */
export function validationErrorResponse(
  error: { issues: Array<{ path: PropertyKey[]; message: string }> },
  message: string = 'Validation failed'
): NextResponse {
  return NextResponse.json(
    {
      error: message,
      details: error.issues,
    },
    { status: 400 }
  );
}

/**
 * Create an error response for invalid request body.
 * Convenience wrapper for body validation errors.
 */
export function invalidBodyResponse(
  error: { issues: Array<{ path: PropertyKey[]; message: string }> }
): NextResponse {
  return validationErrorResponse(error, 'Invalid request body');
}

/**
 * Create an error response for invalid query parameters.
 * Convenience wrapper for query param validation errors.
 */
export function invalidQueryResponse(
  error: { issues: Array<{ path: PropertyKey[]; message: string }> }
): NextResponse {
  return validationErrorResponse(error, 'Invalid query parameters');
}
