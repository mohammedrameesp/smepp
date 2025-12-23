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
 * @param userId Employee ID
 * @param year Payroll year
 * @param month Payroll month (1-12)
 * @param dailySalary Daily salary rate (gross / 30)
 */
export async function calculateUnpaidLeaveDeductions(
  userId: string,
  year: number,
  month: number,
  dailySalary: number
): Promise<UnpaidLeaveDeduction[]> {
  // Get the first and last day of the payroll month
  const periodStart = new Date(year, month - 1, 1);
  const periodEnd = new Date(year, month, 0); // Last day of month

  // Find approved unpaid leave requests that overlap with this period
  const unpaidLeaves = await prisma.leaveRequest.findMany({
    where: {
      userId,
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

    // Calculate calendar days in range
    const daysDiff = Math.ceil(
      (effectiveEnd.getTime() - effectiveStart.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1;

    const deductionAmount = daysDiff * dailySalary;

    deductions.push({
      leaveRequestId: leave.id,
      requestNumber: leave.requestNumber,
      leaveTypeName: leave.leaveType.name,
      startDate: effectiveStart,
      endDate: effectiveEnd,
      totalDays: daysDiff,
      dailyRate: dailySalary,
      deductionAmount: Math.round(deductionAmount * 100) / 100,
    });
  }

  return deductions;
}

/**
 * Get total unpaid leave days for a user in a given period
 */
export async function getUnpaidLeaveDaysInPeriod(
  userId: string,
  year: number,
  month: number
): Promise<number> {
  const periodStart = new Date(year, month - 1, 1);
  const periodEnd = new Date(year, month, 0);

  const unpaidLeaves = await prisma.leaveRequest.findMany({
    where: {
      userId,
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

    const daysDiff = Math.ceil(
      (effectiveEnd.getTime() - effectiveStart.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1;

    totalDays += daysDiff;
  }

  return totalDays;
}

/**
 * Check if there are any unpaid leaves for a user in a period
 */
export async function hasUnpaidLeaveInPeriod(
  userId: string,
  year: number,
  month: number
): Promise<boolean> {
  const days = await getUnpaidLeaveDaysInPeriod(userId, year, month);
  return days > 0;
}
