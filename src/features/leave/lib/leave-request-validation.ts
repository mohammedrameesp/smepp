/**
 * @file leave-request-validation.ts
 * @description Leave request validation utilities - eligibility checks, date validation, and business rules
 * @module domains/hr/leave
 *
 * PURPOSE:
 * Provides reusable validation functions for leave requests.
 * Enforces Qatar Labor Law requirements and company policies.
 *
 * BUSINESS RULES ENFORCED:
 * - Service duration requirements (e.g., 12 months for annual leave)
 * - Gender restrictions for parental leave
 * - Once-in-employment leave limits (e.g., Hajj leave)
 * - Notice period requirements
 * - Maximum consecutive days limits
 * - Balance availability checks
 * - Date overlap prevention
 */

import { LeaveType, TeamMember, LeaveRequest, LeaveBalance, LeaveRequestType } from '@prisma/client';
import {
  calculateWorkingDays,
  meetsNoticeDaysRequirement,
  exceedsMaxConsecutiveDays,
  calculateAvailableBalance,
  meetsServiceRequirement,
  formatServiceDuration,
} from '@/features/leave/lib/leave-utils';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export interface LeaveTypeEligibilityParams {
  leaveType: LeaveType;
  hrProfile: Pick<TeamMember, 'dateOfJoining' | 'hajjLeaveTaken' | 'gender' | 'bypassNoticeRequirement'> | null;
  startDate: Date;
  hasExistingBalance: boolean;
}

export interface LeaveRequestDateParams {
  startDate: Date;
  endDate: Date;
  requestType: LeaveRequestType;
  leaveType: LeaveType;
  isAdmin: boolean;
  adminOverrideNotice?: boolean;
  bypassNoticeRequirement?: boolean;
}

