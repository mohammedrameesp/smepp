/**
 * @file status-config.ts
 * @description Centralized status configurations for badges and indicators
 * @module lib/ui
 */

import type { ComponentType } from 'react';
import {
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Ban,
  Pause,
  Play,
  Archive,
  Loader2,
} from 'lucide-react';

/**
 * Badge variant types that map to the Badge component variants
 */
export type StatusVariant =
  | 'default'
  | 'secondary'
  | 'destructive'
  | 'outline'
  | 'success'
  | 'warning'
  | 'info'
  | 'muted';

/**
 * Configuration for a single status value
 */
export interface StatusConfig {
  /** Display label for the status */
  label: string;
  /** Badge variant to use */
  variant: StatusVariant;
  /** Optional icon component */
  icon?: ComponentType<{ className?: string }>;
  /** Optional description */
  description?: string;
}

// ============================================================================
// Common Status Configurations
// ============================================================================

/**
 * Generic approval status configuration
 * Use for leave requests, asset requests, purchase requests, etc.
 */
export const APPROVAL_STATUS: Record<string, StatusConfig> = {
  PENDING: {
    label: 'Pending',
    variant: 'warning',
    icon: Clock,
    description: 'Awaiting review',
  },
  APPROVED: {
    label: 'Approved',
    variant: 'success',
    icon: CheckCircle,
    description: 'Request approved',
  },
  REJECTED: {
    label: 'Rejected',
    variant: 'destructive',
    icon: XCircle,
    description: 'Request rejected',
  },
  CANCELLED: {
    label: 'Cancelled',
    variant: 'muted',
    icon: Ban,
    description: 'Request cancelled',
  },
  UNDER_REVIEW: {
    label: 'Under Review',
    variant: 'info',
    icon: Loader2,
    description: 'Currently being reviewed',
  },
};

/**
 * Priority configuration
 */
export const PRIORITY_STATUS: Record<string, StatusConfig> = {
  LOW: {
    label: 'Low',
    variant: 'muted',
    description: 'Low priority',
  },
  MEDIUM: {
    label: 'Medium',
    variant: 'info',
    description: 'Medium priority',
  },
  HIGH: {
    label: 'High',
    variant: 'warning',
    description: 'High priority',
  },
  URGENT: {
    label: 'Urgent',
    variant: 'destructive',
    icon: AlertCircle,
    description: 'Urgent priority',
  },
};

/**
 * Active/Inactive status configuration
 */
export const ACTIVE_STATUS: Record<string, StatusConfig> = {
  ACTIVE: {
    label: 'Active',
    variant: 'success',
    icon: Play,
    description: 'Currently active',
  },
  INACTIVE: {
    label: 'Inactive',
    variant: 'muted',
    icon: Pause,
    description: 'Currently inactive',
  },
  SUSPENDED: {
    label: 'Suspended',
    variant: 'warning',
    icon: Pause,
    description: 'Temporarily suspended',
  },
  ARCHIVED: {
    label: 'Archived',
    variant: 'secondary',
    icon: Archive,
    description: 'Archived',
  },
};

/**
 * Asset status configuration
 */
export const ASSET_STATUS: Record<string, StatusConfig> = {
  IN_USE: {
    label: 'In Use',
    variant: 'success',
    description: 'Asset is currently assigned and in use',
  },
  SPARE: {
    label: 'Spare',
    variant: 'info',
    description: 'Asset is available for assignment',
  },
  REPAIR: {
    label: 'In Repair',
    variant: 'warning',
    description: 'Asset is under maintenance or repair',
  },
  DISPOSED: {
    label: 'Disposed',
    variant: 'muted',
    description: 'Asset has been disposed',
  },
};

/**
 * Subscription status configuration
 */
export const SUBSCRIPTION_STATUS: Record<string, StatusConfig> = {
  ACTIVE: {
    label: 'Active',
    variant: 'success',
    description: 'Subscription is active',
  },
  TRIAL: {
    label: 'Trial',
    variant: 'info',
    description: 'In trial period',
  },
  PENDING: {
    label: 'Pending',
    variant: 'warning',
    description: 'Awaiting activation',
  },
  CANCELLED: {
    label: 'Cancelled',
    variant: 'muted',
    description: 'Subscription cancelled',
  },
  EXPIRED: {
    label: 'Expired',
    variant: 'destructive',
    description: 'Subscription has expired',
  },
};

/**
 * Supplier status configuration
 */
export const SUPPLIER_STATUS: Record<string, StatusConfig> = {
  PENDING: {
    label: 'Pending',
    variant: 'warning',
    description: 'Awaiting approval',
  },
  APPROVED: {
    label: 'Approved',
    variant: 'success',
    description: 'Supplier approved',
  },
  REJECTED: {
    label: 'Rejected',
    variant: 'destructive',
    description: 'Supplier rejected',
  },
  BLACKLISTED: {
    label: 'Blacklisted',
    variant: 'destructive',
    description: 'Supplier blacklisted',
  },
};

/**
 * Leave request status configuration
 */
export const LEAVE_STATUS: Record<string, StatusConfig> = {
  PENDING: {
    label: 'Pending',
    variant: 'warning',
    icon: Clock,
  },
  APPROVED: {
    label: 'Approved',
    variant: 'success',
    icon: CheckCircle,
  },
  REJECTED: {
    label: 'Rejected',
    variant: 'destructive',
    icon: XCircle,
  },
  CANCELLED: {
    label: 'Cancelled',
    variant: 'muted',
    icon: Ban,
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get status configuration from a config record
 * Returns a default config if status not found
 */
export function getStatusConfig(
  status: string,
  config: Record<string, StatusConfig>
): StatusConfig {
  return (
    config[status] ?? {
      label: status,
      variant: 'secondary',
    }
  );
}

/**
 * Get badge props from status configuration
 * Useful for spreading onto Badge component
 */
export function getStatusBadgeProps(
  status: string,
  config: Record<string, StatusConfig>
): { variant: StatusVariant; children: string } {
  const statusConfig = getStatusConfig(status, config);
  return {
    variant: statusConfig.variant,
    children: statusConfig.label,
  };
}

/**
 * Create a status config record from an enum-like object
 */
export function createStatusConfig<T extends string>(
  statuses: readonly T[],
  getConfig: (status: T) => Omit<StatusConfig, 'label'> & { label?: string }
): Record<T, StatusConfig> {
  return statuses.reduce(
    (acc, status) => {
      const config = getConfig(status);
      acc[status] = {
        label: config.label ?? formatStatusLabel(status),
        ...config,
      };
      return acc;
    },
    {} as Record<T, StatusConfig>
  );
}

/**
 * Format a status string as a readable label
 * SCREAMING_SNAKE_CASE -> Title Case
 */
export function formatStatusLabel(status: string): string {
  return status
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Check if a status is considered "pending" or "in progress"
 */
export function isPendingStatus(status: string): boolean {
  const pendingStatuses = ['PENDING', 'UNDER_REVIEW', 'IN_PROGRESS', 'PROCESSING'];
  return pendingStatuses.includes(status.toUpperCase());
}

/**
 * Check if a status is considered "completed" or "final"
 */
export function isFinalStatus(status: string): boolean {
  const finalStatuses = ['APPROVED', 'REJECTED', 'CANCELLED', 'COMPLETED', 'CLOSED'];
  return finalStatuses.includes(status.toUpperCase());
}
