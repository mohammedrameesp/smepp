/**
 * @file status-badge.tsx
 * @description Reusable status badge component using centralized status configurations
 * @module components/ui
 */

import { Badge } from '@/components/ui/badge';
import {
  APPROVAL_STATUS,
  SUBSCRIPTION_STATUS,
  ASSET_STATUS,
  SUPPLIER_STATUS,
  LEAVE_STATUS,
  ACTIVE_STATUS,
  PRIORITY_STATUS,
  getStatusConfig,
  type StatusConfig,
} from '@/lib/constants';
import { cn } from '@/lib/core/utils';

type StatusType =
  | 'approval'
  | 'subscription'
  | 'asset'
  | 'supplier'
  | 'leave'
  | 'active'
  | 'priority';

const STATUS_CONFIGS: Record<StatusType, Record<string, StatusConfig>> = {
  approval: APPROVAL_STATUS,
  subscription: SUBSCRIPTION_STATUS,
  asset: ASSET_STATUS,
  supplier: SUPPLIER_STATUS,
  leave: LEAVE_STATUS,
  active: ACTIVE_STATUS,
  priority: PRIORITY_STATUS,
};

interface StatusBadgeProps {
  /** The status value (e.g., 'APPROVED', 'PENDING') */
  status: string;
  /** The type of status to look up configuration for */
  type: StatusType;
  /** Additional CSS classes */
  className?: string;
  /** Whether to show the icon if configured */
  showIcon?: boolean;
  /** Override the label text */
  label?: string;
}

/**
 * Renders a styled badge based on centralized status configuration.
 *
 * @example
 * ```tsx
 * <StatusBadge status="APPROVED" type="approval" />
 * <StatusBadge status="ACTIVE" type="subscription" />
 * <StatusBadge status="PENDING" type="leave" showIcon />
 * ```
 */
export function StatusBadge({
  status,
  type,
  className,
  showIcon = false,
  label,
}: StatusBadgeProps) {
  const config = getStatusConfig(status, STATUS_CONFIGS[type]);
  const Icon = showIcon ? config.icon : undefined;

  return (
    <Badge variant={config.variant} className={cn('text-xs', className)}>
      {Icon && <Icon className="mr-1 h-3 w-3" />}
      {label ?? config.label}
    </Badge>
  );
}

/**
 * Quick status badge for approval workflows (leave, spend, asset requests)
 */
export function ApprovalStatusBadge({
  status,
  className,
  showIcon = true,
}: Omit<StatusBadgeProps, 'type'>) {
  return (
    <StatusBadge
      status={status}
      type="approval"
      className={className}
      showIcon={showIcon}
    />
  );
}

/**
 * Quick status badge for subscriptions
 */
export function SubscriptionStatusBadge({
  status,
  className,
}: Omit<StatusBadgeProps, 'type' | 'showIcon'>) {
  return <StatusBadge status={status} type="subscription" className={className} />;
}

/**
 * Quick status badge for assets
 */
export function AssetStatusBadge({
  status,
  className,
}: Omit<StatusBadgeProps, 'type' | 'showIcon'>) {
  return <StatusBadge status={status} type="asset" className={className} />;
}

/**
 * Quick status badge for suppliers
 */
export function SupplierStatusBadge({
  status,
  className,
}: Omit<StatusBadgeProps, 'type' | 'showIcon'>) {
  return <StatusBadge status={status} type="supplier" className={className} />;
}

/**
 * Quick status badge for leave requests
 */
export function LeaveStatusBadge({
  status,
  className,
  showIcon = true,
}: Omit<StatusBadgeProps, 'type'>) {
  return (
    <StatusBadge
      status={status}
      type="leave"
      className={className}
      showIcon={showIcon}
    />
  );
}
