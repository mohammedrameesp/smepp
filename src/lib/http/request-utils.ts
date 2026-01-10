/**
 * @file request-utils.ts
 * @description Request parsing utilities for API route handlers.
 *              Provides type-safe body and query parameter parsing with Zod validation.
 * @module http
 */

import { NextRequest, NextResponse } from 'next/server';
import { ZodSchema } from 'zod';
import { validationErrorResponse } from './errors';

/**
 * Parse and validate request body against a Zod schema.
 * Returns either validated data or an error response ready to return.
 *
 * @example
 * const parsed = await parseBody(request, createAssetSchema);
 * if (!parsed.success) return parsed.response;
 * const { name, price } = parsed.data;
 */
export async function parseBody<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; response: NextResponse }> {
  try {
    const body = await request.json();
    const validation = schema.safeParse(body);

    if (!validation.success) {
      return {
        success: false,
        response: validationErrorResponse(validation),
      };
    }

    return { success: true, data: validation.data };
  } catch {
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Invalid JSON body', details: [{ message: 'Request body must be valid JSON' }] },
        { status: 400 }
      ),
    };
  }
}

/**
 * Parse URL search params and validate against a Zod schema.
 *
 * @example
 * const parsed = parseQueryParams(request, listQuerySchema);
 * if (!parsed.success) return parsed.response;
 * const { page, pageSize, search } = parsed.data;
 */
export function parseQueryParams<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): { success: true; data: T } | { success: false; response: NextResponse } {
  const { searchParams } = new URL(request.url);
  const queryParams = Object.fromEntries(searchParams.entries());

  const validation = schema.safeParse(queryParams);

  if (!validation.success) {
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Invalid query parameters', details: validation.error.issues },
        { status: 400 }
      ),
    };
  }

  return { success: true, data: validation.data };
}

/**
 * Extract and validate route param ID.
 *
 * @example
 * const id = getRouteId(context.params);
 * if (!id.success) return id.response;
 * const asset = await db.asset.findUnique({ where: { id: id.data } });
 */
export function getRouteId(
  params: Record<string, string> | undefined,
  paramName: string = 'id'
): { success: true; data: string } | { success: false; response: NextResponse } {
  const id = params?.[paramName];

  if (!id || typeof id !== 'string') {
    return {
      success: false,
      response: NextResponse.json(
        { error: `${paramName} parameter is required` },
        { status: 400 }
      ),
    };
  }

  return { success: true, data: id };
}
