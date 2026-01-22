/**
 * @file asset-request-utils.ts
 * @description Utility functions for asset request workflow - request generation, validation, and status management
 * @module domains/operations/asset-requests
 *
 * Default Format: {PREFIX}-AR-{YYMM}-{SEQ:3}
 * Example: ORG-AR-2412-001, JAS-AR-2412-001
 * Format is configurable per organization via settings.
 */

import { prisma, PrismaTransactionClient } from '@/lib/core/prisma';
import { AssetStatus, AssetRequestStatus, AssetRequestType } from '@prisma/client';
import { getOrganizationCodePrefix, getEntityFormat, applyFormat } from '@/lib/utils/code-prefix';

/**
 * Generate a unique request number using configurable format.
 * Default: {PREFIX}-AR-{YYMM}-{SEQ:3}
 * Example: ORG-AR-2412-001, JAS-AR-2412-001
 * @param tenantId - Organization tenant ID
 * @param tx - Optional transaction client to use (required when called inside a transaction)
 */
export async function generateRequestNumber(
  tenantId: string,
  tx?: PrismaTransactionClient
): Promise<string> {
  const db = tx || prisma;
  const now = new Date();

  // Get organization's code prefix and format
  const codePrefix = await getOrganizationCodePrefix(tenantId);
  const format = await getEntityFormat(tenantId, 'asset-requests');

  // Build search prefix by applying format without sequence
  const searchPrefix = buildSearchPrefix(format, codePrefix, now);

  // Find the highest sequence number for this prefix within this tenant
  const existingRequests = await db.assetRequest.findMany({
    where: {
      tenantId,
      requestNumber: {
        startsWith: searchPrefix,
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
    // Extract sequence number from the end
    const seqMatch = latestNumber.match(/(\d+)$/);
    if (seqMatch) {
      const currentSequence = parseInt(seqMatch[1], 10);
      if (!isNaN(currentSequence)) {
        nextSequence = currentSequence + 1;
      }
    }
  }

  // Generate the complete request number using the configurable format
  return applyFormat(format, {
    prefix: codePrefix,
    sequenceNumber: nextSequence,
    date: now,
  });
}

/**
 * Build a search prefix from format by replacing tokens but not SEQ
 */
function buildSearchPrefix(format: string, prefix: string, date: Date): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  let result = format;

  result = result.replace(/\{PREFIX\}/gi, prefix);
  result = result.replace(/\{YYYY\}/gi, year.toString());
  result = result.replace(/\{YY\}/gi, year.toString().slice(-2));
  result = result.replace(/\{MM\}/gi, month.toString().padStart(2, '0'));
  result = result.replace(/\{DD\}/gi, day.toString().padStart(2, '0'));
  result = result.replace(/\{YYMM\}/gi, year.toString().slice(-2) + month.toString().padStart(2, '0'));
  result = result.replace(/\{YYYYMM\}/gi, year.toString() + month.toString().padStart(2, '0'));
  result = result.replace(/\{TYPE\}/gi, '');

  // Remove SEQ token and everything after it for prefix matching
  result = result.replace(/\{SEQ(:\d+)?\}.*$/, '');

  return result;
}

/**
 * Check if a member can request an asset.
 * Tenant-scoped to prevent cross-tenant access.
 *
 * @param assetId - Asset ID to request
 * @param memberId - Member making the request
 * @param tenantId - Tenant ID for isolation
 */
export async function canRequestAsset(assetId: string, memberId: string, tenantId: string): Promise<{
  canRequest: boolean;
  reason?: string;
}> {
  const asset = await prisma.asset.findFirst({
    where: { id: assetId, tenantId },
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

  // Check if member already has a pending request for this asset
  const memberPendingRequest = await prisma.assetRequest.findFirst({
    where: {
      assetId,
      memberId,
      tenantId,
      status: AssetRequestStatus.PENDING_ADMIN_APPROVAL,
    },
  });

  if (memberPendingRequest) {
    return { canRequest: false, reason: 'You already have a pending request for this asset' };
  }

  return { canRequest: true };
}

/**
 * Check if admin can assign an asset to a member.
 * Tenant-scoped to prevent cross-tenant access.
 *
 * @param assetId - Asset ID to assign
 * @param memberId - Target member ID
 * @param tenantId - Tenant ID for isolation
 */
export async function canAssignAsset(assetId: string, memberId: string, tenantId: string): Promise<{
  canAssign: boolean;
  reason?: string;
}> {
  const asset = await prisma.asset.findFirst({
    where: { id: assetId, tenantId },
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

  if (asset.assignedMemberId === memberId) {
    return { canAssign: false, reason: 'Asset is already assigned to this member' };
  }

  return { canAssign: true };
}

/**
 * Check if member can return an asset.
 * Tenant-scoped to prevent cross-tenant access.
 *
 * @param assetId - Asset ID to return
 * @param memberId - Member returning the asset
 * @param tenantId - Tenant ID for isolation
 */
export async function canReturnAsset(assetId: string, memberId: string, tenantId: string): Promise<{
  canReturn: boolean;
  reason?: string;
}> {
  const asset = await prisma.asset.findFirst({
    where: { id: assetId, tenantId },
    include: {
      assetRequests: {
        where: {
          type: AssetRequestType.RETURN_REQUEST,
          memberId,
          status: AssetRequestStatus.PENDING_RETURN_APPROVAL,
        },
      },
    },
  });

  if (!asset) {
    return { canReturn: false, reason: 'Asset not found' };
  }

  if (asset.assignedMemberId !== memberId) {
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

