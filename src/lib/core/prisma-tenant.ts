/**
 * @file prisma-tenant.ts
 * @description Tenant-scoped Prisma client extension for Durj multi-tenant platform.
 * @module multi-tenant
 *
 * SECURITY CRITICAL FILE
 * ════════════════════════════════════════════════════════════════════════════
 * This ensures complete data isolation between tenant organizations by:
 *
 * 1. QUERY FILTERING: Automatically adds `WHERE tenantId = ?` to all reads
 * 2. DATA INJECTION: Automatically sets `tenantId` on all creates
 * 3. OWNERSHIP VERIFICATION: Validates tenant ownership before updates/deletes
 * 4. MODIFICATION PREVENTION: Blocks tenantId field changes in updates
 * 5. RAW QUERY BLOCKING: Prevents bypass via $queryRaw/$executeRaw
 *
 * SECURITY INVARIANTS:
 * - A tenant can NEVER read another tenant's data
 * - A tenant can NEVER modify another tenant's data
 * - A tenant can NEVER delete another tenant's data
 * - tenantId is ALWAYS injected by the system, never from user input
 *
 * REQUEST FLOW:
 * 1. Request → Middleware extracts organizationId from session
 * 2. Middleware sets x-tenant-id header → API handler reads header
 * 3. API handler creates tenant-scoped Prisma client → All queries auto-filtered
 *
 * @security NEVER use raw Prisma client (`prisma`) for tenant data access
 * @security NEVER expose raw queries ($queryRaw) on tenant client
 * @security ALWAYS get tenant client from validated session context
 *
 * @example
 * // In API handler - CORRECT usage
 * export const GET = withErrorHandler(async (req, { prisma }) => {
 *   // prisma is already tenant-scoped from handler
 *   const assets = await prisma.asset.findMany();
 *   return NextResponse.json(assets);
 * }, { requireAuth: true });
 *
 * @example
 * // WRONG - Never do this!
 * import { prisma } from './prisma';
 * const assets = await prisma.asset.findMany(); // NO TENANT FILTER!
 */

import { prisma } from './prisma';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Tenant context extracted from authenticated session.
 * This is set by middleware and passed through request headers.
 *
 * @security tenantId must come from validated session, never from user input
 */
