/**
 * @file leave.ts
 * @description Validation schemas for leave management including leave types, requests,
 *              approvals, and balance adjustments
 * @module domains/hr/leave/validations
 *
 * SCHEMAS:
 * - Leave Types: Create/update leave type configurations
 * - Leave Requests: Employee leave request submission and updates
 * - Approvals: Manager approval/rejection/cancellation
 * - Balances: Balance initialization and adjustments
 * - Queries: List filtering and pagination
 *
 * QATAR LABOR LAW COMPLIANCE:
 * - Service-based entitlements (e.g., 21 days annual leave < 5 years, 28 days >= 5 years)
 * - Sick leave pay tiers (full pay, half pay, unpaid)
 * - Gender restrictions for parental leave
 * - Once-in-employment leave (Hajj)
 */

import { z } from 'zod';
import { LeaveStatus, LeaveRequestType, LeaveCategory } from '@prisma/client';

// ═══════════════════════════════════════════════════════════════════════════════
// LEAVE TYPE SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Pay tier configuration for tiered leave benefits.
 * Used primarily for sick leave in Qatar (full pay → half pay → unpaid progression).
 *
 * @example
 * { days: 14, payPercent: 100, label: "Full Pay" }
 * { days: 28, payPercent: 50, label: "Half Pay" }
 */
const payTierSchema = z.object({
  /** Number of days in this tier */
  days: z.number().int().min(1, 'Days must be at least 1'),
  /** Percentage of salary paid (0-100) */
  payPercent: z.number().int().min(0).max(100, 'Pay percent must be 0-100'),
  /** Display label for the tier */
  label: z.string().min(1, 'Label is required').max(100, 'Label is too long'),
});

/**
 * Service-based entitlement configuration.
 * Maps months of service to leave day entitlements.
 *
 * @example
 * { "12": 21, "60": 28 } // 21 days after 1 year, 28 days after 5 years
 */
const serviceBasedEntitlementSchema = z.record(
  z.string(), // Months of service as string key (e.g., "12", "60")
  z.number().int().min(0, 'Entitlement must be 0 or more')
);

/** Leave category enum for business logic grouping */
const leaveCategorySchema = z.nativeEnum(LeaveCategory);

/**
 * Schema for creating a new leave type.
 *
 * Configures all aspects of a leave type including:
 * - Basic settings (name, days, approvals)
 * - Qatar Labor Law compliance (service requirements, pay tiers)
 * - Category for auto-initialization logic
 *
 * @example
 * {
 *   name: "Annual Leave",
 *   defaultDays: 21,
 *   isPaid: true,
 *   minimumServiceMonths: 12,
 *   serviceBasedEntitlement: { "12": 21, "60": 28 }
 * }
 */
/** Base schema for leave type fields (without refinements) */
const leaveTypeBaseSchema = z.object({
  /** Leave type display name */
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
  /** Optional description */
  description: z.string().max(500, 'Description is too long').optional().nullable(),
  /** Hex color for UI badges (e.g., "#3B82F6") */
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format').default('#3B82F6'),
  /** Default annual entitlement in days */
  defaultDays: z.number().int().min(0, 'Default days must be 0 or more').default(0),
  /** Whether manager approval is required */
  requiresApproval: z.boolean().default(true),
  /** Whether supporting document is required (e.g., medical certificate) */
  requiresDocument: z.boolean().default(false),
  /** Whether this is paid leave */
  isPaid: z.boolean().default(true),
  /** Whether this leave type is available for requests */
  isActive: z.boolean().default(true),
  /** Maximum consecutive days allowed per request */
  maxConsecutiveDays: z.number().int().min(1).optional().nullable(),
  /** Minimum advance notice days required */
  minNoticeDays: z.number().int().min(0).default(0),
  /** Whether unused days can carry forward to next year */
  allowCarryForward: z.boolean().default(false),
  /** Maximum days that can be carried forward */
  maxCarryForwardDays: z.number().int().min(0).optional().nullable(),
  // Qatar Labor Law fields
  /** Minimum service months required for eligibility */
  minimumServiceMonths: z.number().int().min(0, 'Minimum service months must be 0 or more').default(0),
  /** Whether this leave can only be taken once (e.g., Hajj) */
  isOnceInEmployment: z.boolean().default(false),
  /** Service-based entitlement tiers (months → days) */
  serviceBasedEntitlement: serviceBasedEntitlementSchema.optional().nullable(),
  /** Pay tiers for progressive leave (e.g., sick leave) */
  payTiers: z.array(payTierSchema).optional().nullable(),
  /** Category determines auto-initialization (STANDARD, MEDICAL, PARENTAL, RELIGIOUS) */
  category: leaveCategorySchema.default('STANDARD'),
  /** Gender restriction (MALE, FEMALE) for parental leave */
  genderRestriction: z.enum(['MALE', 'FEMALE']).optional().nullable(),
  /** Whether leave accrues monthly (vs fixed annual entitlement) */
  accrualBased: z.boolean().default(false),
});

