/**
 * @file delete-handler.ts
 * @description Factory for creating DELETE entity handlers.
 *              Reduces boilerplate for entity deletion routes.
 * @module http
 */

import { NextRequest, NextResponse } from 'next/server';
import { TenantPrismaClient } from '@/lib/core/prisma-tenant';
import { withErrorHandler, APIContext, HandlerOptions } from './handler';
import { logAction } from '@/lib/core/activity';
import { jsonResponse } from './responses';

export interface DeleteEntityConfig<TEntity> {
  /**
   * Entity name for error messages (e.g., 'Asset', 'Supplier')
   */
  entityName: string;

  /**
   * Activity action for audit logging
   */
  activityAction: string;

  /**
   * Entity type for activity logging (e.g., 'Asset', 'supplier')
   */
  activityEntityType: string;

  /**
   * Function to fetch entity data for logging before deletion
   * Return null if entity doesn't exist
   */
  fetchForLog: (
    id: string,
    db: TenantPrismaClient,
    context: { tenantId: string; userId: string }
  ) => Promise<TEntity | null>;

  /**
   * Function to delete the entity
   */
  deleteEntity: (
    id: string,
    db: TenantPrismaClient,
    context: { tenantId: string; userId: string }
  ) => Promise<void>;

  /**
   * Optional function to check if deletion is allowed
   * Return error message string if not allowed, undefined if allowed
   */
  canDelete?: (
    entity: TEntity,
    db: TenantPrismaClient,
    context: { tenantId: string; userId: string }
  ) => Promise<string | undefined>;

  /**
   * Function to extract log data from entity
   */
  getLogData: (entity: TEntity) => Record<string, unknown>;

  /**
   * Custom success message (default: '{entityName} deleted successfully')
   */
  successMessage?: string;
}

/**
 * Creates a DELETE handler for removing an entity by ID.
 *
 * @example
 * ```typescript
 * export const DELETE = createDeleteEntityHandler({
 *   entityName: 'Supplier',
 *   activityAction: 'SUPPLIER_DELETED',
 *   activityEntityType: 'supplier',
 *   fetchForLog: async (id, db) => {
 *     return db.supplier.findFirst({
 *       where: { id },
 *       select: { id: true, suppCode: true, name: true },
 *     });
 *   },
 *   deleteEntity: async (id, db) => {
 *     await db.supplier.delete({ where: { id } });
 *   },
 *   getLogData: (supplier) => ({
 *     suppCode: supplier.suppCode,
 *     name: supplier.name,
 *   }),
 * }, { requireAdmin: true, requireModule: 'suppliers' });
 * ```
 */
export function createDeleteEntityHandler<TEntity>(
  config: DeleteEntityConfig<TEntity>,
  options: HandlerOptions = {}
) {
  const {
    entityName,
    activityAction,
    activityEntityType,
    fetchForLog,
    deleteEntity,
    canDelete,
    getLogData,
    successMessage,
  } = config;

  const handler = async (request: NextRequest, context: APIContext) => {
    const { tenant, prisma: tenantPrisma } = context;

    if (!tenant?.tenantId || !tenant?.userId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
    }

    const db = tenantPrisma as TenantPrismaClient;
    const { tenantId, userId } = tenant;
    const id = context.params?.id;

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const ctx = { tenantId, userId };

    // Fetch entity for logging
    const entity = await fetchForLog(id, db, ctx);

    if (!entity) {
      return NextResponse.json({ error: `${entityName} not found` }, { status: 404 });
    }

    // Check if deletion is allowed
    if (canDelete) {
      const deleteError = await canDelete(entity, db, ctx);
      if (deleteError) {
        return NextResponse.json({ error: deleteError }, { status: 400 });
      }
    }

    // Delete entity
    await deleteEntity(id, db, ctx);

    // Log activity
    await logAction(
      tenantId,
      userId,
      activityAction,
      activityEntityType,
      id,
      getLogData(entity)
    );

    return jsonResponse({
      message: successMessage || `${entityName} deleted successfully`,
    });
  };

  return withErrorHandler(handler, options);
}
