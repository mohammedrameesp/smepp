/**
 * @file status-transition.ts
 * @description Utilities for entity status transitions with history tracking.
 */

export interface StatusTransitionConfig<TStatus extends string = string> {
  /** Current status of the entity */
  currentStatus: TStatus;
  /** New status to transition to */
  newStatus: TStatus;
  /** User performing the transition */
  performedById: string;
  /** Tenant ID */
  tenantId: string;
  /** Optional notes for the transition */
  notes?: string | null;
  /** Optional reason (for rejections) */
  reason?: string | null;
}

export interface HistoryEntryData {
  /** Action performed (e.g., 'APPROVED', 'REJECTED', 'CANCELLED') */
  action: string;
  /** Previous status */
  oldStatus: string;
  /** New status */
  newStatus: string;
  /** User who performed the action */
  performedById: string;
  /** Tenant ID */
  tenantId: string;
  /** Notes */
  notes?: string | null;
  /** Reason (for rejections) */
  reason?: string | null;
  /** Timestamp */
  createdAt: Date;
}

/**
 * Build history entry data for a status transition.
 *
 * @example
 * const historyData = buildHistoryEntry({
 *   currentStatus: 'PENDING',
 *   newStatus: 'APPROVED',
 *   performedById: userId,
 *   tenantId,
 *   notes: 'Approved by manager',
 * }, 'APPROVED');
 *
 * await tx.leaveRequestHistory.create({
 *   data: {
 *     leaveRequestId: request.id,
 *     ...historyData,
 *   },
 * });
 */
export function buildHistoryEntry(
  config: StatusTransitionConfig,
  action: string
): HistoryEntryData {
  return {
    action,
    oldStatus: config.currentStatus,
    newStatus: config.newStatus,
    performedById: config.performedById,
    tenantId: config.tenantId,
    notes: config.notes,
    reason: config.reason,
    createdAt: new Date(),
  };
}

/**
 * Validate that a status transition is allowed.
 *
 * @example
 * const validation = validateStatusTransition(
 *   request.status,
 *   ['PENDING'],
 *   'Leave Request'
 * );
 *
 * if (!validation.valid) {
 *   return NextResponse.json({ error: validation.error }, { status: 400 });
 * }
 */
export function validateStatusTransition(
  currentStatus: string,
  allowedStatuses: string[],
  entityName: string = 'Entity'
): { valid: true } | { valid: false; error: string } {
  if (!allowedStatuses.includes(currentStatus)) {
    return {
      valid: false,
      error: `Cannot perform this action on ${entityName.toLowerCase()} with status "${currentStatus}". Allowed statuses: ${allowedStatuses.join(', ')}`,
    };
  }
  return { valid: true };
}

/**
 * Common status transition actions.
 */
export const TransitionActions = {
  CREATED: 'CREATED',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
  COMPLETED: 'COMPLETED',
  PENDING: 'PENDING',
  SUBMITTED: 'SUBMITTED',
  RETURNED: 'RETURNED',
  ASSIGNED: 'ASSIGNED',
  UNASSIGNED: 'UNASSIGNED',
  ACCEPTED: 'ACCEPTED',
  DECLINED: 'DECLINED',
} as const;

export type TransitionAction =
  (typeof TransitionActions)[keyof typeof TransitionActions];

/**
 * Status transition result with entity and history.
 */
export interface TransitionResult<TEntity, THistory> {
  entity: TEntity;
  history: THistory;
}

/**
 * Create a status transition factory for a specific entity type.
 * This is useful when you have multiple transitions for the same entity.
 *
 * @example
 * const leaveTransition = createTransitionFactory<LeaveRequest, LeaveRequestHistory>({
 *   historyModel: 'leaveRequestHistory',
 *   entityIdField: 'leaveRequestId',
 * });
 *
 * // Later in handler:
 * const historyData = leaveTransition.buildHistory({
 *   entityId: request.id,
 *   currentStatus: request.status,
 *   newStatus: 'APPROVED',
 *   action: 'APPROVED',
 *   performedById: userId,
 *   tenantId,
 * });
 */
export interface TransitionFactoryConfig {
  /** The Prisma model name for history (e.g., 'leaveRequestHistory') */
  historyModel: string;
  /** The field name linking to the entity (e.g., 'leaveRequestId') */
  entityIdField: string;
}

export interface TransitionFactoryBuildHistoryParams {
  entityId: string;
  currentStatus: string;
  newStatus: string;
  action: string;
  performedById: string;
  tenantId: string;
  notes?: string | null;
  reason?: string | null;
}

export function createTransitionFactory(config: TransitionFactoryConfig) {
  return {
    /**
     * Build history create data for this entity type.
     */
    buildHistoryCreateData(params: TransitionFactoryBuildHistoryParams) {
      return {
        [config.entityIdField]: params.entityId,
        action: params.action,
        oldStatus: params.currentStatus,
        newStatus: params.newStatus,
        performedById: params.performedById,
        tenantId: params.tenantId,
        notes: params.notes,
        reason: params.reason,
      };
    },

    /**
     * Get the history model name.
     */
    get historyModel() {
      return config.historyModel;
    },

    /**
     * Get the entity ID field name.
     */
    get entityIdField() {
      return config.entityIdField;
    },
  };
}

// Pre-configured factories for common entities
export const LeaveRequestTransition = createTransitionFactory({
  historyModel: 'leaveRequestHistory',
  entityIdField: 'leaveRequestId',
});

export const AssetRequestTransition = createTransitionFactory({
  historyModel: 'assetRequestHistory',
  entityIdField: 'assetRequestId',
});

export const PurchaseRequestTransition = createTransitionFactory({
  historyModel: 'purchaseRequestHistory',
  entityIdField: 'purchaseRequestId',
});
