/**
 * @file prisma-tenant.ts
 * @description Tenant-scoped Prisma client extension that automatically filters all queries
 *              by tenantId and injects tenantId into all creates/updates. This ensures
 *              complete data isolation between organizations in the multi-tenant architecture.
 * @module multi-tenant
 *
 * ARCHITECTURE:
 * This is the CORE security mechanism for multi-tenant isolation. Every database
 * query from API routes goes through this extension, which:
 *
 * 1. READS: Automatically adds `WHERE tenantId = ?` to all queries
 * 2. WRITES: Automatically sets `tenantId` on all creates/upserts
 * 3. DELETES: Verifies tenant ownership before deleting
 *
 * SECURITY:
 * - Prevents Insecure Direct Object Reference (IDOR) attacks
 * - Ensures Organization A cannot access Organization B's data
 * - Works at the database layer (cannot be bypassed by API logic)
 *
 * FLOW:
 * 1. Request comes in → Middleware extracts organizationId from session
 * 2. Middleware sets x-tenant-id header → API handler reads header
 * 3. API handler creates tenant-scoped Prisma client → All queries auto-filtered
 *
 * IMPORTANT:
 * - Never use the raw `prisma` client for tenant data
 * - Always use the tenant-scoped client from API handler context
 * - Super admin routes use raw prisma for cross-tenant operations
 */

import { prisma } from './prisma';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface TenantContext {
  tenantId: string;
  userId: string;
  userRole?: string; // User's app role (ADMIN/USER)
  orgRole?: string;  // User's organization role (OWNER/ADMIN/MANAGER/MEMBER)
  subscriptionTier?: string;
}

// Models that have tenantId field and need tenant isolation
const TENANT_MODELS = [
  'Asset',
  'AssetHistory',
  'Subscription',
  'ActivityLog',
  'Notification',
  'ApprovalPolicy',
  'ApprovalStep',
  'ApproverDelegation',
  'MaintenanceRecord',
  'Supplier',
  'SupplierEngagement',
  'SystemSettings',
  'HRProfile',
  'ProfileChangeRequest',
  'PurchaseRequest',
  'LeaveType',
  'LeaveBalance',
  'LeaveRequest',
  'SalaryStructure',
  'PayrollRun',
  'Payslip',
  'EmployeeLoan',
  'Project',
  'AssetRequest',
  'CompanyDocumentType',
  'CompanyDocument',
] as const;

type TenantModel = (typeof TENANT_MODELS)[number];

// Check if a model has tenant isolation
function isTenantModel(model: string): model is TenantModel {
  return TENANT_MODELS.includes(model as TenantModel);
}

// ═══════════════════════════════════════════════════════════════════════════════
// TENANT PRISMA EXTENSION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Creates a tenant-scoped Prisma client that automatically:
 * - Filters all queries by tenantId
 * - Injects tenantId into all creates
 * - Prevents cross-tenant data access
 */
export function createTenantPrismaClient(context: TenantContext) {
  const { tenantId } = context;

  if (!tenantId) {
    throw new Error('Tenant context required for database operations');
  }

  return prisma.$extends({
    name: 'tenantIsolation',
    query: {
      $allModels: {
        async findMany({ model, args, query }) {
          if (isTenantModel(model)) {
            args.where = { ...args.where, tenantId };
          }
          return query(args);
        },

        async findFirst({ model, args, query }) {
          if (isTenantModel(model)) {
            args.where = { ...args.where, tenantId };
          }
          return query(args);
        },

        async findUnique({ model, args, query }) {
          // For findUnique, we verify tenant after fetch
          const result = await query(args);
          if (result && isTenantModel(model) && 'tenantId' in result) {
            if (result.tenantId !== tenantId) {
              return null; // Deny cross-tenant access
            }
          }
          return result;
        },

        async findFirstOrThrow({ model, args, query }) {
          if (isTenantModel(model)) {
            args.where = { ...args.where, tenantId };
          }
          return query(args);
        },

        async findUniqueOrThrow({ model, args, query }) {
          const result = await query(args);
          if (result && isTenantModel(model) && 'tenantId' in result) {
            if (result.tenantId !== tenantId) {
              throw new Error('Record not found');
            }
          }
          return result;
        },

        async create({ model, args, query }) {
          if (isTenantModel(model)) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (args.data as any).tenantId = tenantId;
          }
          return query(args);
        },

        async createMany({ model, args, query }) {
          if (isTenantModel(model)) {
            if (Array.isArray(args.data)) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              args.data = args.data.map((item: any) => ({
                ...item,
                tenantId,
              }));
            } else {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (args.data as any).tenantId = tenantId;
            }
          }
          return query(args);
        },

        async update({ model, args, query }) {
          if (isTenantModel(model)) {
            // Add tenant filter to where clause
            args.where = { ...args.where, tenantId };
          }
          return query(args);
        },

        async updateMany({ model, args, query }) {
          if (isTenantModel(model)) {
            args.where = { ...args.where, tenantId };
          }
          return query(args);
        },

        async upsert({ model, args, query }) {
          if (isTenantModel(model)) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (args.where as any).tenantId = tenantId;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (args.create as any).tenantId = tenantId;
          }
          return query(args);
        },

        async delete({ model, args, query }) {
          if (isTenantModel(model)) {
            // Verify ownership before delete
            args.where = { ...args.where, tenantId };
          }
          return query(args);
        },

        async deleteMany({ model, args, query }) {
          if (isTenantModel(model)) {
            args.where = { ...args.where, tenantId };
          }
          return query(args);
        },

        async count({ model, args, query }) {
          if (isTenantModel(model)) {
            args.where = { ...args.where, tenantId };
          }
          return query(args);
        },

        async aggregate({ model, args, query }) {
          if (isTenantModel(model)) {
            args.where = { ...args.where, tenantId };
          }
          return query(args);
        },

        async groupBy({ model, args, query }) {
          if (isTenantModel(model)) {
            args.where = { ...args.where, tenantId };
          }
          return query(args);
        },
      },
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type TenantPrismaClient = ReturnType<typeof createTenantPrismaClient>;

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get tenant context from request headers (set by middleware)
 */
export function getTenantContextFromHeaders(headers: Headers): TenantContext | null {
  const tenantId = headers.get('x-tenant-id');
  const userId = headers.get('x-user-id');

  if (!tenantId || !userId) {
    return null;
  }

  return {
    tenantId,
    userId,
    userRole: headers.get('x-user-role') || undefined,
    orgRole: headers.get('x-org-role') || undefined,
    subscriptionTier: headers.get('x-subscription-tier') || undefined,
  };
}

/**
 * Create tenant Prisma client from request headers
 */
export function getTenantPrismaFromHeaders(headers: Headers): TenantPrismaClient {
  const context = getTenantContextFromHeaders(headers);

  if (!context) {
    throw new Error('Tenant context not found in request headers');
  }

  return createTenantPrismaClient(context);
}
