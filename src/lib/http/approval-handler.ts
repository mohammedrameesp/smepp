/**
 * @file approval-handler.ts
 * @description Factory for creating standardized approval workflow API handlers.
 *              Eliminates duplicate code across approval/rejection routes by providing
 *              a declarative configuration-based approach.
 * @module http
 *
 * PURPOSE:
 * Many API routes share the same approval workflow pattern:
 * 1. Validate ID param exists
 * 2. Parse request body with Zod schema
 * 3. Fetch entity (tenant-scoped)
 * 4. Validate current status allows transition
 * 5. Update in transaction + create history entry
 * 6. Log activity
 * 7. Invalidate WhatsApp tokens (optional)
 * 8. Send notifications (email + in-app)
 * 9. Return updated entity
 *
 * This factory handles all common logic, letting each route focus on its unique
 * business logic via configuration callbacks.
 *
 * USAGE:
 * ```typescript
 * export const POST = createApprovalHandler({
 *   entityName: 'Asset Request',
 *   bodySchema: approveSchema,
 *   validStatuses: ['PENDING_ADMIN_APPROVAL'],
 *   activityAction: ActivityActions.ASSET_REQUEST_APPROVED,
 *   activityEntityType: 'AssetRequest',
 *   whatsappEntityType: 'ASSET_REQUEST',
 *   fetchEntity: (id, db) => db.assetRequest.findFirst({
 *     where: { id },
 *     include: { asset: true, member: true },
 *   }),
 *   getStatus: (entity) => entity.status,
 *   getEntityId: (entity) => entity.id,
 *   performUpdate: async (entity, body, ctx, tx) => {
 *     return tx.assetRequest.update({
 *       where: { id: entity.id },
 *       data: { status: 'APPROVED', approvedById: ctx.userId },
 *     });
 *   },
 *   sendNotifications: async (entity, result, ctx) => {
 *     // Send email and in-app notifications
 *   },
 * }, { requireAdmin: true, requireModule: 'assets' });
 * ```
 */

import { NextRequest, NextResponse } from 'next/server';
import { ZodSchema } from 'zod';
import { withErrorHandler, APIContext, HandlerOptions } from './handler';
import { TenantPrismaClient, TenantContext } from '@/lib/core/prisma-tenant';
import { logAction } from '@/lib/core/activity';
import { invalidateTokensForEntity, type ApprovalEntityType } from '@/lib/whatsapp';
import { prisma } from '@/lib/core/prisma';
import logger from '@/lib/core/log';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Context passed to approval handler callbacks.
 * Contains tenant information and parsed request data.
 */
export interface ApprovalContext {
  /** Tenant/organization ID */
  tenantId: string;
  /** ID of the user performing the action */
  userId: string;
  /** User's organization role (OWNER, ADMIN, MANAGER, MEMBER) */
  orgRole: string;
  /** Tenant-scoped Prisma client */
  db: TenantPrismaClient;
  /** Notes from request body (if present) */
  notes?: string;
  /** Reason from request body (if present) */
  reason?: string;
  /** Full tenant context from API handler */
  tenant: TenantContext;
}

/**
 * Organization info fetched for notifications
 */
export interface OrgInfo {
  slug: string;
  name: string;
  primaryColor?: string;
}

/**
 * Configuration for creating an approval handler.
 *
 * @typeParam TEntity - The entity type being approved/rejected
 * @typeParam TBody - The request body type (from Zod schema)
 * @typeParam TResult - The result type returned after update (defaults to TEntity)
 */
export interface ApprovalHandlerConfig<TEntity, TBody = unknown, TResult = TEntity> {
  /**
   * Human-readable entity name for error messages.
   * @example 'Asset Request', 'Leave Request', 'Supplier'
   */
  entityName: string;

  /**
   * Zod schema for validating request body.
   * Optional - some approvals have no body (e.g., simple approve button).
   */
  bodySchema?: ZodSchema<TBody>;

