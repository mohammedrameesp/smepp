/**
 * @file index.ts
 * @module access-control
 * @description Access Control Module - Central export for permission-based access control.
 *
 * Provides a comprehensive permission-based access control system for the multi-tenant platform.
 * Includes role constants, permission checking, and manager-based filtering.
 *
 * @example API Route Permission Check
 * ```typescript
 * import { hasPermission, PERMISSIONS } from '@/lib/access-control';
 *
 * // Check a permission (using boolean flags)
 * const canRun = await hasPermission(tenantId, isOwner, isAdmin, PERMISSIONS.PAYROLL_RUN, enabledModules);
 *
 * // In API handler
 * export const POST = withErrorHandler(handler, { requirePermission: 'payroll:run' });
 * ```
 *
 * @example React Component Permission Gate
 * ```typescript
 * import { usePermission, PermissionGate } from '@/lib/access-control';
 *
 * const canEdit = usePermission('assets:edit');
 * <PermissionGate permission="assets:edit">...</PermissionGate>
 * ```
 *
 * @example Role Derivation
 * ```typescript
 * import { deriveOrgRole, ORG_ROLES } from '@/lib/access-control';
 *
 * const role = deriveOrgRole({ isOwner: true, isAdmin: false }); // => 'OWNER'
 * ```
 */

// Role constants and types
export {
  ORG_ROLES,
  DISPLAY_ROLES,
  type OrgRole,
  type DisplayRole,
} from './permissions';

// Role utilities
export {
  deriveOrgRole,
  deriveDisplayRole,
  isAdminOrOwner,
  hasElevatedPrivileges,
  type OrgRoleFlags,
  type DisplayRoleFlags,
} from './role-utils';

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
  setMemberPermissions,
  isValidPermission,
} from './permission-service';

// Seeding utilities
export {
  seedDefaultPermissions,
  resetToDefaultPermissions,
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
