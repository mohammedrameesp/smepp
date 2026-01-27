/**
 * @file asset-request-status-badge.tsx
 * @description Badge component displaying asset request status with appropriate styling
 * @module components/domains/operations/asset-requests
 */
'use client';

import { Badge } from '@/components/ui/badge';
import { AssetRequestStatus } from '@prisma/client';
import { getStatusClassesWithBorder } from '@/lib/constants';

interface AssetRequestStatusBadgeProps {
  status: AssetRequestStatus | string;
  className?: string;
}

export function getRequestStatusLabel(status: AssetRequestStatus | string): string {
  const labels: Record<string, string> = {
    PENDING_ADMIN_APPROVAL: 'Pending Admin Approval',
    PENDING_USER_ACCEPTANCE: 'Pending Acceptance',
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
 * Get status color for asset request badges.
 * Uses centralized STATUS_COLORS from @/lib/constants.
 */
export function getRequestStatusColor(status: AssetRequestStatus | string): string {
  return getStatusClassesWithBorder(status);
}

export function AssetRequestStatusBadge({ status, className = '' }: AssetRequestStatusBadgeProps) {
  return (
    <Badge
      className={`${getRequestStatusColor(status)} ${className}`}
      variant="outline"
    >
      {getRequestStatusLabel(status)}
    </Badge>
  );
}
