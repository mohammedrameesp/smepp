/**
 * @file get-handler.ts
 * @description Factory for creating GET single entity handlers.
 *              Reduces boilerplate for entity retrieval routes.
 * @module http
 */

import { NextRequest, NextResponse } from 'next/server';
import { TenantPrismaClient } from '@/lib/core/prisma-tenant';
import { withErrorHandler, APIContext, HandlerOptions } from './handler';
import { jsonResponse } from './responses';

export interface GetEntityConfig<TEntity, TResult = TEntity> {
  /**
   * Entity name for error messages (e.g., 'Asset', 'Supplier')
   */
  entityName: string;

  /**
   * Function to fetch the entity from the database
   */
  fetchEntity: (
    id: string,
    db: TenantPrismaClient,
    context: {
      tenantId: string;
      userId: string;
      orgRole: string;
    }
  ) => Promise<TEntity | null>;

  /**
   * Optional function to check if user can access this entity
   * Return error message string if forbidden, undefined if allowed
   */
  checkAccess?: (
    entity: TEntity,
    context: {
      tenantId: string;
      userId: string;
      orgRole: string;
    }
  ) => string | undefined;

  /**
   * Optional function to transform entity before response
   */
  serialize?: (entity: TEntity) => TResult;
}

/**
 * Creates a GET handler for retrieving a single entity by ID.
 *
 * @example
 * ```typescript
 * export const GET = createGetEntityHandler({
 *   entityName: 'Supplier',
 *   fetchEntity: async (id, db) => {
 *     return db.supplier.findFirst({
 *       where: { id },
 *       include: { approvedBy: true },
 *     });
 *   },
 *   checkAccess: (supplier, ctx) => {
 *     if (ctx.orgRole !== 'ADMIN' && supplier.status !== 'APPROVED') {
 *       return 'You can only view approved suppliers';
 *     }
 *   },
 * }, { requireAuth: true, requireModule: 'suppliers' });
 * ```
 */
export function createGetEntityHandler<TEntity, TResult = TEntity>(
  config: GetEntityConfig<TEntity, TResult>,
  options: HandlerOptions = {}
) {
  const { entityName, fetchEntity, checkAccess, serialize } = config;

  const handler = async (request: NextRequest, context: APIContext) => {
    const { tenant, prisma: tenantPrisma } = context;

    if (!tenant?.tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
    }

    const db = tenantPrisma as TenantPrismaClient;
    const id = context.params?.id;

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const ctx = {
      tenantId: tenant.tenantId,
      userId: tenant.userId,
      orgRole: tenant.orgRole || 'MEMBER',
    };

    const entity = await fetchEntity(id, db, ctx);

    if (!entity) {
      return NextResponse.json({ error: `${entityName} not found` }, { status: 404 });
    }

    if (checkAccess) {
      const accessError = checkAccess(entity, ctx);
      if (accessError) {
        return NextResponse.json({ error: accessError }, { status: 403 });
      }
    }

    const result = serialize ? serialize(entity) : entity;
    return jsonResponse(result);
  };

  return withErrorHandler(handler, options);
}
