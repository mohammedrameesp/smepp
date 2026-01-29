/**
 * @file leave-utils.ts
 * @description Leave management utility functions for Qatar Labor Law compliance,
 *              balance calculations, and leave request handling
 * @module domains/hr/leave
 */

import { LeaveStatus, LeaveRequestType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { formatDate, formatDayMonth } from '@/lib/core/datetime';
import { getStatusColor } from '@/lib/constants';
import {
  DEFAULT_WEEKEND_DAYS,
  isWeekend,
  isHoliday,
  countCalendarDays,
  countWorkingDays as countWorkingDaysBase,
  countHolidayDays as countHolidayDaysBase,
  getHolidayNamesInRange,
  datesOverlap,
  type HolidayLike,
} from '@/lib/utils/calendar-utils';

// Type definitions for Qatar labor law fields
export interface PayTier {
  days: number;
  payPercent: number;
  label: string;
}

export interface ServiceBasedEntitlement {
  [months: string]: number; // e.g., { "12": 21, "60": 28 }
}

export interface SickLeavePayBreakdown {
  fullPayDays: number;
  halfPayDays: number;
  unpaidDays: number;
  totalDays: number;
}

/**
 * Calculate months of service from join date to a reference date
 * @param joinDate Employee's date of joining
 * @param referenceDate Date to calculate service up to (defaults to today)
 * @returns Number of complete months of service
 */
export function calculateServiceMonths(joinDate: Date, referenceDate: Date = new Date()): number {
  const join = new Date(joinDate);
  const ref = new Date(referenceDate);

  // Reset time components for accurate date comparison
  join.setHours(0, 0, 0, 0);
  ref.setHours(0, 0, 0, 0);

  if (ref < join) return 0;

  const years = ref.getFullYear() - join.getFullYear();
  const months = ref.getMonth() - join.getMonth();
  const days = ref.getDate() - join.getDate();

  let totalMonths = years * 12 + months;

  // If the day of month hasn't been reached yet, subtract one month
  if (days < 0) {
    totalMonths--;
  }

  return Math.max(0, totalMonths);
}

/**
 * Calculate years of service from join date
 * @param joinDate Employee's date of joining
 * @param referenceDate Date to calculate service up to (defaults to today)
 * @returns Number of complete years of service
 */
export function calculateServiceYears(joinDate: Date, referenceDate: Date = new Date()): number {
  return Math.floor(calculateServiceMonths(joinDate, referenceDate) / 12);
}

/**
 * Check if employee meets minimum service requirement for a leave type
 * @param joinDate Employee's date of joining
 * @param minimumServiceMonths Minimum months required
 * @param referenceDate Date to check against (defaults to today)
 * @returns Whether the employee meets the requirement
 */
export function meetsServiceRequirement(
  joinDate: Date | null | undefined,
  minimumServiceMonths: number,
  referenceDate: Date = new Date()
): boolean {
  if (minimumServiceMonths === 0) return true;
  if (!joinDate) return false;

  const serviceMonths = calculateServiceMonths(joinDate, referenceDate);
  return serviceMonths >= minimumServiceMonths;
}

/**
 * Get annual leave entitlement based on years of service (Qatar Labor Law)
 * - Less than 1 year: 0 days (not eligible)
 * - 1-5 years: 21 days
 * - 5+ years: 28 days
 * @param joinDate Employee's date of joining
 * @param serviceBasedEntitlement Service-based entitlement configuration
 * @param referenceDate Date to calculate against (defaults to today)
 * @returns Number of days entitled
 */
export function getServiceBasedEntitlement(
  joinDate: Date | null | undefined,
  serviceBasedEntitlement: ServiceBasedEntitlement | null | undefined,
  referenceDate: Date = new Date()
): number {
  if (!joinDate || !serviceBasedEntitlement) return 0;

  const serviceMonths = calculateServiceMonths(joinDate, referenceDate);

  // Sort the thresholds in descending order to find the highest applicable tier
  const thresholds = Object.keys(serviceBasedEntitlement)
    .map(Number)
    .sort((a, b) => b - a);

  for (const threshold of thresholds) {
    if (serviceMonths >= threshold) {
      return serviceBasedEntitlement[threshold.toString()];
    }
  }

  return 0; // Not eligible if no threshold met
}

/**
 * Calculate sick leave pay breakdown based on days used (Qatar Labor Law)
 * - First 2 weeks (14 days): Full pay (100%)
 * - Next 4 weeks (28 days): Half pay (50%)
 * - Last 6 weeks (42 days): Unpaid (0%)
 * @param daysUsed Total sick days used this year
 * @param payTiers Pay tier configuration
 * @returns Breakdown of days at each pay level
 */
export function calculateSickLeavePayBreakdown(
  daysUsed: number,
  payTiers: PayTier[] | null | undefined
): SickLeavePayBreakdown {
  // Default Qatar sick leave tiers
  const defaultTiers: PayTier[] = [
    { days: 14, payPercent: 100, label: 'Full Pay' },
    { days: 28, payPercent: 50, label: 'Half Pay' },
    { days: 42, payPercent: 0, label: 'Unpaid' },
  ];

  const tiers = payTiers || defaultTiers;
  let remainingDays = daysUsed;
  let fullPayDays = 0;
  let halfPayDays = 0;
  let unpaidDays = 0;

  for (const tier of tiers) {
    if (remainingDays <= 0) break;

    const daysInTier = Math.min(remainingDays, tier.days);
    remainingDays -= daysInTier;

    if (tier.payPercent === 100) {
      fullPayDays += daysInTier;
    } else if (tier.payPercent === 50) {
      halfPayDays += daysInTier;
    } else {
      unpaidDays += daysInTier;
    }
  }

  return {
    fullPayDays,
    halfPayDays,
    unpaidDays,
    totalDays: daysUsed,
  };
}

/**
 * Get remaining sick leave days at each pay tier
 * @param daysUsed Total sick days used this year
 * @param payTiers Pay tier configuration
 * @returns Object with remaining days at each pay level
 */
export function getRemainingSickLeaveTiers(
  daysUsed: number,
  payTiers: PayTier[] | null | undefined
): { fullPayRemaining: number; halfPayRemaining: number; unpaidRemaining: number } {
  const defaultTiers: PayTier[] = [
    { days: 14, payPercent: 100, label: 'Full Pay' },
    { days: 28, payPercent: 50, label: 'Half Pay' },
    { days: 42, payPercent: 0, label: 'Unpaid' },
  ];

  const tiers = payTiers || defaultTiers;
  let remainingDays = daysUsed;

  const fullPayTier = tiers.find(t => t.payPercent === 100);
  const halfPayTier = tiers.find(t => t.payPercent === 50);
  const unpaidTier = tiers.find(t => t.payPercent === 0);

  const fullPayMax = fullPayTier?.days || 14;
  const halfPayMax = halfPayTier?.days || 28;
  const unpaidMax = unpaidTier?.days || 42;

  // Calculate remaining at each tier
  const usedFullPay = Math.min(remainingDays, fullPayMax);
  remainingDays = Math.max(0, remainingDays - fullPayMax);

  const usedHalfPay = Math.min(remainingDays, halfPayMax);
  remainingDays = Math.max(0, remainingDays - halfPayMax);

  const usedUnpaid = Math.min(remainingDays, unpaidMax);

  return {
    fullPayRemaining: Math.max(0, fullPayMax - usedFullPay),
    halfPayRemaining: Math.max(0, halfPayMax - usedHalfPay),
    unpaidRemaining: Math.max(0, unpaidMax - usedUnpaid),
  };
}

/**
 * Format service duration for display
 * @param joinDate Employee's date of joining
 * @returns Human-readable service duration
 */
export function formatServiceDuration(joinDate: Date | null | undefined): string {
  if (!joinDate) return 'Not available';

  const months = calculateServiceMonths(joinDate);
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;

  if (years === 0) {
    return remainingMonths === 1 ? '1 month' : `${remainingMonths} months`;
  }

  if (remainingMonths === 0) {
    return years === 1 ? '1 year' : `${years} years`;
  }

  const yearText = years === 1 ? '1 year' : `${years} years`;
  const monthText = remainingMonths === 1 ? '1 month' : `${remainingMonths} months`;

  return `${yearText}, ${monthText}`;
}

/**
 * Check if employee is eligible for paid maternity leave (Qatar Law)
 * Maternity leave is fully paid only if employee has completed 1 year of service
 * @param joinDate Employee's date of joining
 * @returns Whether maternity leave would be paid
 */
export function isMaternityLeavePaid(joinDate: Date | null | undefined): boolean {
  if (!joinDate) return false;
  return calculateServiceMonths(joinDate) >= 12;
}

/**
 * Get months worked in current calendar year
 * @param dateOfJoining Employee's date of joining
 * @param year The year to calculate for
 * @param referenceDate Reference date (defaults to today)
 * @returns Number of months worked in the specified year (0-12)
 */
export function getMonthsWorkedInYear(
  dateOfJoining: Date | null | undefined,
  year: number,
  referenceDate: Date = new Date()
): number {
  if (!dateOfJoining) return 0;

  const joinDate = new Date(dateOfJoining);
  joinDate.setHours(0, 0, 0, 0);

  const refDate = new Date(referenceDate);
  refDate.setHours(0, 0, 0, 0);

  // If join date is in the future, no months worked
  if (joinDate > refDate) return 0;

  // If join year is after the specified year, no months worked in that year
  if (joinDate.getFullYear() > year) return 0;

  // If reference date year is before the specified year, no months worked yet
  if (refDate.getFullYear() < year) return 0;

  // Calculate start month (either Jan 1 of year or join date, whichever is later)
  const yearStart = new Date(year, 0, 1);
  const effectiveStart = joinDate > yearStart ? joinDate : yearStart;

  // Calculate end month (either Dec 31 of year or reference date, whichever is earlier)
  const yearEnd = new Date(year, 11, 31);
  const effectiveEnd = refDate < yearEnd ? refDate : yearEnd;

  // If effective start is after effective end, no months
  if (effectiveStart > effectiveEnd) return 0;

  // Calculate months between effective start and effective end
  const startMonth = effectiveStart.getMonth();
  const endMonth = effectiveEnd.getMonth();

  // Add 1 because we count the current month if we've started working
  const months = endMonth - startMonth + 1;

  return Math.min(12, Math.max(0, months));
}

/**
 * Calculate accrued annual leave based on months worked in current year
 * Formula: (annualEntitlement / 12) * monthsWorkedThisYear
 * @param dateOfJoining Employee's date of joining
 * @param annualEntitlement Annual leave entitlement (21 or 28 days based on service)
 * @param year The year to calculate for (defaults to current year)
 * @param referenceDate Reference date (defaults to today)
 * @returns Number of accrued leave days (rounded to 2 decimal places)
 */
export function calculateAccruedAnnualLeave(
  dateOfJoining: Date | null | undefined,
  annualEntitlement: number,
  year: number = new Date().getFullYear(),
  referenceDate: Date = new Date()
): number {
  if (!dateOfJoining) return 0;
  if (annualEntitlement <= 0) return 0;

  // Pro-rata accrual from day one
  const monthsWorked = getMonthsWorkedInYear(dateOfJoining, year, referenceDate);
  const accrued = (annualEntitlement / 12) * monthsWorked;

  // Round to 2 decimal places
  return Math.round(accrued * 100) / 100;
}

/**
 * Get annual leave entitlement and accrued amount for an employee
 * @param dateOfJoining Employee's date of joining
 * @param year The year to calculate for
 * @param referenceDate Reference date (defaults to today)
 * @returns Object with annual entitlement, accrued amount, and months worked
 */
export function getAnnualLeaveDetails(
  dateOfJoining: Date | null | undefined,
  year: number = new Date().getFullYear(),
  referenceDate: Date = new Date()
): {
  annualEntitlement: number;
  accrued: number;
  monthsWorked: number;
  isEligible: boolean;
  yearsOfService: number;
} {
  if (!dateOfJoining) {
    return {
      annualEntitlement: 0,
      accrued: 0,
      monthsWorked: 0,
      isEligible: false,
      yearsOfService: 0,
    };
  }

  const serviceMonths = calculateServiceMonths(dateOfJoining, referenceDate);
  const yearsOfService = Math.floor(serviceMonths / 12);
  const isEligible = true; // Pro-rata accrual from day one

  // Determine entitlement based on years of service
  // Pro-rata accrual: 21 days/year for <5 years, 28 days/year for 5+ years
  let annualEntitlement = 21; // Default 21 days
  if (serviceMonths >= 60) {
    annualEntitlement = 28; // 5+ years
  }

  const monthsWorked = getMonthsWorkedInYear(dateOfJoining, year, referenceDate);
  const accrued = calculateAccruedAnnualLeave(dateOfJoining, annualEntitlement, year, referenceDate);

  return {
    annualEntitlement,
    accrued,
    monthsWorked,
    isEligible,
    yearsOfService,
  };
}

/**
 * Check if a leave type should be auto-initialized for an employee
 * @param category Leave category
 * @param minimumServiceMonths Minimum service required
 * @param dateOfJoining Employee's date of joining
 * @returns Whether to auto-initialize balance
 */
export function shouldAutoInitializeBalance(
  category: string,
  minimumServiceMonths: number,
  dateOfJoining: Date | null | undefined
): boolean {
  // Only auto-initialize STANDARD and MEDICAL categories
  if (category !== 'STANDARD' && category !== 'MEDICAL') {
    return false;
  }

  // Check service requirement
  if (minimumServiceMonths > 0) {
    if (!dateOfJoining) return false;
    if (!meetsServiceRequirement(dateOfJoining, minimumServiceMonths)) {
      return false;
    }
  }

  return true;
}

// Re-export commonly used calendar utilities for backward compatibility
export { DEFAULT_WEEKEND_DAYS, isWeekend, datesOverlap } from '@/lib/utils/calendar-utils';

/**
 * Calculate calendar days between two dates (includes weekends)
 * @param startDate Start date
 * @param endDate End date
 * @returns Number of calendar days (inclusive)
 */
export function calculateCalendarDays(startDate: Date, endDate: Date): number {
  return countCalendarDays(startDate, endDate);
}

/**
 * Calculate working days between two dates, excluding configured weekend days
 * @param startDate Start date
 * @param endDate End date
 * @param requestType Type of leave request
 * @param includeWeekends If true, counts all calendar days (for Annual Leave)
 * @param weekendDays Array of weekend day numbers (0=Sun, 1=Mon, ..., 5=Fri, 6=Sat)
 * @returns Number of days
 */
export function calculateWorkingDays(
  startDate: Date,
  endDate: Date,
  requestType: LeaveRequestType = 'FULL_DAY',
  includeWeekends: boolean = false,
  weekendDays: number[] = [5, 6]
): number {
  // For half-day requests, return 0.5
  if (requestType === 'HALF_DAY_AM' || requestType === 'HALF_DAY_PM') {
    // Half day should be on a working day (unless including weekends)
    if (!includeWeekends && isWeekend(startDate, weekendDays)) {
      return 0;
    }
    return 0.5;
  }

  // Use the base calendar utility for full day requests
  return countWorkingDaysBase(startDate, endDate, {
    weekendDays,
    includeWeekends,
  });
}

/**
 * Public Holiday type definition
 */
export interface PublicHolidayData {
  id: string;
  name: string;
  description?: string | null;
  startDate: Date;
  endDate: Date;
  year: number;
  isRecurring: boolean;
  color: string;
}

/**
 * Check if a date is a public holiday
 * @param date Date to check
 * @param holidays Array of public holidays
 * @returns Holiday name if date is a holiday, null otherwise
 */
export function isPublicHoliday(date: Date, holidays: PublicHolidayData[]): string | null {
  // PublicHolidayData satisfies HolidayLike, so we can use the calendar utility directly
  return isHoliday(date, holidays);
}

/**
 * Get all holidays within a date range
 * @param startDate Start date of range
 * @param endDate End date of range
 * @param holidays Array of public holidays
 * @returns Array of holiday names that fall within the range
 */
export function getHolidaysInRange(
  startDate: Date,
  endDate: Date,
  holidays: PublicHolidayData[]
): string[] {
  // Use the calendar utility - returns unique holiday names
  return getHolidayNamesInRange(startDate, endDate, holidays);
}

/**
 * Count the number of holiday days within a date range
 * @param startDate Start date of range
 * @param endDate End date of range
 * @param holidays Array of public holidays
 * @param weekendDays Array of weekend day numbers (to avoid double counting)
 * @returns Number of holiday days (excluding weekends)
 */
export function countHolidayDays(
  startDate: Date,
  endDate: Date,
  holidays: PublicHolidayData[],
  weekendDays: number[] = [5, 6]
): number {
  // Use calendar utility - excludeWeekendHolidays=true to avoid double counting
  return countHolidayDaysBase(startDate, endDate, holidays, true, weekendDays);
}

/**
 * Calculate working days between two dates, excluding weekends AND public holidays
 * @param startDate Start date
 * @param endDate End date
 * @param requestType Type of leave request
 * @param includeWeekends If true, counts weekends but still excludes holidays
 * @param weekendDays Array of weekend day numbers (0=Sun, 1=Mon, ..., 5=Fri, 6=Sat)
 * @param holidays Array of public holidays
 * @returns Number of days (excluding holidays and optionally weekends)
 */
export function calculateWorkingDaysWithHolidays(
  startDate: Date,
  endDate: Date,
  requestType: LeaveRequestType = 'FULL_DAY',
  includeWeekends: boolean = false,
  weekendDays: number[] = [5, 6],
  holidays: PublicHolidayData[] = []
): number {
  // For half-day requests, return 0.5 if not a holiday
  if (requestType === 'HALF_DAY_AM' || requestType === 'HALF_DAY_PM') {
    // Half day should be on a working day and not a holiday
    if (!includeWeekends && isWeekend(startDate, weekendDays)) {
      return 0;
    }
    if (isPublicHoliday(startDate, holidays)) {
      return 0;
    }
    return 0.5;
  }

  // Use the base calendar utility with holiday exclusion for full day requests
  return countWorkingDaysBase(startDate, endDate, {
    weekendDays,
    includeWeekends,
    holidays,
    excludeHolidays: true,
  });
}

/**
 * Generate a leave request number
 * @deprecated This function is deprecated. Leave request numbers are now generated
 * using the configurable format system in the leave request route.
 * Default format: {PREFIX}-LR-{YYMM}-{SEQ:3}
 * This function is kept for backward compatibility with tests.
 */
export function generateLeaveRequestNumber(existingCount: number): string {
  const nextNumber = existingCount + 1;
  return `LR-${String(nextNumber).padStart(5, '0')}`;
}

/**
 * Calculate remaining balance
 */
export function calculateRemainingBalance(
  entitlement: number | string | Decimal,
  used: number | string | Decimal,
  pending: number | string | Decimal,
  carriedForward: number | string | Decimal,
  adjustment: number | string | Decimal
): number {
  const ent = Number(entitlement);
  const u = Number(used);
  const p = Number(pending);
  const cf = Number(carriedForward);
  const adj = Number(adjustment);

  return ent + cf + adj - u - p;
}

/**
 * Get available balance (excluding pending)
 */
export function calculateAvailableBalance(
  entitlement: number | string | Decimal,
  used: number | string | Decimal,
  carriedForward: number | string | Decimal,
  adjustment: number | string | Decimal
): number {
  const ent = Number(entitlement);
  const u = Number(used);
  const cf = Number(carriedForward);
  const adj = Number(adjustment);

  return ent + cf + adj - u;
}

/**
 * Get current year
 */
export function getCurrentYear(): number {
  return new Date().getFullYear();
}

/**
 * Format leave days for display
 */
export function formatLeaveDays(days: number | string | Decimal): string {
  const num = Number(days);
  if (num === 0.5) {
    return 'Half day';
  }
  if (num === 1) {
    return '1 day';
  }
  return `${num} days`;
}

/**
 * Get status color (hex) for badges.
 * Uses centralized STATUS_COLORS from @/lib/constants.
 */
export function getLeaveStatusColor(status: LeaveStatus): string {
  return getStatusColor(status).hex;
}

/**
 * Get status variant for Badge component
 */
export function getLeaveStatusVariant(status: LeaveStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'PENDING':
      return 'secondary';
    case 'APPROVED':
      return 'default';
    case 'REJECTED':
      return 'destructive';
    case 'CANCELLED':
      return 'outline';
    default:
      return 'outline';
  }
}