export const createLeaveTypeSchema = leaveTypeBaseSchema.refine(
  (data) => {
    // If allowCarryForward is true, maxCarryForwardDays should be specified
    if (data.allowCarryForward && !data.maxCarryForwardDays) {
      return false;
    }
    return true;
  },
  {
    message: 'Max carry forward days is required when carry forward is allowed',
    path: ['maxCarryForwardDays'],
  }
);

/**
 * Schema for updating an existing leave type.
 * All fields are optional.
 */
export const updateLeaveTypeSchema = leaveTypeBaseSchema.partial();

// ═══════════════════════════════════════════════════════════════════════════════
// LEAVE REQUEST SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Schema for creating a new leave request.
 *
 * BUSINESS RULES:
 * - Half-day requests must have same start and end date
 * - End date must be on or after start date
 * - Admin can override notice requirements
 * - Admin can create requests on behalf of employees
 *
 * @example
 * {
 *   leaveTypeId: "clx123...",
 *   startDate: "2024-03-01",
 *   endDate: "2024-03-05",
 *   requestType: "FULL_DAY",
 *   reason: "Family vacation"
 * }
 */
export const createLeaveRequestSchema = z.object({
  /** Reference to the leave type */
  leaveTypeId: z.string().min(1, 'Leave type is required'),
  /** Leave start date (ISO string) */
  startDate: z.string().min(1, 'Start date is required'),
  /** Leave end date (ISO string) */
  endDate: z.string().min(1, 'End date is required'),
  /** Type: FULL_DAY, HALF_DAY_AM, or HALF_DAY_PM */
  requestType: z.nativeEnum(LeaveRequestType).default('FULL_DAY'),
  /** Optional reason for the leave */
  reason: z.string().max(1000, 'Reason is too long').optional().nullable(),
  /** URL to supporting document (e.g., medical certificate) */
  documentUrl: z.string().url('Invalid document URL').optional().nullable(),
  /** Emergency contact name during leave */
  emergencyContact: z.string().max(100, 'Emergency contact name is too long').optional().nullable(),
  /** Emergency contact phone */
  emergencyPhone: z.string().max(20, 'Emergency phone is too long').optional().nullable(),
  /** Admin flag to override minimum notice requirement */
  adminOverrideNotice: z.boolean().optional().default(false),
  /** Employee ID when admin creates on behalf of another */
  employeeId: z.string().optional(),
}).refine(
  (data) => {
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    return start <= end;
  },
  {
    message: 'End date must be on or after start date',
    path: ['endDate'],
  }
).refine(
  (data) => {
    // For half-day requests, start and end date must be the same
    if (data.requestType !== 'FULL_DAY') {
      const start = new Date(data.startDate);
      const end = new Date(data.endDate);
      return start.toDateString() === end.toDateString();
    }
    return true;
  },
  {
    message: 'Half-day requests must be for a single day',
    path: ['endDate'],
  }
);

/**
 * Schema for updating a pending leave request.
 * Only pending requests with future start dates can be edited.
 */
export const updateLeaveRequestSchema = z.object({
  /** Updated start date */
  startDate: z.string().optional(),
  /** Updated end date */
  endDate: z.string().optional(),
  /** Updated request type */
  requestType: z.nativeEnum(LeaveRequestType).optional(),
  /** Updated reason */
  reason: z.string().max(1000, 'Reason is too long').optional().nullable(),
  /** Updated document URL */
  documentUrl: z.string().url('Invalid document URL').optional().nullable(),
  /** Updated emergency contact */
  emergencyContact: z.string().max(100, 'Emergency contact name is too long').optional().nullable(),
  /** Updated emergency phone */
  emergencyPhone: z.string().max(20, 'Emergency phone is too long').optional().nullable(),
});

// ═══════════════════════════════════════════════════════════════════════════════
// APPROVAL/REJECTION/CANCELLATION SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Schema for approving a leave request.
 */
export const approveLeaveRequestSchema = z.object({
  /** Optional notes from the approver */
  notes: z.string().max(500, 'Notes are too long').optional().nullable(),
});

/**
 * Schema for rejecting a leave request.
 * Reason is required to inform the employee.
 */
export const rejectLeaveRequestSchema = z.object({
  /** Required reason for rejection */
  reason: z.string().min(1, 'Rejection reason is required').max(500, 'Reason is too long'),
});

/**
 * Schema for cancelling a leave request.
 * Reason is required for audit trail.
 */
export const cancelLeaveRequestSchema = z.object({
  /** Required reason for cancellation */
  reason: z.string().min(1, 'Cancellation reason is required').max(500, 'Reason is too long'),
});

// ═══════════════════════════════════════════════════════════════════════════════
// LEAVE BALANCE SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Schema for adjusting an employee's leave balance.
 * Used for manual adjustments (corrections, special grants, etc.).
 */
