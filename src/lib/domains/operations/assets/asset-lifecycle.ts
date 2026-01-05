/**
 * @file asset-lifecycle.ts
 * @description Asset lifecycle management - assignment periods, utilization tracking, and user asset history
 * @module domains/operations/assets
 */

import { prisma } from '@/lib/core/prisma';

export interface AssignmentPeriod {
  memberId: string;
  memberName: string | null;
  memberEmail: string;
  startDate: Date;
  endDate: Date | null; // null if currently assigned
  days: number;
  notes?: string;
}

/**
 * Get all assignment periods for an asset
 */
export async function getAssignmentPeriods(assetId: string, tenantId: string): Promise<AssignmentPeriod[]> {
  const asset = await prisma.asset.findFirst({
    where: { id: assetId, tenantId },
    include: {
      assignedMember: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      history: {
        where: {
          action: {
            in: ['ASSIGNED', 'UNASSIGNED'],
          },
        },
        include: {
          toMember: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          fromMember: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!asset) {
    throw new Error('Asset not found');
  }

  const periods: AssignmentPeriod[] = [];
  let currentAssignment: {
    memberId: string;
    memberName: string | null;
    memberEmail: string;
    startDate: Date;
    notes?: string;
  } | null = null;

  for (const historyEntry of asset.history) {
    if (historyEntry.action === 'ASSIGNED' && historyEntry.toMember) {
      // Start new assignment period
      currentAssignment = {
        memberId: historyEntry.toMember.id,
        memberName: historyEntry.toMember.name,
        memberEmail: historyEntry.toMember.email,
        startDate: historyEntry.assignmentDate || historyEntry.createdAt,
        notes: historyEntry.notes || undefined,
      };
    } else if (historyEntry.action === 'UNASSIGNED' && currentAssignment) {
      // End current assignment period
      const endDate = historyEntry.returnDate || historyEntry.createdAt;
      const days = calculateDaysBetween(currentAssignment.startDate, endDate);

      periods.push({
        ...currentAssignment,
        endDate,
        days,
      });
      currentAssignment = null;
    }
  }

  // If currently assigned, add ongoing period
  if (asset.assignedMember && asset.assignedMemberId) {
    // Only add current period if we have a valid start date from history
    if (currentAssignment) {
      const startDate = currentAssignment.startDate;
      const endDate = new Date();
      const days = calculateDaysBetween(startDate, endDate);

      periods.push({
        memberId: asset.assignedMember.id,
        memberName: asset.assignedMember.name,
        memberEmail: asset.assignedMember.email,
        startDate,
        endDate: null,
        days,
        notes: currentAssignment.notes,
      });
    } else {
      // No assignment history found - try to get assignment date from most recent history
      const mostRecentAssignment = await prisma.assetHistory.findFirst({
        where: {
          assetId: asset.id,
          action: 'ASSIGNED',
          toMemberId: asset.assignedMemberId,
        },
        orderBy: { createdAt: 'desc' },
      });

      if (mostRecentAssignment) {
        const startDate = mostRecentAssignment.assignmentDate || mostRecentAssignment.createdAt;
        const endDate = new Date();
        const days = calculateDaysBetween(startDate, endDate);

        periods.push({
          memberId: asset.assignedMember.id,
          memberName: asset.assignedMember.name,
          memberEmail: asset.assignedMember.email,
          startDate,
          endDate: null,
          days,
          notes: mostRecentAssignment.notes || undefined,
        });
      }
      // If still no history, asset was assigned before history tracking - don't include in utilization
    }
  }

  // Deduplicate periods - remove duplicates based on userId, startDate, and endDate
  const uniquePeriods: AssignmentPeriod[] = [];
  const seen = new Set<string>();

  for (const period of periods) {
    // Create a key based on userId and dates (rounded to day)
    const startKey = period.startDate.toISOString().split('T')[0];
    const endKey = period.endDate ? period.endDate.toISOString().split('T')[0] : 'current';
    const key = `${period.memberId}-${startKey}-${endKey}`;

    if (!seen.has(key)) {
      seen.add(key);
      uniquePeriods.push(period);
    }
  }

  return uniquePeriods;
}


/**
 * Calculate days between two dates
 */
function calculateDaysBetween(start: Date, end: Date): number {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Get asset utilization percentage
 */
export async function getAssetUtilization(assetId: string, tenantId: string): Promise<{
  totalOwnedDays: number;
  totalAssignedDays: number;
  utilizationPercentage: number;
}> {
  const asset = await prisma.asset.findFirst({
    where: { id: assetId, tenantId },
  });

  if (!asset) {
    throw new Error('Asset not found');
  }

  const purchaseDate = asset.purchaseDate || asset.createdAt;
  const totalOwnedDays = calculateDaysBetween(purchaseDate, new Date());

  const periods = await getAssignmentPeriods(assetId, tenantId);
  const totalAssignedDays = periods.reduce((sum, period) => sum + period.days, 0);

  const utilizationPercentage = totalOwnedDays > 0
    ? (totalAssignedDays / totalOwnedDays) * 100
    : 0;

  return {
    totalOwnedDays,
    totalAssignedDays,
    utilizationPercentage: Math.round(utilizationPercentage * 100) / 100,
  };
}

/**
 * Get all assets for a member (including past assignments) with their assignment periods
 */
export async function getMemberAssetHistory(memberId: string, tenantId: string) {
  // Get currently assigned assets (within tenant)
  const currentAssets = await prisma.asset.findMany({
    where: { assignedMemberId: memberId, tenantId },
  });

  // Get all assets this member was ever assigned to (from history, within tenant)
  const pastAssignments = await prisma.assetHistory.findMany({
    where: {
      tenantId,
      OR: [
        { toMemberId: memberId },
        { fromMemberId: memberId },
      ],
      action: {
        in: ['ASSIGNED', 'UNASSIGNED'],
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Get unique asset IDs
  const allAssetIds = new Set([
    ...currentAssets.map(a => a.id),
    ...pastAssignments.map(h => h.assetId),
  ]);

  // Get assignment periods for all assets
  const assetsWithPeriods = await Promise.all(
    Array.from(allAssetIds).map(async (assetId) => {
      const asset = currentAssets.find(a => a.id === assetId)
        || await prisma.asset.findFirst({ where: { id: assetId, tenantId } });

      if (!asset) return null;

      const allPeriods = await getAssignmentPeriods(assetId, tenantId);
      // Filter periods for this specific member
      const memberPeriods = allPeriods.filter(p => p.memberId === memberId);

      const totalDays = memberPeriods.reduce((sum, period) => sum + period.days, 0);
      const currentPeriod = memberPeriods.find(p => p.endDate === null);

      return {
        id: asset.id,
        assetTag: asset.assetTag,
        model: asset.model,
        brand: asset.brand,
        type: asset.type,
        serial: asset.serial,
        purchaseDate: asset.purchaseDate,
        supplier: asset.supplier,
        price: asset.price ? Number(asset.price) : null,
        priceCurrency: asset.priceCurrency,
        priceQAR: asset.priceQAR ? Number(asset.priceQAR) : null,
        warrantyExpiry: asset.warrantyExpiry,
        status: asset.status,
        assignedMemberId: asset.assignedMemberId,
        createdAt: asset.createdAt,
        updatedAt: asset.updatedAt,
        memberPeriods,
        totalDays,
        currentPeriod,
        isCurrentlyAssigned: !!currentPeriod,
      };
    })
  );

  return assetsWithPeriods.filter(Boolean).sort((a, b) => {
    // Sort: currently assigned first, then by most recent assignment
    if (a?.isCurrentlyAssigned && !b?.isCurrentlyAssigned) return -1;
    if (!a?.isCurrentlyAssigned && b?.isCurrentlyAssigned) return 1;
    return 0;
  });
}

/**
 * @deprecated Use getMemberAssetHistory instead
 * Alias for backward compatibility with employee pages
 */
export const getUserAssetHistory = getMemberAssetHistory;
