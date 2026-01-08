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
 * ROLES:
 * - ADMIN: Full system access
 * - EMPLOYEE: Self-service access (leave, assets, profile)
 *
 * BUSINESS RULES:
 * - Email is required when canLogin is true
 * - Password must be 8-100 characters (hashed before storage)
 * - Employee ID must be unique within tenant
 */

import { z } from 'zod';
import { Role } from '@prisma/client';

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
 * // Login user (admin or employee)
 * { name: "John Doe", email: "john@company.com", role: "EMPLOYEE", canLogin: true }
 *
 * // Non-login employee (HR record only)
 * { name: "Worker", role: "EMPLOYEE", canLogin: false, isEmployee: true }
 */
export const createUserSchema = z.object({
  /** Full name (required, max 100 chars) */
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  /** Email address (required when canLogin is true) */
  email: z.string().email('Invalid email address').optional(),
  /** System role (ADMIN or EMPLOYEE) */
  role: z.nativeEnum(Role, {
    message: 'Invalid role',
  }),
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
  /** Updated role */
  role: z.nativeEnum(Role).optional(),
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
