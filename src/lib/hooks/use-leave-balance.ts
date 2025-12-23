'use client';

import { useMemo } from 'react';
import type { LeaveBalance } from '@/lib/types/leave';

interface UseLeaveBalanceOptions {
  balance: LeaveBalance | null;
  accrued?: number | null;
}

interface UseLeaveBalanceResult {
  /** Total entitlement (base + carried forward + adjustment) */
  totalEntitlement: number;
  /** Effective entitlement (accrued for accrual-based, total for others) */
  effectiveEntitlement: number;
  /** Days already used */
  used: number;
  /** Days pending approval */
  pending: number;
  /** Days carried forward from previous year */
  carriedForward: number;
  /** Manual adjustment (positive or negative) */
  adjustment: number;
  /** Available balance (effective entitlement - used - pending) */
  available: number;
  /** Remaining balance (same as available) */
  remaining: number;
  /** Whether this is an accrual-based leave type */
  isAccrualBased: boolean;
  /** Percentage of entitlement used */
  usedPercentage: number;
  /** Whether balance is sufficient for a given number of days */
  hasSufficientBalance: (days: number) => boolean;
  /** Whether the balance has any data */
  hasData: boolean;
}

/**
 * Hook to compute and work with leave balance values
 * Handles both accrual-based (Annual Leave) and fixed entitlement leave types
 */
export function useLeaveBalance({ balance, accrued }: UseLeaveBalanceOptions): UseLeaveBalanceResult {
  return useMemo(() => {
    if (!balance) {
      return {
        totalEntitlement: 0,
        effectiveEntitlement: 0,
        used: 0,
        pending: 0,
        carriedForward: 0,
        adjustment: 0,
        available: 0,
        remaining: 0,
        isAccrualBased: false,
        usedPercentage: 0,
        hasSufficientBalance: () => false,
        hasData: false,
      };
    }

    const entitlement = Number(balance.entitlement) || 0;
    const used = Number(balance.used) || 0;
    const pending = Number(balance.pending) || 0;
    const carriedForward = Number(balance.carriedForward) || 0;
    const adjustment = Number(balance.adjustment) || 0;

    const isAccrualBased = balance.leaveType?.accrualBased === true;
    const totalEntitlement = entitlement + carriedForward + adjustment;

    // For accrual-based leave, use accrued amount if available
    const effectiveEntitlement = isAccrualBased && accrued !== null && accrued !== undefined
      ? Number(accrued) + carriedForward + adjustment
      : totalEntitlement;

    const available = effectiveEntitlement - used - pending;
    const remaining = available;

    // Calculate usage percentage based on effective entitlement
    const usedPercentage = effectiveEntitlement > 0
      ? Math.min(100, ((used + pending) / effectiveEntitlement) * 100)
      : 0;

    return {
      totalEntitlement,
      effectiveEntitlement,
      used,
      pending,
      carriedForward,
      adjustment,
      available,
      remaining,
      isAccrualBased,
      usedPercentage,
      hasSufficientBalance: (days: number) => days <= available,
      hasData: true,
    };
  }, [balance, accrued]);
}

/**
 * Calculate available balance without hooks (for non-component use)
 */
export function calculateLeaveBalance(
  entitlement: number | string,
  used: number | string,
  pending: number | string,
  carriedForward: number | string = 0,
  adjustment: number | string = 0,
  accrued?: number | null
): number {
  const ent = Number(entitlement) || 0;
  const u = Number(used) || 0;
  const p = Number(pending) || 0;
  const cf = Number(carriedForward) || 0;
  const adj = Number(adjustment) || 0;

  // Use accrued if provided, otherwise use full entitlement
  const effectiveEntitlement = accrued !== null && accrued !== undefined
    ? Number(accrued) + cf + adj
    : ent + cf + adj;

  return effectiveEntitlement - u - p;
}