/**
 * Get status display text with emoji
 */
export function getLeaveStatusText(status: LeaveStatus): string {
  switch (status) {
    case 'PENDING':
      return 'Pending';
    case 'APPROVED':
      return 'Approved';
    case 'REJECTED':
      return 'Rejected';
    case 'CANCELLED':
      return 'Cancelled';
    default:
      return status;
  }
}

/**
 * Check if a leave request can be cancelled
 * Can only cancel pending or approved requests with future start dates
 */
export function canCancelLeaveRequest(status: LeaveStatus, startDate: Date): boolean {
  if (status !== 'PENDING' && status !== 'APPROVED') {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);

  return start > today;
}

/**
 * Check if a leave request can be edited
 * Can only edit pending requests with future start dates
 */
export function canEditLeaveRequest(status: LeaveStatus, startDate: Date): boolean {
  if (status !== 'PENDING') {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);

  return start > today;
}

/**
 * Get date range text for display
 * Uses the datetime module for consistent Qatar timezone formatting
 */
export function getDateRangeText(startDate: Date, endDate: Date): string {
  const start = new Date(startDate);
  const end = new Date(endDate);

  // Single day: use formatDate for full date
  if (start.toDateString() === end.toDateString()) {
    return formatDate(start);
  }

  // Same month and year: "X - Y Mon YYYY" (e.g., "15 - 20 Aug 2025")
  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return `${start.getDate()} - ${formatDate(end)}`;
  }

  // Same year but different month: "X Mon - Y Mon YYYY" (e.g., "15 Aug - 20 Sep 2025")
  if (start.getFullYear() === end.getFullYear()) {
    return `${formatDayMonth(start)} - ${formatDate(end)}`;
  }

  // Different years: full format for both dates
  return `${formatDate(start)} - ${formatDate(end)}`;
}

