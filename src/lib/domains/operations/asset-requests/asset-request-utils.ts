import { prisma, PrismaTransactionClient } from '@/lib/core/prisma';
import { AssetStatus, AssetRequestStatus, AssetRequestType } from '@prisma/client';

/**
 * Generate a unique request number
 * Format: AR-YYMMDD-XXX
 * Example: AR-241222-001
 * @param tx - Optional transaction client to use (required when called inside a transaction)
 */
export async function generateRequestNumber(tx?: PrismaTransactionClient): Promise<string> {
  const db = tx || prisma;
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const datePrefix = `AR-${year}${month}${day}`;

  // Find the highest sequence number for today
  const existingRequests = await db.assetRequest.findMany({
    where: {
      requestNumber: {
        startsWith: datePrefix,
      },
    },
    orderBy: {
      requestNumber: 'desc',
    },
    take: 1,
  });

  let nextSequence = 1;

  if (existingRequests.length > 0) {
    const latestNumber = existingRequests[0].requestNumber;
    // Extract sequence from "AR-YYMMDD-XXX"
    const parts = latestNumber.split('-');
    if (parts.length === 3) {
      const currentSequence = parseInt(parts[2], 10);
      if (!isNaN(currentSequence)) {
        nextSequence = currentSequence + 1;
      }
    }
  }

  const sequence = nextSequence.toString().padStart(3, '0');
  return `${datePrefix}-${sequence}`;
}

/**
 * Check if a user can request an asset
 * - Asset must be SPARE status
 * - Asset must not have any pending requests
 */
export async function canRequestAsset(assetId: string, userId: string): Promise<{
  canRequest: boolean;
  reason?: string;
}> {
  const asset = await prisma.asset.findUnique({
    where: { id: assetId },
    include: {
      assetRequests: {
        where: {
          status: {
            in: [
              AssetRequestStatus.PENDING_ADMIN_APPROVAL,
              AssetRequestStatus.PENDING_USER_ACCEPTANCE,
            ],
          },
        },
      },
    },
  });

  if (!asset) {
    return { canRequest: false, reason: 'Asset not found' };
  }

  if (asset.status !== AssetStatus.SPARE) {
    return { canRequest: false, reason: 'Asset is not available for request' };
  }

  if (asset.assetRequests.length > 0) {
    return { canRequest: false, reason: 'Asset has a pending request' };
  }

  // Check if user already has a pending request for this asset
  const userPendingRequest = await prisma.assetRequest.findFirst({
    where: {
      assetId,
      userId,
      status: AssetRequestStatus.PENDING_ADMIN_APPROVAL,
    },
  });

  if (userPendingRequest) {
    return { canRequest: false, reason: 'You already have a pending request for this asset' };
  }

  return { canRequest: true };
}

/**
 * Check if admin can assign an asset to a user
 * - Asset must be SPARE status
 * - Asset must not have pending requests
 * - User must not already have the asset
 */
export async function canAssignAsset(assetId: string, userId: string): Promise<{
  canAssign: boolean;
  reason?: string;
}> {
  const asset = await prisma.asset.findUnique({
    where: { id: assetId },
    include: {
      assetRequests: {
        where: {
          status: {
            in: [
              AssetRequestStatus.PENDING_ADMIN_APPROVAL,
              AssetRequestStatus.PENDING_USER_ACCEPTANCE,
            ],
          },
        },
      },
    },
  });

  if (!asset) {
    return { canAssign: false, reason: 'Asset not found' };
  }

  if (asset.status !== AssetStatus.SPARE) {
    return { canAssign: false, reason: 'Asset is not available for assignment' };
  }

  if (asset.assetRequests.length > 0) {
    return { canAssign: false, reason: 'Asset has a pending request' };
  }

  if (asset.assignedUserId === userId) {
    return { canAssign: false, reason: 'Asset is already assigned to this user' };
  }

  return { canAssign: true };
}

/**
 * Check if user can return an asset
 * - Asset must be assigned to the user
 * - Asset must be IN_USE status
 * - No pending return request for this asset
 */
export async function canReturnAsset(assetId: string, userId: string): Promise<{
  canReturn: boolean;
  reason?: string;
}> {
  const asset = await prisma.asset.findUnique({
    where: { id: assetId },
    include: {
      assetRequests: {
        where: {
          type: AssetRequestType.RETURN_REQUEST,
          userId,
          status: AssetRequestStatus.PENDING_RETURN_APPROVAL,
        },
      },
    },
  });

  if (!asset) {
    return { canReturn: false, reason: 'Asset not found' };
  }

  if (asset.assignedUserId !== userId) {
    return { canReturn: false, reason: 'Asset is not assigned to you' };
  }

  if (asset.status !== AssetStatus.IN_USE) {
    return { canReturn: false, reason: 'Asset is not in use' };
  }

  if (asset.assetRequests.length > 0) {
    return { canReturn: false, reason: 'You already have a pending return request for this asset' };
  }

  return { canReturn: true };
}

/**
 * Get status label for display
 */
