/**
 * @file users.ts
 * @description Validation schemas for user creation and updates
 * @module validations/core
 */

import { z } from 'zod';
import { Role } from '@prisma/client';

export const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  email: z.string().email('Invalid email address').optional(), // Optional when canLogin is false
  role: z.nativeEnum(Role, {
    message: 'Invalid role',
  }),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password must be less than 100 characters')
    .optional(),
  employeeId: z.string().max(50, 'Employee code must be less than 50 characters').optional(),
  designation: z.string().max(100, 'Designation must be less than 100 characters').optional(),
  // User type flags
  isEmployee: z.boolean().default(true),  // Is this user an employee (appears in HR/payroll)?
  canLogin: z.boolean().default(true),    // Can this user authenticate to the system?
  isOnWps: z.boolean().default(true),     // Is this employee on WPS (Wage Protection System)?
}).refine(
  (data) => data.canLogin ? !!data.email : true,
  { message: 'Email is required when user can login', path: ['email'] }
);

export const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  role: z.nativeEnum(Role).optional(),
  isEmployee: z.boolean().optional(),
  canLogin: z.boolean().optional(),
  isOnWps: z.boolean().optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
