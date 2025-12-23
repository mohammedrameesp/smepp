import { prisma } from '@/lib/prisma';

export interface AssignmentPeriod {
  userId: string;
  userName: string | null;
  userEmail: string;
  startDate: Date;
  endDate: Date | null; // null if currently assigned
  days: number;
  notes?: string;
}

/**
 * Get all assignment periods for an asset
 */
export async function getAssignmentPeriods(assetId: string): Promise<AssignmentPeriod[]> {
  const asset = await prisma.asset.findUnique({
    where: { id: assetId },
    include: {
      assignedUser: {
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
          toUser: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          fromUser: {
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
    userId: string;
    userName: string | null;
    userEmail: string;
    startDate: Date;
    notes?: string;
  } | null = null;

  for (const historyEntry of asset.history) {
    if (historyEntry.action === 'ASSIGNED' && historyEntry.toUser) {
      // Start new assignment period
      currentAssignment = {
        userId: historyEntry.toUser.id,
        userName: historyEntry.toUser.name,
        userEmail: historyEntry.toUser.email,
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
  if (asset.assignedUser && asset.assignedUserId) {
    // Only add current period if we have a valid start date from history
    if (currentAssignment) {
      const startDate = currentAssignment.startDate;
      const endDate = new Date();
      const days = calculateDaysBetween(startDate, endDate);

      periods.push({
        userId: asset.assignedUser.id,
        userName: asset.assignedUser.name,
        userEmail: asset.assignedUser.email,
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
          toUserId: asset.assignedUserId,
        },
        orderBy: { createdAt: 'desc' },
      });

      if (mostRecentAssignment) {
        const startDate = mostRecentAssignment.assignmentDate || mostRecentAssignment.createdAt;
        const endDate = new Date();
        const days = calculateDaysBetween(startDate, endDate);

        periods.push({
          userId: asset.assignedUser.id,
          userName: asset.assignedUser.name,
          userEmail: asset.assignedUser.email,
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
    const key = `${period.userId}-${startKey}-${endKey}`;

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
export async function getAssetUtilization(assetId: string): Promise<{
  totalOwnedDays: number;
  totalAssignedDays: number;
  utilizationPercentage: number;
}> {
  const asset = await prisma.asset.findUnique({
    where: { id: assetId },
  });

  if (!asset) {
    throw new Error('Asset not found');
  }

  const purchaseDate = asset.purchaseDate || asset.createdAt;
  const totalOwnedDays = calculateDaysBetween(purchaseDate, new Date());

  const periods = await getAssignmentPeriods(assetId);
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
 * Get all assets for a user (including past assignments) with their assignment periods
 */
export async function getUserAssetHistory(userId: string) {
  // Get currently assigned assets
  const currentAssets = await prisma.asset.findMany({
    where: { assignedUserId: userId },
  });

  // Get all assets this user was ever assigned to (from history)
  const pastAssignments = await prisma.assetHistory.findMany({
    where: {
      OR: [
        { toUserId: userId },
        { fromUserId: userId },
      ],
      action: {
        in: ['ASSIGNED', 'UNASSIGNED'],
      },
    },
    include: {
      asset: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  // Get unique asset IDs
  const allAssetIds = new Set([
    ...currentAssets.map(a => a.id),
    ...pastAssignments.map(h => h.asset.id),
  ]);

  // Get assignment periods for all assets
  const assetsWithPeriods = await Promise.all(
    Array.from(allAssetIds).map(async (assetId) => {
      const asset = currentAssets.find(a => a.id === assetId)
        || pastAssignments.find(h => h.asset.id === assetId)?.asset;

      if (!asset) return null;

      const allPeriods = await getAssignmentPeriods(assetId);
      // Filter periods for this specific user
      const userPeriods = allPeriods.filter(p => p.userId === userId);

      const totalDays = userPeriods.reduce((sum, period) => sum + period.days, 0);
      const currentPeriod = userPeriods.find(p => p.endDate === null);

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
        acquisitionType: asset.acquisitionType,
        transferNotes: asset.transferNotes,
        assignedUserId: asset.assignedUserId,
        createdAt: asset.createdAt,
        updatedAt: asset.updatedAt,
        userPeriods,
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