  /**
   * Valid statuses that allow this transition.
   * Request will be rejected if entity's current status is not in this list.
   * @example ['PENDING', 'PENDING_ADMIN_APPROVAL']
   */
  validStatuses: string[];

  /**
   * Activity action to log.
   * Should be from ActivityActions constant.
   * @example ActivityActions.ASSET_REQUEST_APPROVED
   */
  activityAction: string;

  /**
   * Activity entity type for logging.
   * @example 'AssetRequest', 'LeaveRequest', 'Supplier'
   */
  activityEntityType: string;

  /**
   * WhatsApp entity type for token invalidation.
   * Optional - only needed if WhatsApp notifications are used.
   * @example 'ASSET_REQUEST', 'LEAVE_REQUEST', 'PURCHASE_REQUEST'
   */
  whatsappEntityType?: ApprovalEntityType;

  /**
   * Fetch the entity by ID.
   * Should include relations needed for notifications and business logic.
   * Returns null if not found (tenant-scoped query).
   */
  fetchEntity: (id: string, db: TenantPrismaClient) => Promise<TEntity | null>;

  /**
   * Extract current status from the entity.
   * Used to validate against validStatuses.
   */
  getStatus: (entity: TEntity) => string;

  /**
   * Extract entity ID for logging.
   * Usually just returns entity.id.
   */
  getEntityId: (entity: TEntity) => string;

  /**
   * Perform the approval/rejection update within a transaction.
   * Should update the entity, create history entries, and any related changes.
   *
   * Note: The transaction client type uses `any` because Prisma extensions
   * create complex intersection types that are difficult to express generically.
   * In practice, `tx` has all standard Prisma model methods available.
   *
   * @param entity - The fetched entity
   * @param body - Parsed request body (undefined if no bodySchema)
   * @param context - Approval context with tenant info
   * @param tx - Prisma transaction client (has all model methods)
   * @returns Updated entity/result
   */
  performUpdate: (
    entity: TEntity,
    body: TBody | undefined,
    context: ApprovalContext,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma transaction client types are complex intersection types that cannot be expressed generically
    tx: any
  ) => Promise<TResult>;

  /**
   * Build custom activity log payload.
   * Optional - provides default empty object if not specified.
   */
  buildActivityPayload?: (
    entity: TEntity,
    result: TResult,
    body: TBody | undefined
  ) => Record<string, unknown>;

  /**
   * Send notifications after successful update.
   * Called as fire-and-forget (errors logged but don't fail the request).
   * Optional - no notifications sent if not specified.
   *
   * @param entity - Original entity before update
   * @param result - Result from performUpdate
   * @param context - Approval context
   * @param orgInfo - Organization info for email templates
   */
  sendNotifications?: (
    entity: TEntity,
    result: TResult,
    context: ApprovalContext,
    orgInfo: OrgInfo
  ) => Promise<void>;

  /**
   * Custom status validation function.
   * Optional - if provided, runs instead of simple validStatuses check.
   * Return error message if invalid, or null if valid.
   *
   * @param entity - The fetched entity
   * @param body - Parsed request body
   * @returns Error message or null
   */
  validateStatus?: (entity: TEntity, body: TBody | undefined) => string | null;

