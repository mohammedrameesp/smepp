/**
 * @file users.ts
 * @description Validation schemas for user/team member creation and updates
 * @module domains/system/users/validations
 *
 * USER TYPES:
 * - Login Users: Can authenticate and access the system (email required)
 * - Non-Login Users: Employee records for HR/payroll only (no email required)
 * - WPS Employees: Employees on Qatar's Wage Protection System
 *
 * ROLES (maps to boolean permission flags):
 * - ADMIN: Full admin access (isAdmin=true, all department access)
 * - MANAGER: Can approve direct reports (canApprove=true)
 * - HR: HR module access (hasHRAccess=true)
 * - FINANCE: Finance module access (hasFinanceAccess=true)
 * - OPERATIONS: Operations module access (hasOperationsAccess=true)
 * - EMPLOYEE: Self-service only (no special flags)
 *
 * BUSINESS RULES:
 * - Email is required when canLogin is true
 * - Password must be 8-100 characters (hashed before storage)
 * - Employee ID must be unique within tenant
 */

import { z } from 'zod';

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

/** Available roles for team members */
export const USER_ROLES = ['ADMIN', 'MANAGER', 'HR', 'FINANCE', 'OPERATIONS', 'EMPLOYEE'] as const;
export type UserRole = typeof USER_ROLES[number];

/** Role to permission flags mapping */
export const ROLE_PERMISSIONS: Record<UserRole, {
  isAdmin: boolean;
  canApprove: boolean;
  hasHRAccess: boolean;
  hasFinanceAccess: boolean;
  hasOperationsAccess: boolean;
}> = {
  ADMIN: { isAdmin: true, canApprove: true, hasHRAccess: true, hasFinanceAccess: true, hasOperationsAccess: true },
  MANAGER: { isAdmin: false, canApprove: true, hasHRAccess: false, hasFinanceAccess: false, hasOperationsAccess: false },
  HR: { isAdmin: false, canApprove: false, hasHRAccess: true, hasFinanceAccess: false, hasOperationsAccess: false },
  FINANCE: { isAdmin: false, canApprove: false, hasHRAccess: false, hasFinanceAccess: true, hasOperationsAccess: false },
  OPERATIONS: { isAdmin: false, canApprove: false, hasHRAccess: false, hasFinanceAccess: false, hasOperationsAccess: true },
  EMPLOYEE: { isAdmin: false, canApprove: false, hasHRAccess: false, hasFinanceAccess: false, hasOperationsAccess: false },
};

/** Role display configuration */
export const ROLE_CONFIG: Record<UserRole, { label: string; description: string; color: string }> = {
  ADMIN: { label: 'Admin', description: 'Full access to all modules and settings', color: 'bg-red-500' },
  MANAGER: { label: 'Manager', description: 'Can approve direct reports, employee self-service', color: 'bg-purple-500' },
  HR: { label: 'HR', description: 'Access to Team, Leave, and HR modules', color: 'bg-green-500' },
  FINANCE: { label: 'Finance', description: 'Access to Payroll and Purchase Requests', color: 'bg-yellow-500' },
  OPERATIONS: { label: 'Operations', description: 'Access to Assets, Subscriptions, Suppliers', color: 'bg-blue-500' },
  EMPLOYEE: { label: 'Employee', description: 'Self-service only (own profile, leave, payslips)', color: 'bg-gray-400' },
};

// ═══════════════════════════════════════════════════════════════════════════════
// USER SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Schema for creating a new team member/user.
 *
 * Creates a user record that can optionally:
 * - Login to the system (requires email)
 * - Appear in HR/payroll (isEmployee)
 * - Be included in WPS salary files (isOnWps)
 *
 * @example
 * // Login user (admin)
 * { name: "John Doe", email: "john@company.com", role: "ADMIN", canLogin: true }
 *
 * // Non-login employee (HR record only)
 * { name: "Worker", role: "EMPLOYEE", canLogin: false, isEmployee: true }
 */
export const createUserSchema = z.object({
  /** Full name (required, max 100 chars) */
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  /** Email address (required when canLogin is true) */
  email: z.string().email('Invalid email address').optional(),
  /** Role determines access level and permission flags */
  role: z.enum(USER_ROLES).default('EMPLOYEE'),
  /** @deprecated Use role instead. Is this user an admin (full dashboard access)? */
  isAdmin: z.boolean().optional(),
  /** Initial password (8-100 chars, optional for non-login users) */
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password must be less than 100 characters')
    .optional(),
  /** Company employee code (max 50 chars) */
  employeeId: z.string().max(50, 'Employee code must be less than 50 characters').optional(),
  /** Job title/designation (max 100 chars) */
  designation: z.string().max(100, 'Designation must be less than 100 characters').optional(),
  /** Is this user an employee (appears in HR/payroll)? */
  isEmployee: z.boolean().default(true),
  /** Can this user authenticate to the system? */
  canLogin: z.boolean().default(true),
  /** Is this employee on WPS (Qatar Wage Protection System)? */
  isOnWps: z.boolean().default(true),
}).refine(
  (data) => data.canLogin ? !!data.email : true,
  { message: 'Email is required when user can login', path: ['email'] }
);

/**
 * Schema for updating an existing user.
 * All fields are optional.
 */
export const updateUserSchema = z.object({
  /** Updated name */
  name: z.string().min(1).max(100).optional(),
  /** Update admin status */
  isAdmin: z.boolean().optional(),
  /** Update employee status */
  isEmployee: z.boolean().optional(),
  /** Update login capability */
  canLogin: z.boolean().optional(),
  /** Update WPS status */
  isOnWps: z.boolean().optional(),
});

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

/** Inferred type for user creation */
export type CreateUserInput = z.infer<typeof createUserSchema>;
/** Inferred type for user updates */
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
