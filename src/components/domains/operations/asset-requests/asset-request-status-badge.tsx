'use client';

import { Badge } from '@/components/ui/badge';
import { AssetRequestStatus } from '@prisma/client';

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

export function getRequestStatusColor(status: AssetRequestStatus | string): string {
  switch (status) {
    case 'PENDING_ADMIN_APPROVAL':
    case 'PENDING_USER_ACCEPTANCE':
    case 'PENDING_RETURN_APPROVAL':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'ACCEPTED':
    case 'APPROVED':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'REJECTED':
    case 'REJECTED_BY_USER':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'EXPIRED':
    case 'CANCELLED':
      return 'bg-gray-100 text-gray-600 border-gray-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
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
