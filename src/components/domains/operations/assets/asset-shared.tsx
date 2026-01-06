/**
 * @file asset-shared.tsx
 * @description Shared types, utilities, and components for asset tables
 * @module components/domains/operations/assets
 *
 * Features:
 * - Common Asset interface for list tables
 * - AssetStatusBadge component with consistent styling
 * - Status configuration with labels and colors
 *
 * Usage:
 * - Import types and components in asset list tables
 * - Ensures consistent styling across admin and employee views
 */

import { Badge } from '@/components/ui/badge';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Team member reference (assignee)
 */
export interface AssetMember {
  id: string;
  name: string | null;
  email: string;
}

/**
 * Location reference
 */
export interface AssetLocation {
  id: string;
  name: string;
}

/**
 * Pending asset request reference
 */
export interface AssetPendingRequest {
  id: string;
  requestNumber: string;
  member: AssetMember | null;
}

/**
 * Base asset interface for list tables
 * Extended by specific table components as needed
 */
export interface BaseAsset {
  id: string;
  assetTag: string | null;
  model: string;
  brand: string | null;
  category: string | null;
  type: string;
  status: string;
  assignedMember: AssetMember | null;
}

/**
 * Asset interface for admin list table (server-side search)
 */
export interface AdminAsset extends BaseAsset {
  price: number | string | null;
  priceCurrency: string | null;
  priceQAR: number | string | null;
  warrantyExpiry: Date | null;
  serial: string | null;
  supplier: string | null;
  configuration: string | null;
  isShared: boolean;
  location: AssetLocation | null;
  assetRequests?: AssetPendingRequest[];
}

/**
 * Asset interface for employee list table
 */
export interface EmployeeAsset extends BaseAsset {
  price: number | null;
  priceQAR: number | null;
  warrantyExpiry: Date | null;
  purchaseDate: Date | null;
  assignedMemberId: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STATUS CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Asset status values
 */
export type AssetStatus = 'IN_USE' | 'SPARE' | 'REPAIR' | 'DISPOSED';

/**
 * Status display configuration
 */
export interface StatusConfig {
  label: string;
  className: string;
}

/**
 * Status configuration map with colors and labels
 */
export const ASSET_STATUS_CONFIG: Record<AssetStatus, StatusConfig> = {
  IN_USE: {
    label: 'In Use',
    className: 'bg-green-100 text-green-800 border-green-300',
  },
  SPARE: {
    label: 'Spare',
    className: 'bg-blue-100 text-blue-800 border-blue-300',
  },
  REPAIR: {
    label: 'Repair',
    className: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  },
  DISPOSED: {
    label: 'Disposed',
    className: 'bg-gray-100 text-gray-800 border-gray-300',
  },
};

/**
 * Default status config for unknown statuses
 */
const DEFAULT_STATUS_CONFIG: StatusConfig = {
  label: 'Unknown',
  className: 'bg-gray-100 text-gray-800 border-gray-300',
};

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

interface AssetStatusBadgeProps {
  status: string;
}

/**
 * Consistent status badge component for asset tables
 *
 * @example
 * <AssetStatusBadge status="IN_USE" />
 * <AssetStatusBadge status={asset.status} />
 */
export function AssetStatusBadge({ status }: AssetStatusBadgeProps) {
  const config = ASSET_STATUS_CONFIG[status as AssetStatus] || {
    ...DEFAULT_STATUS_CONFIG,
    label: status.replace(/_/g, ' '),
  };

  return (
    <Badge className={config.className} variant="outline">
      {config.label}
    </Badge>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get status label from status value
 */
export function getStatusLabel(status: string): string {
  const config = ASSET_STATUS_CONFIG[status as AssetStatus];
  return config?.label || status.replace(/_/g, ' ');
}

/**
 * Format member display name (name or email fallback)
 */
export function formatMemberName(member: AssetMember | null | undefined): string {
  if (!member) return '';
  return member.name || member.email;
}
