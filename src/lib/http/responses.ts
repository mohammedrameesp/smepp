/**
 * @file responses.ts
 * @description Response helper functions for API route handlers.
 *              Provides standardized response formats for common API patterns.
 *
 * NOTE: Error responses should use functions from errors.ts for consistency.
 * This file provides success response helpers and simple validation shortcuts.
 *
 * @module http
 */

import { NextResponse } from 'next/server';
import { type APIError, ErrorCodes } from './errors';

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

// Note: noContentResponse is defined in errors.ts to keep all response helpers together

/**
 * Create an error response for invalid request body.
 * Uses standardized APIError format from errors.ts.
 */
export function invalidBodyResponse(
  error: { issues: Array<{ path: PropertyKey[]; message: string; code?: string }> }
): NextResponse {
  const response: APIError = {
    error: 'Validation Error',
    message: 'Invalid request body',
    details: error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
      code: issue.code,
    })),
    code: ErrorCodes.VALIDATION_FAILED,
    timestamp: new Date().toISOString(),
  };
  return NextResponse.json(response, { status: 400 });
}

/**
 * Create an error response for invalid query parameters.
 * Uses standardized APIError format from errors.ts.
 */
export function invalidQueryResponse(
  error: { issues: Array<{ path: PropertyKey[]; message: string; code?: string }> }
): NextResponse {
  const response: APIError = {
    error: 'Validation Error',
    message: 'Invalid query parameters',
    details: error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
      code: issue.code,
    })),
    code: ErrorCodes.VALIDATION_FAILED,
    timestamp: new Date().toISOString(),
  };
  return NextResponse.json(response, { status: 400 });
}
