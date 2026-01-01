/**
 * @file leave-deduction.ts
 * @description Unpaid leave deduction calculations for payroll processing
 * @module domains/hr/payroll
 *
 * PURPOSE:
 * Calculates salary deductions for unpaid leave taken during a payroll period.
 * Unpaid leave types (e.g., leave without pay) result in proportional salary reduction.
 *
 * BUSINESS RULES:
 * - Only APPROVED leave requests are considered
 * - Only leave types with isPaid=false trigger deductions
 * - Deduction = days × (gross salary / 30)
 * - Half-days (0.5) are supported via totalDays field
 * - Leaves spanning multiple months are pro-rated to each period
 *
 * COMPLIANCE:
 * - FIN-001: Half-day leave support using stored totalDays
 * - Qatar Labor Law: Uses 30-day month for daily rate calculation
 *
 * EDGE CASES:
 * - Leave starts before period: Only days within period counted
 * - Leave ends after period: Only days within period counted
 * - Leave spans entire period: Full period days counted
 */

import { prisma } from '@/lib/core/prisma';
import { LeaveStatus } from '@prisma/client';
import { parseDecimal } from './utils';

export interface UnpaidLeaveDeduction {
  leaveRequestId: string;
  requestNumber: string;
  leaveTypeName: string;
  startDate: Date;
  endDate: Date;
  totalDays: number;
  dailyRate: number;
  deductionAmount: number;
}

/**
 * Calculate unpaid leave deductions for a given month
 *
 * @param memberId Team member ID
 * @param year Payroll year
 * @param month Payroll month (1-12)
 * @param dailySalary Daily salary rate (gross / 30)
 * @param tenantId Organization ID for tenant isolation
 */
export async function calculateUnpaidLeaveDeductions(
  memberId: string,
  year: number,
  month: number,
  dailySalary: number,
  tenantId: string
): Promise<UnpaidLeaveDeduction[]> {
  // Get the first and last day of the payroll month
  const periodStart = new Date(year, month - 1, 1);
  const periodEnd = new Date(year, month, 0); // Last day of month

  // Find approved unpaid leave requests that overlap with this period
  const unpaidLeaves = await prisma.leaveRequest.findMany({
    where: {
      memberId,
      tenantId,
      status: LeaveStatus.APPROVED,
      leaveType: {
        isPaid: false,
      },
      OR: [
        // Leave starts in this period
        {
          startDate: {
            gte: periodStart,
            lte: periodEnd,
          },
        },
        // Leave ends in this period
        {
          endDate: {
            gte: periodStart,
            lte: periodEnd,
          },
        },
        // Leave spans entire period
        {
          AND: [
            { startDate: { lte: periodStart } },
            { endDate: { gte: periodEnd } },
          ],
        },
      ],
    },
    include: {
      leaveType: {
        select: { name: true, isPaid: true },
      },
    },
  });

  const deductions: UnpaidLeaveDeduction[] = [];

  for (const leave of unpaidLeaves) {
    // Calculate days within this payroll period
    const effectiveStart = leave.startDate > periodStart ? leave.startDate : periodStart;
    const effectiveEnd = leave.endDate < periodEnd ? leave.endDate : periodEnd;

    // FIN-001: Use stored totalDays for leaves fully within period (handles half-days correctly)
    // Half-day leaves are always single-day, so they'll always be fully within a period
    const leaveFullyInPeriod = leave.startDate >= periodStart && leave.endDate <= periodEnd;

    let daysToDeduct: number;
    if (leaveFullyInPeriod) {
      // Use the stored totalDays which correctly handles 0.5 for half-days
      daysToDeduct = parseDecimal(leave.totalDays);
    } else {
      // Leave spans multiple months - calculate calendar days in this period
      // Note: Half-day leaves can't span months (validation enforces single day)
      const calendarDays = Math.floor(
        (effectiveEnd.getTime() - effectiveStart.getTime()) / (1000 * 60 * 60 * 24)
      ) + 1;
      daysToDeduct = calendarDays;
    }

    const deductionAmount = daysToDeduct * dailySalary;

    deductions.push({
      leaveRequestId: leave.id,
      requestNumber: leave.requestNumber,
      leaveTypeName: leave.leaveType.name,
      startDate: effectiveStart,
      endDate: effectiveEnd,
      totalDays: daysToDeduct,
      dailyRate: dailySalary,
      deductionAmount: Math.round(deductionAmount * 100) / 100,
    });
  }

  return deductions;
}

/**
 * Get total unpaid leave days for a member in a given period
 */
export async function getUnpaidLeaveDaysInPeriod(
  memberId: string,
  year: number,
  month: number,
  tenantId: string
): Promise<number> {
  const periodStart = new Date(year, month - 1, 1);
  const periodEnd = new Date(year, month, 0);

  const unpaidLeaves = await prisma.leaveRequest.findMany({
    where: {
      memberId,
      tenantId,
      status: LeaveStatus.APPROVED,
      leaveType: {
        isPaid: false,
      },
      OR: [
        {
          startDate: {
            gte: periodStart,
            lte: periodEnd,
          },
        },
        {
          endDate: {
            gte: periodStart,
            lte: periodEnd,
          },
        },
        {
          AND: [
            { startDate: { lte: periodStart } },
            { endDate: { gte: periodEnd } },
          ],
        },
      ],
    },
    select: {
      startDate: true,
      endDate: true,
      totalDays: true,
    },
  });

  let totalDays = 0;

  for (const leave of unpaidLeaves) {
    const effectiveStart = leave.startDate > periodStart ? leave.startDate : periodStart;
    const effectiveEnd = leave.endDate < periodEnd ? leave.endDate : periodEnd;

    // FIN-001: Use stored totalDays for leaves fully within period (handles half-days correctly)
    const leaveFullyInPeriod = leave.startDate >= periodStart && leave.endDate <= periodEnd;

    if (leaveFullyInPeriod) {
      // Use the stored totalDays which correctly handles 0.5 for half-days
      totalDays += parseDecimal(leave.totalDays);
    } else {
      // Leave spans multiple months - calculate calendar days in this period
      const calendarDays = Math.floor(
        (effectiveEnd.getTime() - effectiveStart.getTime()) / (1000 * 60 * 60 * 24)
      ) + 1;
      totalDays += calendarDays;
    }
  }

  return totalDays;
}

/**
 * Check if there are any unpaid leaves for a member in a period
 */
export async function hasUnpaidLeaveInPeriod(
  memberId: string,
  year: number,
  month: number,
  tenantId: string
): Promise<boolean> {
  const days = await getUnpaidLeaveDaysInPeriod(memberId, year, month, tenantId);
  return days > 0;
}