export function getRequestStatusLabel(status: AssetRequestStatus): string {
  const labels: Record<AssetRequestStatus, string> = {
    PENDING_ADMIN_APPROVAL: 'Pending Admin Approval',
    PENDING_USER_ACCEPTANCE: 'Pending Your Acceptance',
    PENDING_RETURN_APPROVAL: 'Pending Return Approval',
    ACCEPTED: 'Accepted',
    APPROVED: 'Approved',
    REJECTED: 'Rejected',
    REJECTED_BY_USER: 'Declined',
    EXPIRED: 'Expired',
    CANCELLED: 'Cancelled',
  };
  return labels[status] || status;
}

/**
 * Get request type label for display
 */
export function getRequestTypeLabel(type: AssetRequestType): string {
  const labels: Record<AssetRequestType, string> = {
    EMPLOYEE_REQUEST: 'Asset Request',
    ADMIN_ASSIGNMENT: 'Assignment',
    RETURN_REQUEST: 'Return Request',
  };
  return labels[type] || type;
}

/**
 * Get status color for badges
 */
export function getRequestStatusColor(status: AssetRequestStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case AssetRequestStatus.PENDING_ADMIN_APPROVAL:
    case AssetRequestStatus.PENDING_USER_ACCEPTANCE:
    case AssetRequestStatus.PENDING_RETURN_APPROVAL:
      return 'secondary';
    case AssetRequestStatus.ACCEPTED:
    case AssetRequestStatus.APPROVED:
      return 'default';
    case AssetRequestStatus.REJECTED:
    case AssetRequestStatus.REJECTED_BY_USER:
      return 'destructive';
    case AssetRequestStatus.EXPIRED:
    case AssetRequestStatus.CANCELLED:
      return 'outline';
    default:
      return 'default';
  }
}

/**
 * Check if request can be cancelled by user
 */
export function canCancelRequest(status: AssetRequestStatus, type: AssetRequestType, isRequester: boolean): boolean {
  if (!isRequester) return false;

  // Only pending requests can be cancelled
  const cancellableStatuses: AssetRequestStatus[] = [
    AssetRequestStatus.PENDING_ADMIN_APPROVAL,
    AssetRequestStatus.PENDING_RETURN_APPROVAL,
  ];

  return cancellableStatuses.includes(status);
}

/**
 * Check if a request can be approved/rejected by admin
 */
export function canAdminProcess(status: AssetRequestStatus, type: AssetRequestType): boolean {
  switch (type) {
    case AssetRequestType.EMPLOYEE_REQUEST:
      return status === AssetRequestStatus.PENDING_ADMIN_APPROVAL;
    case AssetRequestType.RETURN_REQUEST:
      return status === AssetRequestStatus.PENDING_RETURN_APPROVAL;
    default:
      return false;
  }
}

/**
 * Check if user can accept/decline an assignment
 * User can respond when:
 * - Admin directly assigned asset (ADMIN_ASSIGNMENT with PENDING_USER_ACCEPTANCE)
 * - Admin approved employee request (EMPLOYEE_REQUEST with PENDING_USER_ACCEPTANCE)
 */
export function canUserRespond(status: AssetRequestStatus, type: AssetRequestType): boolean {
  if (status !== AssetRequestStatus.PENDING_USER_ACCEPTANCE) {
    return false;
  }
  // Both admin assignments and approved employee requests can be accepted/declined
  return type === AssetRequestType.ADMIN_ASSIGNMENT || type === AssetRequestType.EMPLOYEE_REQUEST;
}

/**
 * Get counts for pending requests (for badges/notifications)
 */
export async function getAssetRequestCounts(userId?: string): Promise<{
  pendingAdminApproval: number;
  pendingUserAcceptance: number;
  pendingReturnApproval: number;
  total: number;
}> {
  const where = userId ? { userId } : {};

  const [pendingAdminApproval, pendingUserAcceptance, pendingReturnApproval] = await Promise.all([
    prisma.assetRequest.count({
      where: { ...where, status: AssetRequestStatus.PENDING_ADMIN_APPROVAL },
    }),
    prisma.assetRequest.count({
      where: { ...where, status: AssetRequestStatus.PENDING_USER_ACCEPTANCE },
    }),
    prisma.assetRequest.count({
      where: { ...where, status: AssetRequestStatus.PENDING_RETURN_APPROVAL },
    }),
  ]);

  return {
    pendingAdminApproval,
    pendingUserAcceptance,
    pendingReturnApproval,
    total: pendingAdminApproval + pendingUserAcceptance + pendingReturnApproval,
  };
}

/**
 * Get admin pending counts (for sidebar badges)
 */
export async function getAdminPendingCounts(): Promise<{
  requests: number;
  returns: number;
  total: number;
}> {
  const [requests, returns] = await Promise.all([
    prisma.assetRequest.count({
      where: { status: AssetRequestStatus.PENDING_ADMIN_APPROVAL },
    }),
    prisma.assetRequest.count({
      where: { status: AssetRequestStatus.PENDING_RETURN_APPROVAL },
    }),
  ]);

  return {
    requests,
    returns,
    total: requests + returns,
  };
}
