/**
 * @file asset-request-type-badge.tsx
 * @description Badge component displaying asset request type with appropriate styling
 * @module components/domains/operations/asset-requests
 */
'use client';

import { Badge } from '@/components/ui/badge';
import { AssetRequestType } from '@prisma/client';
import { getRequestTypeClassesWithBorder } from '@/lib/constants';

interface AssetRequestTypeBadgeProps {
  type: AssetRequestType | string;
  className?: string;
}

export function getRequestTypeLabel(type: AssetRequestType | string): string {
  const labels: Record<string, string> = {
    EMPLOYEE_REQUEST: 'Request',
    ADMIN_ASSIGNMENT: 'Assignment',
    RETURN_REQUEST: 'Return',
  };
  return labels[type] || type;
}

/**
 * Get request type color for UI badges.
 * Uses centralized REQUEST_TYPE_COLORS from @/lib/constants.
 */
export function getRequestTypeColor(type: AssetRequestType | string): string {
  return getRequestTypeClassesWithBorder(type);
}

export function AssetRequestTypeBadge({ type, className = '' }: AssetRequestTypeBadgeProps) {
  return (
    <Badge
      className={`${getRequestTypeColor(type)} ${className}`}
      variant="outline"
    >
      {getRequestTypeLabel(type)}
    </Badge>
  );
}
