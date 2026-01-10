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
  // Create Uint8Array from buffer for consistent handling
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new NextResponse(new Uint8Array(buffer as any), {
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
