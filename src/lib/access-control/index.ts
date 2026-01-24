/**
 * Access Control Module
 *
 * Provides permission-based access control for the multi-tenant platform.
 *
 * Usage:
 * ```typescript
 * import { hasPermission, PERMISSIONS } from '@/lib/access-control';
 *
 * // Check a permission (using boolean flags)
 * const canRun = await hasPermission(tenantId, isOwner, isAdmin, PERMISSIONS.PAYROLL_RUN, enabledModules);
 *
 * // In API handler
 * export const POST = withErrorHandler(handler, { requirePermission: 'payroll:run' });
 *
 * // In React component
 * const canEdit = usePermission('assets:edit');
 * <PermissionGate permission="assets:edit">...</PermissionGate>
 * ```
 */

// Permission constants
export {
  PERMISSIONS,
  PERMISSION_GROUPS,
  DEFAULT_MANAGER_PERMISSIONS,
  DEFAULT_MEMBER_PERMISSIONS,
  MODULE_PERMISSION_MAP,
  getAllPermissions,
  type Permission,
} from './permissions';

// Permission service
export {
  hasPermission,
  hasPermissions,
  getPermissionsForUser,
  getPermissionsForRole,
  grantMemberPermission,
  revokeMemberPermission,
  setMemberPermissions,
  isValidPermission,
} from './permission-service';

// Seeding utilities
export {
  seedDefaultPermissions,
  resetToDefaultPermissions,
  copyPermissions,
} from './seed-permissions';

// Manager access filter
export {
  buildManagerAccessFilter,
  applyManagerFilter,
  canAccessMember,
  type ManagerAccessFilter,
  type ManagerFilterOptions,
} from './manager-filter';

// Re-export TenantContext from prisma-tenant for convenience
export type { TenantContext } from '@/lib/core/prisma-tenant';
