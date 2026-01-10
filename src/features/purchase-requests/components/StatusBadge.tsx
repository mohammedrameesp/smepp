/**
 * @file StatusBadge.tsx
 * @description Badge components for displaying purchase request status and priority
 * @module components/domains/projects/purchase-requests
 */
'use client';

import { Badge } from '@/components/ui/badge';
import { getStatusLabel, getStatusColor, getPriorityLabel, getPriorityColor } from '@/features/purchase-requests/lib/purchase-request-utils';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  return (
    <Badge className={`${getStatusColor(status)} ${className}`} variant="outline">
      {getStatusLabel(status)}
    </Badge>
  );
}

interface PriorityBadgeProps {
  priority: string;
  className?: string;
}

export function PriorityBadge({ priority, className = '' }: PriorityBadgeProps) {
  return (
    <Badge className={`${getPriorityColor(priority)} ${className}`} variant="outline">
      {getPriorityLabel(priority)}
    </Badge>
  );
}