  /**
   * Transform the result before returning to client.
   * Optional - returns result as-is if not specified.
   */
  transformResponse?: (result: TResult) => unknown;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FACTORY FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Creates an approval workflow handler.
 *
 * This factory generates a standardized API handler for approval/rejection
 * workflows. It handles all common logic:
 *
 * - Tenant context validation
 * - ID parameter validation
 * - Request body parsing and validation
 * - Entity fetching (tenant-scoped)
 * - Status transition validation
 * - Transactional updates
 * - Activity logging
 * - WhatsApp token invalidation
 * - Notification sending (fire-and-forget)
 *
 * @param config - Handler configuration
 * @param handlerOptions - Standard handler options (auth, module requirements)
 * @returns Next.js route handler
 *
 * @example
 * // Simple approval with no body
 * export const POST = createApprovalHandler({
 *   entityName: 'Supplier',
 *   validStatuses: ['PENDING'],
 *   activityAction: ActivityActions.SUPPLIER_APPROVED,
 *   activityEntityType: 'Supplier',
 *   fetchEntity: (id, db) => db.supplier.findFirst({ where: { id } }),
 *   getStatus: (e) => e.status,
 *   getEntityId: (e) => e.id,
 *   performUpdate: async (entity, _, ctx, tx) => {
 *     return tx.supplier.update({
 *       where: { id: entity.id },
 *       data: { status: 'APPROVED', approvedById: ctx.userId },
 *     });
 *   },
 * }, { requireAdmin: true });
 *
 * @example
 * // Rejection with required reason
 * export const POST = createApprovalHandler({
 *   entityName: 'Leave Request',
 *   bodySchema: rejectLeaveRequestSchema, // { reason: z.string().min(1) }
 *   validStatuses: ['PENDING'],
 *   activityAction: ActivityActions.LEAVE_REQUEST_REJECTED,
 *   activityEntityType: 'LeaveRequest',
 *   fetchEntity: (id, db) => db.leaveRequest.findFirst({
 *     where: { id },
 *     include: { member: true, leaveType: true },
 *   }),
 *   getStatus: (e) => e.status,
 *   getEntityId: (e) => e.id,
 *   performUpdate: async (entity, body, ctx, tx) => {
 *     return tx.leaveRequest.update({
 *       where: { id: entity.id },
 *       data: {
 *         status: 'REJECTED',
 *         rejectorId: ctx.userId,
 *         rejectionReason: body?.reason,
 *       },
 *     });
 *   },
 *   sendNotifications: async (entity, result, ctx, orgInfo) => {
 *     await sendLeaveRejectionEmail(entity, result, orgInfo);
 *     await createRejectionNotification(entity.memberId, ctx.tenantId);
 *   },
 * }, { requireApproverRole: [Role.ADMIN, Role.HR_MANAGER] });
 */
export function createApprovalHandler<TEntity, TBody = unknown, TResult = TEntity>(
  config: ApprovalHandlerConfig<TEntity, TBody, TResult>,
  handlerOptions: HandlerOptions = { requireAuth: true }
) {
  return withErrorHandler(async (request: NextRequest, context: APIContext) => {
    const { tenant, prisma: tenantPrisma, params } = context;

    // ─────────────────────────────────────────────────────────────────────────────
    // STEP 1: Validate tenant context
    // ─────────────────────────────────────────────────────────────────────────────
    if (!tenant?.tenantId || !tenant?.userId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
    }

    const db = tenantPrisma as TenantPrismaClient;
    const tenantId = tenant.tenantId;
    const userId = tenant.userId;
    const orgRole = tenant.orgRole || 'MEMBER';

    // ─────────────────────────────────────────────────────────────────────────────
    // STEP 2: Validate ID parameter
    // ─────────────────────────────────────────────────────────────────────────────
    const id = params?.id;
    if (!id) {
      return NextResponse.json(
        { error: `${config.entityName} ID is required` },
        { status: 400 }
      );
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // STEP 3: Parse and validate request body (if schema provided)
    // ─────────────────────────────────────────────────────────────────────────────
    let body: TBody | undefined;

    if (config.bodySchema) {
      try {
        const rawBody = await request.json();
        const validation = config.bodySchema.safeParse(rawBody);

        if (!validation.success) {
          return NextResponse.json(
            {
              error: 'Invalid request body',
              details: validation.error.issues,
            },
            { status: 400 }
          );
        }

        body = validation.data;
      } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
      }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // STEP 4: Fetch entity (tenant-scoped)
    // ─────────────────────────────────────────────────────────────────────────────
    const entity = await config.fetchEntity(id, db);

    if (!entity) {
      return NextResponse.json(
        { error: `${config.entityName} not found` },
        { status: 404 }
      );
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // STEP 5: Validate current status allows transition
    // ─────────────────────────────────────────────────────────────────────────────
    if (config.validateStatus) {
      // Custom validation
      const validationError = config.validateStatus(entity, body);
      if (validationError) {
        return NextResponse.json({ error: validationError }, { status: 400 });
      }
    } else {
      // Standard status check
      const currentStatus = config.getStatus(entity);
      if (!config.validStatuses.includes(currentStatus)) {
        return NextResponse.json(
          {
            error: `Cannot perform this action on ${config.entityName.toLowerCase()} with status "${currentStatus}"`,
            details: { currentStatus, allowedStatuses: config.validStatuses },
          },
          { status: 400 }
        );
      }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // STEP 6: Build approval context
    // ─────────────────────────────────────────────────────────────────────────────
    const approvalContext: ApprovalContext = {
      tenantId,
      userId,
      orgRole,
      db,
      tenant,
      notes: (body as Record<string, unknown> | undefined)?.notes as string | undefined,
      reason: (body as Record<string, unknown> | undefined)?.reason as string | undefined,
    };

    // ─────────────────────────────────────────────────────────────────────────────
    // STEP 7: Perform update in transaction
    // ─────────────────────────────────────────────────────────────────────────────
    const result = await db.$transaction(async (tx) => {
      return config.performUpdate(entity, body, approvalContext, tx);
    });

    // ─────────────────────────────────────────────────────────────────────────────
    // STEP 8: Log activity
    // ─────────────────────────────────────────────────────────────────────────────
    const entityId = config.getEntityId(entity);
    const activityPayload = config.buildActivityPayload?.(entity, result, body) || {};

    await logAction(
      tenantId,
      userId,
      config.activityAction,
      config.activityEntityType,
      entityId,
      activityPayload
    );

    // ─────────────────────────────────────────────────────────────────────────────
    // STEP 9: Invalidate WhatsApp tokens (if applicable)
    // ─────────────────────────────────────────────────────────────────────────────
    if (config.whatsappEntityType) {
      try {
        await invalidateTokensForEntity(config.whatsappEntityType, entityId);
      } catch (error) {
        logger.error(
          { error: error instanceof Error ? error.message : 'Unknown error', entityId },
          `[${config.entityName}] Failed to invalidate WhatsApp tokens`
        );
      }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // STEP 10: Send notifications (fire and forget)
    // ─────────────────────────────────────────────────────────────────────────────
    if (config.sendNotifications) {
      // Fetch org info for email templates (use raw prisma for non-tenant model)
      const org = await prisma.organization.findUnique({
        where: { id: tenantId },
        select: { slug: true, name: true, primaryColor: true },
      });

      const orgInfo: OrgInfo = {
        slug: org?.slug || 'app',
        name: org?.name || 'Organization',
        primaryColor: org?.primaryColor || undefined,
      };

      // Fire and forget - don't await, just log errors
      config.sendNotifications(entity, result, approvalContext, orgInfo).catch((err) => {
        logger.error(
          { error: err instanceof Error ? err.message : 'Unknown error', entityId },
          `[${config.entityName}] Failed to send notifications`
        );
      });
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // STEP 11: Return response
    // ─────────────────────────────────────────────────────────────────────────────
    const responseData = config.transformResponse ? config.transformResponse(result) : result;
    return NextResponse.json(responseData);
  }, handlerOptions);
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER TYPES FOR COMMON PATTERNS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Common approval body with optional notes
 */
export interface ApprovalBody {
  notes?: string;
}

/**
 * Common rejection body with required reason
 */
export interface RejectionBody {
  reason: string;
}

/**
 * Re-export types for convenience
 */
export type { ApprovalEntityType } from '@/lib/whatsapp';
export type { TenantPrismaClient } from '@/lib/core/prisma-tenant';