export interface OverlapCheckParams {
  userId: string;
  tenantId: string;
  startDate: Date;
  endDate: Date;
  existingRequests: Array<{ status: string; startDate: Date; endDate: Date }>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LEAVE TYPE ELIGIBILITY VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Validate if user is eligible for a specific leave type
 * Checks: admin assignment requirement, gender restriction, service requirement, once-in-employment
 *
 * @param params - Eligibility check parameters
 * @returns Validation result with error message if not eligible
 */
export function validateLeaveTypeEligibility(params: LeaveTypeEligibilityParams): ValidationResult {
  const { leaveType, hrProfile, startDate, hasExistingBalance } = params;

  // Check if this leave type requires admin assignment (PARENTAL or RELIGIOUS categories)
  if ((leaveType.category === 'PARENTAL' || leaveType.category === 'RELIGIOUS') && !hasExistingBalance) {
    return {
      valid: false,
      error: `${leaveType.name} must be assigned by an administrator. Please contact HR to request this leave type.`,
    };
  }

  // Validate gender restriction for parental leave
  if (leaveType.genderRestriction) {
    if (!hrProfile?.gender) {
      return {
        valid: false,
        error: 'Your gender is not recorded in your HR profile. Please contact HR to update your profile.',
      };
    }

    if (hrProfile.gender.toUpperCase() !== leaveType.genderRestriction) {
      return {
        valid: false,
        error: `${leaveType.name} is only available for ${leaveType.genderRestriction.toLowerCase()} employees.`,
      };
    }
  }

  // Check minimum service requirement (Qatar Labor Law - e.g., 12 months for annual leave)
  if (leaveType.minimumServiceMonths > 0) {
    if (!hrProfile?.dateOfJoining) {
      return {
        valid: false,
        error: 'Your date of joining is not recorded. Please contact HR to update your profile.',
      };
    }

    if (!meetsServiceRequirement(hrProfile.dateOfJoining, leaveType.minimumServiceMonths, startDate)) {
      const requirement = formatServiceRequirement(leaveType.minimumServiceMonths);
      return {
        valid: false,
        error: `You must complete ${requirement} of service to be eligible for ${leaveType.name}. Your current service: ${formatServiceDuration(hrProfile.dateOfJoining)}`,
      };
    }
  }

  return { valid: true };
}

/**
 * Check if leave type is once-in-employment and already used
 *
 * @param leaveType - The leave type being requested
 * @param hrProfile - User's HR profile with hajjLeaveTaken flag
 * @param existingOnceLeave - Existing pending/approved request for this leave type
 * @returns Validation result
 */
export function validateOnceInEmploymentLeave(
  leaveType: LeaveType,
  hrProfile: Pick<TeamMember, 'hajjLeaveTaken'> | null,
  existingOnceLeave: LeaveRequest | null
): ValidationResult {
  if (!leaveType.isOnceInEmployment) {
    return { valid: true };
  }

  // Check HR profile flag (e.g., hajjLeaveTaken)
  if (hrProfile?.hajjLeaveTaken) {
    return {
      valid: false,
      error: `${leaveType.name} can only be taken once during your employment. You have already used this leave.`,
    };
  }

  // Check existing requests as backup
  if (existingOnceLeave) {
    return {
      valid: false,
      error: `${leaveType.name} can only be taken once during your employment. You already have a ${existingOnceLeave.status.toLowerCase()} request.`,
    };
  }

  return { valid: true };
}

// ═══════════════════════════════════════════════════════════════════════════════
// DATE AND DURATION VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Validate leave request dates and calculate working days
 *
 * @param params - Date validation parameters
 * @returns Object with totalDays and any validation error
 */
export function validateLeaveRequestDates(params: LeaveRequestDateParams): {
  totalDays: number;
  error?: string;
} {
  const {
    startDate,
    endDate,
    requestType,
    leaveType,
    isAdmin,
    adminOverrideNotice,
    bypassNoticeRequirement,
  } = params;

  // Calculate days - Accrual-based leave (Annual Leave) includes weekends
  const includeWeekends = leaveType.accrualBased === true;
  const totalDays = calculateWorkingDays(startDate, endDate, requestType, includeWeekends);

  if (totalDays === 0) {
    return { totalDays: 0, error: 'No working days in the selected date range' };
  }

  // Check minimum notice days (skip if: admin override OR user has bypass flag)
  const skipNoticeCheck = (isAdmin && adminOverrideNotice === true) || bypassNoticeRequirement === true;
  if (!skipNoticeCheck && !meetsNoticeDaysRequirement(startDate, leaveType.minNoticeDays)) {
    return {
      totalDays,
      error: `This leave type requires at least ${leaveType.minNoticeDays} days advance notice`,
    };
  }

  // Check max consecutive days
  if (exceedsMaxConsecutiveDays(totalDays, leaveType.maxConsecutiveDays)) {
    return {
      totalDays,
      error: `This leave type allows a maximum of ${leaveType.maxConsecutiveDays} consecutive days`,
    };
  }

  return { totalDays };
}

/**
 * Check for overlapping leave requests
 *
 * @param startDate - Requested start date
 * @param endDate - Requested end date
 * @param existingRequests - User's existing pending/approved requests
 * @returns Validation result
 */
export function validateNoOverlap(
  startDate: Date,
  endDate: Date,
  existingRequests: Array<{ startDate: Date; endDate: Date }>
): ValidationResult {
  const hasOverlap = existingRequests.some(req => {
    const reqStart = new Date(req.startDate);
    const reqEnd = new Date(req.endDate);
    return startDate <= reqEnd && endDate >= reqStart;
  });

  if (hasOverlap) {
    return {
      valid: false,
      error: 'You already have a pending or approved leave request that overlaps with these dates',
    };
  }

  return { valid: true };
}

// ═══════════════════════════════════════════════════════════════════════════════
// BALANCE VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check if user has sufficient balance for leave request
 *
 * @param balance - User's leave balance
 * @param requestedDays - Number of days requested
 * @param isPaidLeave - Whether this is a paid leave type
 * @returns Validation result with available balance in error if insufficient
 */
export function validateSufficientBalance(
  balance: Pick<LeaveBalance, 'entitlement' | 'used' | 'carriedForward' | 'adjustment'>,
  requestedDays: number,
  isPaidLeave: boolean
): ValidationResult {
  if (!isPaidLeave) {
    return { valid: true };
  }

  const available = calculateAvailableBalance(
    balance.entitlement,
    balance.used,
    balance.carriedForward,
    balance.adjustment
  );

  if (requestedDays > available) {
    return {
      valid: false,
      error: `INSUFFICIENT_BALANCE:${available}`,
    };
  }

  return { valid: true };
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Format service requirement duration for display
 */
function formatServiceRequirement(months: number): string {
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;

  if (years > 0 && remainingMonths > 0) {
    return `${years} year(s) and ${remainingMonths} month(s)`;
  } else if (years > 0) {
    return `${years} year(s)`;
  } else {
    return `${remainingMonths} month(s)`;
  }
}

/**
 * Validate document requirement
 * Document is optional for 1-day leave (e.g., single day sick leave)
 */
export function validateDocumentRequirement(
  leaveType: LeaveType,
  documentUrl?: string | null,
  totalDays?: number
): ValidationResult {
  // Skip document requirement for 1-day leave
  if (totalDays !== undefined && totalDays <= 1) {
    return { valid: true };
  }

  if (leaveType.requiresDocument && !documentUrl) {
    return {
      valid: false,
      error: 'This leave type requires a supporting document',
    };
  }

  return { valid: true };
}