/**
 * Get request type display text
 */
export function getRequestTypeText(requestType: LeaveRequestType): string {
  switch (requestType) {
    case 'FULL_DAY':
      return 'Full Day';
    case 'HALF_DAY_AM':
      return 'Half Day (AM)';
    case 'HALF_DAY_PM':
      return 'Half Day (PM)';
    default:
      return requestType;
  }
}

/**
 * Check if minimum notice days requirement is met
 */
export function meetsNoticeDaysRequirement(startDate: Date, minNoticeDays: number): boolean {
  if (minNoticeDays === 0) return true;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);

  const diffTime = start.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays >= minNoticeDays;
}

/**
 * Check if max consecutive days limit is exceeded
 */
export function exceedsMaxConsecutiveDays(totalDays: number, maxConsecutiveDays: number | null): boolean {
  if (maxConsecutiveDays === null) return false;
  return totalDays > maxConsecutiveDays;
}

/**
 * Leave Categories - determines how balances are initialized
 * STANDARD: Auto-initialized for all employees
 * MEDICAL: Auto-initialized after minimum service period
 * PARENTAL: Admin assigns based on gender
 * RELIGIOUS: Admin assigns when requested
 */
export const LeaveCategory = {
  STANDARD: 'STANDARD',
  MEDICAL: 'MEDICAL',
  PARENTAL: 'PARENTAL',
  RELIGIOUS: 'RELIGIOUS',
} as const;

