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
