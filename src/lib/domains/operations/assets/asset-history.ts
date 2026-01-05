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
  fromMemberId?: string | null;
  toMemberId?: string | null;
  fromStatus?: AssetStatus;
  toStatus?: AssetStatus;
  fromLocation?: string | null;
  toLocation?: string | null;
  notes?: string;
  performedById: string;
}

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
      },
    });
  } catch (error) {
    console.error('Failed to record asset history:', error);
    // Don't throw error to avoid breaking main operations
  }
}

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

export async function recordAssetStatusChange(
  assetId: string,
  fromStatus: AssetStatus,
  toStatus: AssetStatus,
  performedById: string,
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
    notes: notes || `Status changed from ${fromStatus} to ${toStatus}`,
  });
}

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