export type LeaveCategoryType = (typeof LeaveCategory)[keyof typeof LeaveCategory];

/**
 * Default leave types for seeding - Qatar Labor Law Compliant
 * Reference: Qatar Labor Law (Law No. 14 of 2004)
 */
export const DEFAULT_LEAVE_TYPES = [
  {
    name: 'Annual Leave',
    description: 'Paid annual vacation leave (Qatar Law: 21 days for <5 years, 28 days for 5+ years of service). Accrues monthly from day one.',
    color: '#3B82F6', // Blue
    defaultDays: 21, // Base entitlement
    requiresApproval: true,
    requiresDocument: false,
    isPaid: true,
    isActive: true,
    minNoticeDays: 7,
    allowCarryForward: true,
    maxCarryForwardDays: 5,
    // Qatar Labor Law fields
    minimumServiceMonths: 0, // Pro-rata accrual from day one
    isOnceInEmployment: false,
    serviceBasedEntitlement: { '12': 21, '60': 28 }, // 21 days for <5 years, 28 days for 5+ years
    category: LeaveCategory.STANDARD,
    accrualBased: true, // Accrues monthly
  },
  {
    name: 'Sick Leave',
    description: 'Leave for medical reasons (Qatar Law: 2 weeks full pay). Requires medical certificate.',
    color: '#EF4444', // Red
    defaultDays: 14, // Only full pay portion (2 weeks) - admin can adjust for extended sick leave
    requiresApproval: true,
    requiresDocument: true, // Medical certificate required
    isPaid: true,
    isActive: true,
    minNoticeDays: 0, // Sick leave doesn't require advance notice
    allowCarryForward: false,
    // Qatar Labor Law fields
    minimumServiceMonths: 3, // Eligible after 3 months of service
    isOnceInEmployment: false,
    category: LeaveCategory.MEDICAL,
    accrualBased: false, // Fixed entitlement
  },
  {
    name: 'Maternity Leave',
    description: 'Leave for new mothers (Qatar Law: 50 days - up to 15 days before delivery, fully paid if 1+ year of service)',
    color: '#EC4899', // Pink
    defaultDays: 50,
    requiresApproval: true,
    requiresDocument: true, // Medical certificate required
    isPaid: true, // Fully paid if 1+ year of service
    isActive: true,
    minNoticeDays: 14, // Should notify in advance
    allowCarryForward: false,
    // Qatar Labor Law fields
    minimumServiceMonths: 0, // Can take leave regardless of service, but payment depends on service
    isOnceInEmployment: false,
    category: LeaveCategory.PARENTAL,
    genderRestriction: 'FEMALE', // Female employees only
    accrualBased: false,
  },
  {
    name: 'Paternity Leave',
    description: 'Leave for new fathers (3 days paid)',
    color: '#8B5CF6', // Purple
    defaultDays: 3,
    requiresApproval: true,
    requiresDocument: true,
    isPaid: true,
    isActive: true,
    minNoticeDays: 0,
    allowCarryForward: false,
    // Qatar Labor Law fields
    minimumServiceMonths: 0,
    isOnceInEmployment: false,
    category: LeaveCategory.PARENTAL,
    genderRestriction: 'MALE', // Male employees only
    accrualBased: false,
  },
  {
    name: 'Hajj Leave',
    description: 'Leave for Hajj pilgrimage (Qatar Law: Up to 20 days unpaid, once during employment, requires 1 year of service)',
    color: '#059669', // Emerald green
    defaultDays: 20,
    requiresApproval: true,
    requiresDocument: false,
    isPaid: false, // Unpaid per Qatar law
    isActive: true,
    maxConsecutiveDays: 20,
    minNoticeDays: 30, // Should notify well in advance for pilgrimage planning
    allowCarryForward: false,
    // Qatar Labor Law fields
    minimumServiceMonths: 12, // Must complete 1 year of service
    isOnceInEmployment: true, // Can only be granted once during employment
    category: LeaveCategory.RELIGIOUS,
    accrualBased: false,
  },
  {
    name: 'Unpaid Leave',
    description: 'Unpaid leave of absence (max 30 days per request)',
    color: '#6B7280', // Gray
    defaultDays: 30, // Max 30 days per request
    requiresApproval: true,
    requiresDocument: false,
    isPaid: false,
    isActive: true,
    maxConsecutiveDays: 30,
    minNoticeDays: 14,
    allowCarryForward: false,
    // Qatar Labor Law fields
    minimumServiceMonths: 0,
    isOnceInEmployment: false,
    category: LeaveCategory.STANDARD,
    accrualBased: false,
  },
  {
    name: 'Compassionate Leave',
    description: 'Leave for bereavement or family emergencies (5 days paid)',
    color: '#3B82F6', // Blue
    defaultDays: 5,
    requiresApproval: true,
    requiresDocument: false,
    isPaid: true,
    isActive: true,
    minNoticeDays: 0, // Emergency leave doesn't require advance notice
    allowCarryForward: false,
    // Qatar Labor Law fields
    minimumServiceMonths: 0,
    isOnceInEmployment: false,
    category: LeaveCategory.STANDARD,
    accrualBased: false,
  },
];

/**
 * Get leave type badge style
 */
export function getLeaveTypeBadgeStyle(color: string): React.CSSProperties {
  return {
    backgroundColor: `${color}20`,
    color: color,
    borderColor: `${color}40`,
  };
}
