/**
 * @file asset-history.ts
 * @description Asset history tracking functions
 * @module domains/operations/assets
 *
 * FEATURES:
 * - Record assignment changes (assigned/unassigned)
 * - Record status changes (IN_USE, SPARE, REPAIR, DISPOSED)
 * - Record location changes
 * - Record asset creation and updates
 * - Query asset history (by asset or member)
 *
 * HISTORY ACTIONS:
 * - CREATED: Asset was created
 * - UPDATED: Asset fields were modified
 * - ASSIGNED: Asset assigned to a member
 * - UNASSIGNED: Asset returned/unassigned
 * - STATUS_CHANGED: Asset status changed
 * - LOCATION_CHANGED: Asset moved to new location
 *
 * NON-BLOCKING:
 * All history operations are wrapped in try/catch to avoid
 * breaking main operations if history recording fails.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// IMPORTS
// ═══════════════════════════════════════════════════════════════════════════════

import { prisma } from '@/lib/core/prisma';
import { AssetHistoryAction, AssetStatus } from '@prisma/client';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface RecordAssetHistoryParams {
  assetId: string;
  tenantId: string;
  action: AssetHistoryAction;
  fromMemberId?: string | null;
  toMemberId?: string | null;
  fromStatus?: AssetStatus;
  toStatus?: AssetStatus;
  fromLocation?: string | null;
  toLocation?: string | null;
  notes?: string;
  performedById: string;
  statusChangeDate?: Date;
  // Bi-temporal tracking
  effectiveDate?: Date; // When the event actually occurred (defaults to now)
  // Correction tracking
  correctsEntryId?: string; // ID of entry being corrected
  correctionReason?: string; // Why correction is needed
}

// ═══════════════════════════════════════════════════════════════════════════════
// CORE HISTORY RECORDING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Record a history entry for an asset.
 * This is the low-level function that other helpers use.
 *
 * @param params - History entry parameters
 *
 * @example
 * await recordAssetHistory({
 *   assetId: 'asset-123',
 *   tenantId: 'tenant-456',
 *   action: AssetHistoryAction.STATUS_CHANGED,
 *   fromStatus: AssetStatus.IN_USE,
 *   toStatus: AssetStatus.REPAIR,
 *   performedById: 'user-789',
 *   notes: 'Sent for repair - screen damage',
 * });
 */
