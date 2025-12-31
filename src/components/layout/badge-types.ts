/**
 * @file badge-types.ts
 * @description Badge count types and utilities for navigation components
 * @module components/layout
 */

// Badge keys for pending counts
export const badgeKeys = [
  'pendingChangeRequests',
  'pendingLeaveRequests',
  'pendingSuppliers',
  'pendingPurchaseRequests',
  'pendingAssetRequests',
  'myPendingAssignments',
  'pendingApprovals',
] as const;

export type BadgeKey = typeof badgeKeys[number];

export type BadgeCounts = Partial<Record<BadgeKey, number>>;

// Helper to safely get badge count
export function getBadgeCount(badgeCounts: BadgeCounts, key?: string): number | undefined {
  if (!key) return undefined;
  if (badgeKeys.includes(key as BadgeKey)) {
    return badgeCounts[key as BadgeKey];
  }
  return undefined;
}
