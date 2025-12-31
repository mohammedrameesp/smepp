/**
 * @file asset-history.ts
 * @description Asset history tracking - records assignment, status, location, and lifecycle changes
 * @module domains/operations/assets
 */

import { prisma } from '@/lib/core/prisma';
import { AssetHistoryAction, AssetStatus } from '@prisma/client';

interface RecordAssetHistoryParams {
  assetId: string;
  tenantId: string;
  action: AssetHistoryAction;
  fromUserId?: string | null;
  toUserId?: string | null;
  fromStatus?: AssetStatus;
  toStatus?: AssetStatus;
  fromLocation?: string | null;
  toLocation?: string | null;
  notes?: string;
  performedBy: string;
}

export async function recordAssetHistory({
  assetId,
  tenantId,
  action,
  fromUserId,
  toUserId,
  fromStatus,
  toStatus,
  fromLocation,
  toLocation,
  notes,
  performedBy,
}: RecordAssetHistoryParams) {
  try {
    await prisma.assetHistory.create({
      data: {
        tenantId,
        assetId,
        action,
        fromUserId,
        toUserId,
        fromStatus,
        toStatus,
        fromLocation,
        toLocation,
        notes,
        performedBy,
      },
    });
  } catch (error) {
    console.error('Failed to record asset history:', error);
    // Don't throw error to avoid breaking main operations
  }
}

export async function recordAssetAssignment(
  assetId: string,
  fromUserId: string | null,
  toUserId: string | null,
  performedBy: string,
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

  const action = toUserId
    ? (fromUserId ? AssetHistoryAction.ASSIGNED : AssetHistoryAction.ASSIGNED)
    : AssetHistoryAction.UNASSIGNED;

  const actualAssignmentDate = assignmentDate || new Date();
  const actualReturnDate = returnDate || new Date();

  await recordAssetHistory({
    assetId,
    tenantId: asset.tenantId,
    action,
    fromUserId,
    toUserId,
    performedBy,
    notes: notes || (action === AssetHistoryAction.ASSIGNED
      ? `Asset assigned to user`
      : `Asset unassigned from user`),
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

export async function recordAssetStatusChange(
  assetId: string,
  fromStatus: AssetStatus,
  toStatus: AssetStatus,
  performedBy: string,
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
    performedBy,
    notes: notes || `Status changed from ${fromStatus} to ${toStatus}`,
  });
}

/**
 * Record asset project change
 * @deprecated PROJECT_CHANGED action is no longer supported as Asset model doesn't have project fields.
 * This function is kept as a stub for backward compatibility.
 */
export async function recordAssetProjectChange(
  _assetId: string,
  _fromProject: string | null,
  _toProject: string | null,
  _performedBy: string,
  _notes?: string
) {
  // This function is deprecated - PROJECT_CHANGED action is no longer supported
  // Asset model no longer has project fields
}

export async function recordAssetLocationChange(
  assetId: string,
  fromLocation: string | null,
  toLocation: string | null,
  performedBy: string,
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
    performedBy,
    notes: notes || `Location changed from ${fromLocation || 'unspecified'} to ${toLocation || 'unspecified'}`,
  });
}

export async function recordAssetCreation(
  assetId: string,
  performedBy: string,
  initialUserId?: string | null,
  initialProjectId?: string | null
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
    toUserId: initialUserId,
    performedBy,
    notes: 'Asset created',
  });
}

export async function recordAssetUpdate(
  assetId: string,
  performedBy: string,
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
    performedBy,
    notes: notes || 'Asset updated',
  });
}

export async function getAssetHistory(assetId: string) {
  return await prisma.assetHistory.findMany({
    where: { assetId },
    include: {
      fromUser: {
        select: { id: true, name: true, email: true },
      },
      toUser: {
        select: { id: true, name: true, email: true },
      },
      performer: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getUserAssetHistory(userId: string) {
  return await prisma.assetHistory.findMany({
    where: {
      OR: [
        { fromUserId: userId },
        { toUserId: userId },
      ],
    },
    include: {
      asset: {
        select: { id: true, model: true, assetTag: true, type: true },
      },
      fromUser: {
        select: { id: true, name: true, email: true },
      },
      toUser: {
        select: { id: true, name: true, email: true },
      },
      performer: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}