export async function recordAssetHistory({
  assetId,
  tenantId,
  action,
  fromMemberId,
  toMemberId,
  fromStatus,
  toStatus,
  fromLocation,
  toLocation,
  notes,
  performedById,
  statusChangeDate,
}: RecordAssetHistoryParams) {
  try {
    await prisma.assetHistory.create({
      data: {
        tenantId,
        assetId,
        action,
        fromMemberId,
        toMemberId,
        fromStatus,
        toStatus,
        fromLocation,
        toLocation,
        notes,
        performedById,
        statusChangeDate,
      },
    });
  } catch (error) {
    console.error('Failed to record asset history:', error);
    // Don't throw error to avoid breaking main operations
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ASSIGNMENT TRACKING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Record an asset assignment change.
 *
 * Creates ASSIGNED action when toMemberId is provided,
 * or UNASSIGNED action when toMemberId is null.
 *
 * @param assetId - Asset being assigned/unassigned
 * @param fromMemberId - Previous assignee (null if first assignment)
 * @param toMemberId - New assignee (null if being returned)
 * @param performedById - User performing the action
 * @param notes - Optional notes about the assignment
 * @param assignmentDate - Date of assignment (defaults to now)
 * @param returnDate - Date of return for unassignment (defaults to now)
 *
 * @example
 * // Assign to user
 * await recordAssetAssignment('asset-123', null, 'user-456', 'admin-789');
 *
 * // Return from user
 * await recordAssetAssignment('asset-123', 'user-456', null, 'admin-789');
 */
export async function recordAssetAssignment(
  assetId: string,
  fromMemberId: string | null,
  toMemberId: string | null,
  performedById: string,
  notes?: string,
  assignmentDate?: Date,
  returnDate?: Date
) {
  // Fetch tenantId from asset
  const asset = await prisma.asset.findUnique({
    where: { id: assetId },
    select: { tenantId: true },
  });
  if (!asset) {
    console.error('Asset not found for recordAssetAssignment');
    return;
  }

  const action = toMemberId
    ? (fromMemberId ? AssetHistoryAction.ASSIGNED : AssetHistoryAction.ASSIGNED)
    : AssetHistoryAction.UNASSIGNED;

  const actualAssignmentDate = assignmentDate || new Date();
  const actualReturnDate = returnDate || new Date();

  await recordAssetHistory({
    assetId,
    tenantId: asset.tenantId,
    action,
    fromMemberId,
    toMemberId,
    performedById,
    notes: notes || (action === AssetHistoryAction.ASSIGNED
      ? `Asset assigned to member`
      : `Asset unassigned from member`),
  });

  // Get the latest history record to update dates
  const latestHistory = await prisma.assetHistory.findFirst({
    where: { assetId, action },
    orderBy: { createdAt: 'desc' }
  });

  if (latestHistory) {
    // Update the assignment date for ASSIGNED action
    if (action === AssetHistoryAction.ASSIGNED) {
      await prisma.assetHistory.update({
        where: { id: latestHistory.id },
        data: { assignmentDate: actualAssignmentDate }
      });
    }
    // Update the return date for UNASSIGNED action
    else if (action === AssetHistoryAction.UNASSIGNED) {
      await prisma.assetHistory.update({
        where: { id: latestHistory.id },
        data: { returnDate: actualReturnDate }
      });
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// STATUS TRACKING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Record an asset status change.
 *
 * @param assetId - Asset whose status changed
 * @param fromStatus - Previous status
 * @param toStatus - New status
 * @param performedById - User performing the change
 * @param statusChangeDate - Date when the status change occurred (defaults to now)
 * @param notes - Optional notes about the change
 *
 * @example
 * await recordAssetStatusChange(
 *   'asset-123',
 *   AssetStatus.IN_USE,
 *   AssetStatus.REPAIR,
 *   'admin-456',
 *   new Date('2025-01-01'),
 *   'Sent for screen repair'
 * );
 */
export async function recordAssetStatusChange(
  assetId: string,
  fromStatus: AssetStatus,
  toStatus: AssetStatus,
  performedById: string,
  statusChangeDate?: Date,
  notes?: string
) {
  // Fetch tenantId from asset
  const asset = await prisma.asset.findUnique({
    where: { id: assetId },
    select: { tenantId: true },
  });
  if (!asset) {
    console.error('Asset not found for recordAssetStatusChange');
    return;
  }

  await recordAssetHistory({
    assetId,
    tenantId: asset.tenantId,
    action: AssetHistoryAction.STATUS_CHANGED,
    fromStatus,
    toStatus,
    performedById,
    statusChangeDate: statusChangeDate || new Date(),
    notes: notes || `Status changed from ${fromStatus} to ${toStatus}`,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOCATION TRACKING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Record an asset location change.
 *
 * @param assetId - Asset being moved
 * @param fromLocation - Previous location (null if not set)
 * @param toLocation - New location (null if clearing)
 * @param performedById - User performing the change
 * @param notes - Optional notes about the move
 *
 * @example
 * await recordAssetLocationChange(
 *   'asset-123',
 *   'Main Office',
 *   'Warehouse B',
 *   'admin-456',
 *   'Moving to warehouse for inventory'
 * );
 */
export async function recordAssetLocationChange(
  assetId: string,
  fromLocation: string | null,
  toLocation: string | null,
  performedById: string,
  notes?: string
) {
  // Fetch tenantId from asset
  const asset = await prisma.asset.findUnique({
    where: { id: assetId },
    select: { tenantId: true },
  });
  if (!asset) {
    console.error('Asset not found for recordAssetLocationChange');
    return;
  }

  await recordAssetHistory({
    assetId,
    tenantId: asset.tenantId,
    action: AssetHistoryAction.LOCATION_CHANGED,
    fromLocation,
    toLocation,
    performedById,
    notes: notes || `Location changed from ${fromLocation || 'unspecified'} to ${toLocation || 'unspecified'}`,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// LIFECYCLE TRACKING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Record asset creation event.
 *
 * @param assetId - Newly created asset ID
 * @param performedById - User who created the asset
 * @param initialMemberId - Initial assignee (if assigned at creation)
 * @param _initialProjectId - Reserved for future project tracking
 */
export async function recordAssetCreation(
  assetId: string,
  performedById: string,
  initialMemberId?: string | null,
  _initialProjectId?: string | null
) {
  // Fetch tenantId from asset
  const asset = await prisma.asset.findUnique({
    where: { id: assetId },
    select: { tenantId: true },
  });
  if (!asset) {
    console.error('Asset not found for recordAssetCreation');
    return;
  }

  await recordAssetHistory({
    assetId,
    tenantId: asset.tenantId,
    action: AssetHistoryAction.CREATED,
    toMemberId: initialMemberId,
    performedById,
    notes: 'Asset created',
  });
}

/**
 * Record asset update event.
 *
 * @param assetId - Updated asset ID
 * @param performedById - User who updated the asset
 * @param notes - Description of what was changed
 *
 * @example
 * await recordAssetUpdate('asset-123', 'admin-456', 'Price updated: 5000 → 5500');
 */
export async function recordAssetUpdate(
  assetId: string,
  performedById: string,
  notes?: string
) {
  // Fetch tenantId from asset
  const asset = await prisma.asset.findUnique({
    where: { id: assetId },
    select: { tenantId: true },
  });
  if (!asset) {
    console.error('Asset not found for recordAssetUpdate');
    return;
  }

  await recordAssetHistory({
    assetId,
    tenantId: asset.tenantId,
    action: AssetHistoryAction.UPDATED,
    performedById,
    notes: notes || 'Asset updated',
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// HISTORY QUERIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get full history timeline for an asset.
 *
 * @param assetId - Asset to get history for
 * @param tenantId - Tenant ID for isolation
 * @returns Array of history entries with performer info
 */
export async function getAssetHistory(assetId: string, tenantId: string) {
  return await prisma.assetHistory.findMany({
    where: { assetId, tenantId },
    include: {
      fromMember: {
        select: { id: true, name: true, email: true },
      },
      toMember: {
        select: { id: true, name: true, email: true },
      },
      performedBy: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Get asset history for a specific member.
 * Shows all assets they've been assigned to or unassigned from.
 *
 * @param memberId - Member to get history for
 * @param tenantId - Tenant ID for isolation
 * @returns Array of history entries with asset details
 */
export async function getMemberAssetHistory(memberId: string, tenantId: string) {
  return await prisma.assetHistory.findMany({
    where: {
      tenantId,
      OR: [
        { fromMemberId: memberId },
        { toMemberId: memberId },
      ],
    },
    include: {
      asset: {
        select: { id: true, model: true, assetTag: true, type: true },
      },
      fromMember: {
        select: { id: true, name: true, email: true },
      },
      toMember: {
        select: { id: true, name: true, email: true },
      },
      performedBy: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}
