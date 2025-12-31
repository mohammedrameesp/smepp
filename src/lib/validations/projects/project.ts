/**
 * @file project.ts
 * @description Validation schemas for project module entities with client types and timeline management
 * @module validations/projects
 */

import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────
// ENUMS
// ─────────────────────────────────────────────────────────────────

export const ProjectStatus = z.enum([
  'PLANNING',
  'ACTIVE',
  'ON_HOLD',
  'COMPLETED',
  'CANCELLED',
]);

export const ClientType = z.enum(['INTERNAL', 'EXTERNAL', 'SUPPLIER']);

// ─────────────────────────────────────────────────────────────────
// PROJECT SCHEMAS
// ─────────────────────────────────────────────────────────────────

export const projectCreateSchema = z.object({
  code: z.string().min(1, 'Project code is required').max(50),
  name: z.string().min(1, 'Project name is required').max(255),
  description: z.string().max(2000).optional().nullable(),
  status: ProjectStatus.default('PLANNING'),

  // Client
  clientType: ClientType.default('INTERNAL'),
  supplierId: z.string().cuid().optional().nullable(),
  clientName: z.string().max(255).optional().nullable(),
  clientContact: z.string().max(255).optional().nullable(),

  // Timeline
  startDate: z.coerce.date().optional().nullable(),
  endDate: z.coerce.date().optional().nullable(),

  // Ownership
  managerId: z.string().cuid('Invalid manager ID'),
  documentHandler: z.string().max(255).optional().nullable(),
}).refine(
  (data) => {
    if (data.startDate && data.endDate) {
      return data.endDate >= data.startDate;
    }
    return true;
  },
  { message: 'End date must be after start date', path: ['endDate'] }
).refine(
  (data) => {
    if (data.clientType === 'SUPPLIER' && !data.supplierId) {
      return false;
    }
    return true;
  },
  { message: 'Supplier must be selected for Supplier client type', path: ['supplierId'] }
).refine(
  (data) => {
    if (data.clientType === 'EXTERNAL' && !data.clientName) {
      return false;
    }
    return true;
  },
  { message: 'Client name is required for external clients', path: ['clientName'] }
);

export const projectUpdateSchema = projectCreateSchema.partial().extend({
  id: z.string().cuid(),
});

export type ProjectCreateInput = z.infer<typeof projectCreateSchema>;
export type ProjectUpdateInput = z.infer<typeof projectUpdateSchema>;

// ─────────────────────────────────────────────────────────────────
// QUERY/FILTER SCHEMAS
// ─────────────────────────────────────────────────────────────────

export const projectModuleQuerySchema = z.object({
  search: z.string().optional(),
  status: ProjectStatus.optional(),
  clientType: ClientType.optional(),
  managerId: z.string().cuid().optional(),
  startDateFrom: z.coerce.date().optional(),
  startDateTo: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['code', 'name', 'status', 'startDate', 'endDate', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type ProjectModuleQueryInput = z.infer<typeof projectModuleQuerySchema>;
