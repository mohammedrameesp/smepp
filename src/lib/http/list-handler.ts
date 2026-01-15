/**
 * @file list-handler.ts
 * @description Factory for creating paginated list handlers.
 *              Reduces boilerplate for list/search routes.
 * @module http
 */

import { NextRequest, NextResponse } from 'next/server';
import { z, ZodSchema } from 'zod';
import { TenantPrismaClient } from '@/lib/core/prisma-tenant';
import { withErrorHandler, APIContext, HandlerOptions } from './handler';
import { paginatedResponse } from './responses';

/**
 * Base pagination parameters
 */
export const basePaginationSchema = z.object({
  p: z.coerce.number().min(1).default(1),
  ps: z.coerce.number().min(1).max(100).default(20),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
  q: z.string().optional(),
});

export type BasePaginationParams = z.infer<typeof basePaginationSchema>;

export interface ListHandlerConfig<TEntity, TQuery extends BasePaginationParams> {
  /**
   * Zod schema for query parameters (should extend basePaginationSchema)
   */
  querySchema: ZodSchema<TQuery>;

  /**
   * Fields to search when 'q' parameter is provided
   * Uses case-insensitive contains search
   */
  searchFields?: string[];

  /**
   * Default sort field if not specified in query
   */
  defaultSort?: string;

  /**
   * Function to build additional where conditions from query params
   */
  buildWhere?: (
    query: TQuery,
    context: { tenantId: string; userId: string; orgRole: string }
  ) => Record<string, unknown>;

  /**
   * Function to fetch data with pagination
   */
  fetchData: (
    db: TenantPrismaClient,
    params: {
      where: Record<string, unknown>;
      skip: number;
      take: number;
      orderBy: Record<string, 'asc' | 'desc'>;
      query: TQuery;
    },
    context: { tenantId: string; userId: string; orgRole: string }
  ) => Promise<{ items: TEntity[]; total: number }>;

  /**
   * Optional function to transform items before response
   */
  serialize?: (items: TEntity[]) => unknown[];
}

/**
 * Creates a GET handler for paginated list endpoints.
 *
 * @example
 * ```typescript
 * const querySchema = basePaginationSchema.extend({
 *   status: z.enum(['PENDING', 'APPROVED']).optional(),
 *   category: z.string().optional(),
 * });
 *
 * export const GET = createListHandler({
 *   querySchema,
 *   searchFields: ['name', 'email'],
 *   defaultSort: 'createdAt',
 *   buildWhere: (query) => ({
 *     ...(query.status && { status: query.status }),
 *     ...(query.category && { category: query.category }),
 *   }),
 *   fetchData: async (db, { where, skip, take, orderBy }) => {
 *     const [items, total] = await Promise.all([
 *       db.supplier.findMany({ where, skip, take, orderBy }),
 *       db.supplier.count({ where }),
 *     ]);
 *     return { items, total };
 *   },
 * }, { requireAuth: true, requireModule: 'suppliers' });
 * ```
 */
export function createListHandler<TEntity, TQuery extends BasePaginationParams>(
  config: ListHandlerConfig<TEntity, TQuery>,
  options: HandlerOptions = {}
) {
  const {
    querySchema,
    searchFields,
    defaultSort,
    buildWhere,
    fetchData,
    serialize,
  } = config;

  const handler = async (request: NextRequest, context: APIContext) => {
    const { tenant, prisma: tenantPrisma } = context;

    if (!tenant?.tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
    }

    const db = tenantPrisma as TenantPrismaClient;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const rawParams: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      rawParams[key] = value;
    });

    const validation = querySchema.safeParse(rawParams);
    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid query parameters',
        details: validation.error.issues,
      }, { status: 400 });
    }

    const query = validation.data;
    const { p: page, ps: pageSize, sort, order, q: searchQuery } = query;

    const ctx = {
      tenantId: tenant.tenantId,
      userId: tenant.userId,
      // Derive legacy orgRole for backwards compatibility
      orgRole: tenant.isOwner ? 'OWNER' : tenant.isAdmin ? 'ADMIN' : 'MEMBER',
    };

    // Build where clause
    let where: Record<string, unknown> = {};

    // Add search conditions
    if (searchQuery && searchFields && searchFields.length > 0) {
      where.OR = searchFields.map((field) => ({
        [field]: { contains: searchQuery, mode: 'insensitive' },
      }));
    }

    // Add custom where conditions
    if (buildWhere) {
      where = { ...where, ...buildWhere(query, ctx) };
    }

    // Calculate pagination
    const skip = (page - 1) * pageSize;
    const take = pageSize;

    // Build orderBy
    const sortField = sort || defaultSort || 'createdAt';
    const orderBy = { [sortField]: order };

    // Fetch data
    const { items, total } = await fetchData(
      db,
      { where, skip, take, orderBy, query },
      ctx
    );

    // Serialize if needed
    const result = serialize ? serialize(items) : items;

    return paginatedResponse(result, total, page, pageSize);
  };

  return withErrorHandler(handler, options);
}

// Note: For simple list handlers, use createListHandler directly with a model-specific
// fetchData function. This ensures proper typing and avoids generic type inference issues.
