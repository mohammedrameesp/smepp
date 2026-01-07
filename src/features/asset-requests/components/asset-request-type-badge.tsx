/**
 * @file asset-request-type-badge.tsx
 * @description Badge component displaying asset request type with appropriate styling
 * @module components/domains/operations/asset-requests
 */
'use client';

import { Badge } from '@/components/ui/badge';
import { AssetRequestType } from '@prisma/client';

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

export function getRequestTypeColor(type: AssetRequestType | string): string {
  switch (type) {
    case 'EMPLOYEE_REQUEST':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'ADMIN_ASSIGNMENT':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'RETURN_REQUEST':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
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