export interface TenantContext {
  /** Organization ID (CUID) - the tenant identifier */
  tenantId: string;
  /** Organization slug for subdomain routing */
  tenantSlug?: string;
  /** Current user's ID */
  userId: string;
  /** User's application role */
  userRole?: string;
  /** Organization's subscription tier */
  subscriptionTier?: string;
  /** Whether user is organization owner */
  isOwner?: boolean;
  /** Whether user is organization admin */
  isAdmin?: boolean;
  /** Department access flags */
  hasHRAccess?: boolean;
  hasFinanceAccess?: boolean;
  hasOperationsAccess?: boolean;
  /** Manager flag for approvals */
  canApprove?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TENANT MODEL REGISTRY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Models that require tenant isolation (have tenantId field).
 *
 * IMPORTANT: Keep synchronized with prisma/schema.prisma
 * Any model with `tenantId String` MUST be listed here.
 *
 * Child models without tenantId (SubscriptionHistory, SpendRequestItem, etc.)
 * are NOT listed because they're accessed through their parent and have
 * CASCADE DELETE - they inherit tenant isolation from their parent.
 *
 * @security If you add a new model with tenantId, you MUST add it here
 */
const TENANT_MODELS = [
  // Core business entities
  'Asset',
  'AssetCategory',
  'AssetHistory',
  'AssetRequest',
  'AssetTypeMapping',
  'Subscription',
  'Location',

  // Team & HR
  'TeamMember',
  'ProfileChangeRequest',

  // Leave management
  'LeaveType',
  'LeaveBalance',
  'LeaveRequest',
  'PublicHoliday',

  // Payroll
  'SalaryStructure',
  'PayrollRun',
  'Payslip',
  'EmployeeLoan',

  // Spend requests
  'SpendRequest',

  // Suppliers
  'Supplier',
  'SupplierEngagement',

  // Approvals & workflows
  'ApprovalPolicy',
  'ApprovalStep',

  // Maintenance
  'MaintenanceRecord',

  // Depreciation
  'DepreciationCategory',
  'DepreciationRecord',

  // Company documents
  'CompanyDocumentType',
  'CompanyDocument',

  // System
  'ActivityLog',
  'Notification',
  'SystemSettings',
  'RolePermission',

  // AI Chat
  'ChatConversation',
  'AIChatUsage',
  'AIChatAuditLog',

  // WhatsApp integration
  'WhatsAppConfig',
  'WhatsAppUserPhone',
  'WhatsAppActionToken',
  'WhatsAppMessageLog',
] as const;

type TenantModel = (typeof TENANT_MODELS)[number];

/** O(1) lookup set for tenant model checking (called on every query) */
const TENANT_MODELS_SET: Set<string> = new Set(TENANT_MODELS);

/**
 * Check if a Prisma model requires tenant isolation.
 * @param model - Prisma model name
 * @returns true if model has tenantId field
 */
function isTenantModel(model: string): model is TenantModel {
  return TENANT_MODELS_SET.has(model);
}

/**
 * Validate that tenantId is a non-empty string.
 * @throws Error if tenantId is invalid
 * @security Prevents null, undefined, empty strings, whitespace-only, and very short IDs
 *
 * Note: Full CUID format validation is not enforced here because:
 * 1. Middleware already validates tenant IDs from authenticated sessions
 * 2. This is defense-in-depth, not primary validation
 * 3. Some test environments use simplified IDs
 */
function validateTenantId(tenantId: unknown): asserts tenantId is string {
  if (!tenantId || typeof tenantId !== 'string') {
    throw new Error('SECURITY: Tenant context required for database operations');
  }

  const trimmed = tenantId.trim();
  if (trimmed === '') {
    throw new Error('SECURITY: Empty tenantId is not allowed');
  }

  // Minimum length check to prevent obviously invalid IDs
  if (trimmed.length < 5) {
    throw new Error('SECURITY: Invalid tenantId format');
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TENANT PRISMA EXTENSION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Creates a tenant-scoped Prisma client that automatically:
 * - Filters all queries by tenantId
 * - Injects tenantId into all creates
 * - Verifies ownership before updates/deletes
 * - Prevents tenantId modification
 * - Blocks raw query methods
 *
 * @param context - Tenant context from authenticated session
 * @returns Extended Prisma client with tenant isolation
 *
 * @security This function is the core of multi-tenant data isolation
 * @throws Error if tenantId is missing or invalid
 */
export function createTenantPrismaClient(context: TenantContext) {
  const { tenantId } = context;

  // SECURITY: Validate tenantId format before creating client
  validateTenantId(tenantId);

  return prisma.$extends({
    name: 'tenantIsolation',

    // ─────────────────────────────────────────────────────────────────────────
    // CLIENT EXTENSIONS: Block dangerous methods
    // ─────────────────────────────────────────────────────────────────────────
    client: {
      /**
       * @security Raw queries are blocked on tenant client to prevent bypass.
       * Use the global prisma client with manual tenantId filtering if needed.
       */
      $queryRaw() {
        throw new Error(
          'SECURITY: Raw queries are disabled on tenant client. ' +
            'Use the global prisma client with manual tenantId filtering for raw queries.'
        );
      },
      $queryRawUnsafe() {
        throw new Error('SECURITY: Raw queries are disabled on tenant client.');
      },
      $executeRaw() {
        throw new Error('SECURITY: Raw execution is disabled on tenant client.');
      },
      $executeRawUnsafe() {
        throw new Error('SECURITY: Raw execution is disabled on tenant client.');
      },
    },

    // ─────────────────────────────────────────────────────────────────────────
    // QUERY EXTENSIONS: Tenant filtering and injection
    // ─────────────────────────────────────────────────────────────────────────
    query: {
      $allModels: {
        // ═══════════════════════════════════════════════════════════════════
        // READ OPERATIONS - Add tenantId to where clause
        // ═══════════════════════════════════════════════════════════════════

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

        /**
         * findUnique cannot add tenantId to unique where clause.
         * Instead, we verify ownership after fetch.
         *
         * @security Returns null if record belongs to different tenant
         */
        async findUnique({ model, args, query }) {
          const result = await query(args);
          if (result && isTenantModel(model) && 'tenantId' in result) {
            if (result.tenantId !== tenantId) {
              // SECURITY: Deny cross-tenant access silently
              return null;
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

        /**
         * @security Throws generic error to avoid revealing record existence
         */
        async findUniqueOrThrow({ model, args, query }) {
          const result = await query(args);
          if (result && isTenantModel(model) && 'tenantId' in result) {
            if (result.tenantId !== tenantId) {
              throw new Error('Record not found');
            }
          }
          return result;
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

        // ═══════════════════════════════════════════════════════════════════
        // CREATE OPERATIONS - Inject tenantId
        // ═══════════════════════════════════════════════════════════════════

        async create({ model, args, query }) {
          if (isTenantModel(model)) {
            // SECURITY: Always use system tenantId, ignore any user-provided value
            (args.data as Record<string, unknown>).tenantId = tenantId;
          }
          return query(args);
        },

        async createMany({ model, args, query }) {
          if (isTenantModel(model)) {
            if (Array.isArray(args.data)) {
              // SECURITY: Override any user-provided tenantId in each record
              // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Dynamic Prisma extension
              args.data = (args.data as any[]).map((item) => ({
                ...item,
                tenantId,
              }));
            } else {
              (args.data as Record<string, unknown>).tenantId = tenantId;
            }
          }
          return query(args);
        },

        // ═══════════════════════════════════════════════════════════════════
        // UPDATE OPERATIONS - Verify ownership before update
        // ═══════════════════════════════════════════════════════════════════

        /**
         * SECURITY: Prisma's update uses unique constraint matching.
         * Adding tenantId to where may be ignored if id alone is unique.
         * We verify ownership with a pre-check query to prevent cross-tenant updates.
         */
        async update({ model, args, query }) {
          if (isTenantModel(model)) {
            // SECURITY: Pre-verify the record belongs to this tenant
            const whereWithTenant = { ...args.where, tenantId };

            // Use findFirst to check if record exists for this tenant
            // @ts-expect-error - Dynamic model access for security check
            const existing = await prisma[model].findFirst({
              where: whereWithTenant,
              select: { id: true },
            });

            if (!existing) {
              throw new Error('Record not found');
            }

            // SECURITY: Prevent tenantId from being changed via update
            if (args.data && typeof args.data === 'object') {
              delete (args.data as Record<string, unknown>).tenantId;
            }
          }
          return query(args);
        },

        /**
         * updateMany supports compound where, so direct filtering works.
         */
        async updateMany({ model, args, query }) {
          if (isTenantModel(model)) {
            args.where = { ...args.where, tenantId };

            // SECURITY: Prevent tenantId from being changed via updateMany
            if (args.data && typeof args.data === 'object') {
              delete (args.data as Record<string, unknown>).tenantId;
            }
          }
          return query(args);
        },

        /**
         * SECURITY: Upsert requires careful handling:
         * - Create path: inject tenantId
         * - Update path: verify ownership and prevent tenantId change
         * - Cross-tenant: block if record exists for different tenant
         */
        async upsert({ model, args, query }) {
          if (isTenantModel(model)) {
            // SECURITY: Check if record exists for this tenant
            const whereWithTenant = { ...args.where, tenantId };

            // @ts-expect-error - Dynamic model access for security check
            const existingForTenant = await prisma[model].findFirst({
              where: whereWithTenant,
              select: { id: true },
            });

            // Also check if record exists for ANY tenant (to block cross-tenant upsert)
            // @ts-expect-error - Dynamic model access for security check
            const existingAny = await prisma[model].findFirst({
              where: args.where,
              select: { tenantId: true },
            });

            if (existingAny && existingAny.tenantId !== tenantId) {
              // SECURITY: Record exists but belongs to different tenant
              throw new Error('Record not found');
            }

            // Inject tenantId in create data
            (args.create as Record<string, unknown>).tenantId = tenantId;

            // Add tenantId to where for proper matching
            (args.where as Record<string, unknown>).tenantId = tenantId;

            // Prevent tenantId modification in update
            if (args.update && typeof args.update === 'object') {
              delete (args.update as Record<string, unknown>).tenantId;
            }
          }
          return query(args);
        },

        // ═══════════════════════════════════════════════════════════════════
        // DELETE OPERATIONS - Verify ownership before delete
        // ═══════════════════════════════════════════════════════════════════

        /**
         * SECURITY: Same as update - verify ownership before allowing delete.
         * Prisma's delete uses unique constraint, so we pre-check with tenant filter.
         */
        async delete({ model, args, query }) {
          if (isTenantModel(model)) {
            // SECURITY: Pre-verify the record belongs to this tenant
            const whereWithTenant = { ...args.where, tenantId };

            // @ts-expect-error - Dynamic model access for security check
            const existing = await prisma[model].findFirst({
              where: whereWithTenant,
              select: { id: true },
            });

            if (!existing) {
              throw new Error('Record not found');
            }
          }
          return query(args);
        },

        /**
         * deleteMany supports compound where, so direct filtering works.
         */
        async deleteMany({ model, args, query }) {
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
// TYPE EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

/** Type for the tenant-scoped Prisma client */
export type TenantPrismaClient = ReturnType<typeof createTenantPrismaClient>;

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Extract tenant context from request headers (set by middleware).
 *
 * @security Headers are set by middleware from validated session
 * @param headers - Request headers
 * @returns Tenant context or null if not present
 */
export function getTenantContextFromHeaders(headers: Headers): TenantContext | null {
  const tenantId = headers.get('x-tenant-id');
  const userId = headers.get('x-user-id');

  if (!tenantId || !userId) {
    return null;
  }

  return {
    tenantId,
    tenantSlug: headers.get('x-tenant-slug') || undefined,
    userId,
    userRole: headers.get('x-user-role') || undefined,
    subscriptionTier: headers.get('x-subscription-tier') || undefined,
  };
}

/**
 * Create tenant Prisma client from request headers.
 *
 * @security Only call this from authenticated routes
 * @throws Error if tenant context is missing
 */
export function getTenantPrismaFromHeaders(headers: Headers): TenantPrismaClient {
  const context = getTenantContextFromHeaders(headers);

  if (!context) {
    throw new Error('Tenant context not found in request headers');
  }

  return createTenantPrismaClient(context);
}