export const updateLeaveBalanceSchema = z.object({
  /** Days to add (positive) or subtract (negative), max ±365 */
  adjustment: z.number().min(-365, 'Adjustment is too low').max(365, 'Adjustment is too high'),
  /** Required notes explaining the adjustment */
  adjustmentNotes: z.string().min(1, 'Adjustment notes are required').max(500, 'Notes are too long'),
});

/**
 * Schema for manually initializing a leave balance.
 * Used when auto-initialization doesn't apply (e.g., parental leave).
 */
export const initializeLeaveBalanceSchema = z.object({
  /** Employee/member ID */
  memberId: z.string().min(1, 'Member ID is required'),
  /** Leave type to initialize */
  leaveTypeId: z.string().min(1, 'Leave type ID is required'),
  /** Year for the balance (2000-2100) */
  year: z.number().int().min(2000).max(2100),
  /** Optional custom entitlement (uses leave type default if not specified) */
  entitlement: z.number().min(0, 'Entitlement must be 0 or more').optional(),
  /** Optional days carried forward from previous year */
  carriedForward: z.number().min(0, 'Carried forward must be 0 or more').optional(),
});

// ═══════════════════════════════════════════════════════════════════════════════
// QUERY SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Query parameters for listing leave requests.
 * Supports filtering by status, employee, type, date range with pagination.
 */
export const leaveRequestQuerySchema = z.object({
  /** Search query (searches request number, employee name) */
  q: z.string().optional(),
  /** Filter by status */
  status: z.nativeEnum(LeaveStatus).optional(),
  /** @deprecated Use memberId instead */
  userId: z.string().optional(),
  /** Filter by employee (TeamMember ID) */
  memberId: z.string().optional(),
  /** Filter by leave type */
  leaveTypeId: z.string().optional(),
  /** Filter by year */
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  /** Filter by start date (on or after) */
  startDate: z.string().optional(),
  /** Filter by end date (on or before) */
  endDate: z.string().optional(),
  /** Page number (1-based) */
  p: z.coerce.number().min(1).default(1),
  /** Page size (max 100) */
  ps: z.coerce.number().min(1).max(100).default(50),
  /** Sort field */
  sort: z.enum(['requestNumber', 'startDate', 'endDate', 'totalDays', 'createdAt', 'status']).default('createdAt'),
  /** Sort order */
  order: z.enum(['asc', 'desc']).default('desc'),
});

/**
 * Query parameters for listing leave balances.
 * Supports filtering by employee, type, year with pagination.
 */
export const leaveBalanceQuerySchema = z.object({
  /** @deprecated Use memberId instead */
  userId: z.string().optional(),
  /** Filter by employee (TeamMember ID) */
  memberId: z.string().optional(),
  /** Filter by leave type */
  leaveTypeId: z.string().optional(),
  /** Filter by year */
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  /** Page number (1-based) */
  p: z.coerce.number().min(1).default(1),
  /** Page size (max 1000 for calendar views) */
  ps: z.coerce.number().min(1).max(1000).default(50),
});

/**
 * Query parameters for team leave calendar.
 * Returns approved/pending leave requests for calendar display.
 */
export const teamCalendarQuerySchema = z.object({
  /** Calendar view start date */
  startDate: z.string().min(1, 'Start date is required'),
  /** Calendar view end date */
  endDate: z.string().min(1, 'End date is required'),
  /** Filter by status (optional) */
  status: z.nativeEnum(LeaveStatus).optional(),
  /** Filter by leave type (optional) */
  leaveTypeId: z.string().optional(),
});

/**
 * Query parameters for listing leave types.
 */
export const leaveTypeQuerySchema = z.object({
  /** Filter by active status */
  isActive: z.enum(['true', 'false']).optional(),
  /** Include inactive leave types */
  includeInactive: z.enum(['true', 'false']).optional(),
});

// ===== Type Exports =====

export type CreateLeaveTypeRequest = z.infer<typeof createLeaveTypeSchema>;
export type UpdateLeaveTypeRequest = z.infer<typeof updateLeaveTypeSchema>;
export type CreateLeaveRequestRequest = z.infer<typeof createLeaveRequestSchema>;
export type UpdateLeaveRequestRequest = z.infer<typeof updateLeaveRequestSchema>;
export type ApproveLeaveRequestRequest = z.infer<typeof approveLeaveRequestSchema>;
export type RejectLeaveRequestRequest = z.infer<typeof rejectLeaveRequestSchema>;
export type CancelLeaveRequestRequest = z.infer<typeof cancelLeaveRequestSchema>;
export type UpdateLeaveBalanceRequest = z.infer<typeof updateLeaveBalanceSchema>;
export type InitializeLeaveBalanceRequest = z.infer<typeof initializeLeaveBalanceSchema>;
export type LeaveRequestQuery = z.infer<typeof leaveRequestQuerySchema>;
export type LeaveBalanceQuery = z.infer<typeof leaveBalanceQuerySchema>;
export type TeamCalendarQuery = z.infer<typeof teamCalendarQuerySchema>;
export type LeaveTypeQuery = z.infer<typeof leaveTypeQuerySchema>;
