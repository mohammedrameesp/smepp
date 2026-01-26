/**
 * @file routes.ts
 * @description Module Route Mapping for Edge Runtime middleware
 *
 * This file provides route-to-module mapping without dependencies that
 * aren't compatible with Edge Runtime (like lucide-react icons).
 *
 * ════════════════════════════════════════════════════════════════════════════════
 * AUTO-GENERATION
 * ════════════════════════════════════════════════════════════════════════════════
 *
 * Module route mappings are AUTO-GENERATED from registry.ts:
 * - ModuleId type
 * - CORE_MODULES set
 * - MODULE_ROUTE_MAP array
 *
 * To update route mappings:
 * 1. Edit the module definitions in registry.ts
 * 2. Run: npm run generate:routes
 *
 * The generated file (routes.generated.ts) is committed to git for CI/CD.
 *
 * ════════════════════════════════════════════════════════════════════════════════
 * HAND-WRITTEN CODE
 * ════════════════════════════════════════════════════════════════════════════════
 *
 * The following remain hand-written in this file:
 * - getModuleForRoute() - Route lookup logic
 * - checkRouteModuleAccess() - Module access check logic
 * - PERMISSION_ROUTE_MAP - Permission mappings (not in registry)
 * - checkPermissionAccess() - Permission check logic
 *
 * @module lib/modules/routes
 */

// Import auto-generated data from registry
import {
  type ModuleId,
  CORE_MODULES,
  MODULE_ROUTE_MAP,
} from './routes.generated';

// Re-export for consumers
export type { ModuleId };
export { CORE_MODULES, MODULE_ROUTE_MAP };

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE ACCESS FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Find which module controls a specific route.
 * Edge Runtime compatible - no external dependencies.
 *
 * @param pathname - The request pathname (e.g., "/admin/assets/123")
 * @returns Module ID if route is protected, null otherwise
 *
 * @security Route matching is CASE-INSENSITIVE to prevent bypass attacks like /Admin/Assets
 * @security Query strings are stripped before matching
 *
 * @example
 * getModuleForRoute('/admin/assets'); // 'assets'
 * getModuleForRoute('/Admin/ASSETS'); // 'assets' (case-insensitive)
 * getModuleForRoute('/admin/assets?sort=name'); // 'assets' (query stripped)
 * getModuleForRoute('/admin/settings'); // null (not module-protected)
 */
export function getModuleForRoute(pathname: string): ModuleId | null {
  // Strip query string if present
  const pathOnly = pathname.split('?')[0];
  // Normalize to lowercase for case-insensitive matching
  const normalizedPath = pathOnly.toLowerCase();

  for (const { prefix, moduleId } of MODULE_ROUTE_MAP) {
    const normalizedPrefix = prefix.toLowerCase();
    if (normalizedPath === normalizedPrefix || normalizedPath.startsWith(normalizedPrefix + '/')) {
      return moduleId;
    }
  }
  return null;
}

/**
 * Result of module access check
 */
export interface ModuleAccessCheckResult {
  /** Whether access is allowed */
  allowed: boolean;
  /** The module ID that controls this route (if any) */
  moduleId?: ModuleId;
  /** Reason for denial (only present when allowed is false) */
  reason?: 'not_installed';
}

/**
 * Check if a path requires a specific module and if it's enabled.
 * Core modules (like 'employees') are always considered enabled.
 *
 * @param pathname - The request pathname
 * @param enabledModules - List of enabled module IDs for the organization
 * @returns Access check result with allowed status and reason if denied
 *
 * @security Uses O(1) Set lookup for core module check
 *
 * @example
 * // Module not installed
 * checkRouteModuleAccess('/admin/leave', ['assets']); // { allowed: false, moduleId: 'leave', reason: 'not_installed' }
 *
 * // Module installed
 * checkRouteModuleAccess('/admin/assets', ['assets']); // { allowed: true }
 *
 * // Core module (always allowed)
 * checkRouteModuleAccess('/admin/employees', []); // { allowed: true }
 *
 * // Unprotected route
 * checkRouteModuleAccess('/admin/settings', []); // { allowed: true }
 */
export function checkRouteModuleAccess(
  pathname: string,
  enabledModules: string[]
): ModuleAccessCheckResult {
  const moduleId = getModuleForRoute(pathname);

  if (moduleId) {
    // Core modules are always enabled (O(1) Set lookup)
    if (CORE_MODULES.has(moduleId)) {
      return { allowed: true };
    }
    // Check if non-core module is enabled
    if (!enabledModules.includes(moduleId)) {
      return { allowed: false, moduleId, reason: 'not_installed' };
    }
  }

  return { allowed: true };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PERMISSION-BASED ROUTE ACCESS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Permission flags that can be assigned to team members.
 * These control access to different functional areas of the admin panel.
 */
export type PermissionFlag = 'hasOperationsAccess' | 'hasHRAccess' | 'hasFinanceAccess';

/**
 * Route prefixes mapped to required permission flags.
 * Admin/employee routes are protected by both module AND permission.
 *
 * Routes can require multiple permissions (OR logic) - user needs ANY of them.
 * Example: payroll requires hasHRAccess OR hasFinanceAccess
 *
 * @note Only admin routes are permission-protected. Employee routes are
 * accessible to all employees if the module is enabled.
 *
 * @note This mapping is NOT auto-generated because permission associations
 * are not part of module definitions in registry.ts.
 */
const PERMISSION_ROUTE_MAP: ReadonlyArray<{ prefix: string; permissions: PermissionFlag[] }> = [
  // Operations department routes
  { prefix: '/admin/assets', permissions: ['hasOperationsAccess'] },
  { prefix: '/admin/asset-requests', permissions: ['hasOperationsAccess'] },
  { prefix: '/admin/subscriptions', permissions: ['hasOperationsAccess'] },
  { prefix: '/admin/suppliers', permissions: ['hasOperationsAccess'] },
  // HR department routes
  { prefix: '/admin/employees', permissions: ['hasHRAccess'] },
  { prefix: '/admin/leave', permissions: ['hasHRAccess'] },
  // HR + Finance department routes (accessible by either)
  { prefix: '/admin/payroll', permissions: ['hasHRAccess', 'hasFinanceAccess'] },
  // Finance department routes
  { prefix: '/admin/spend-requests', permissions: ['hasFinanceAccess'] },
];

/**
 * User permission context for access checks.
 * Extracted from JWT token in middleware.
 */
export interface PermissionContext {
  /** User is organization admin */
  isAdmin?: boolean;
  /** User is organization owner */
  isOwner?: boolean;
  /** User has operations department access */
  hasOperationsAccess?: boolean;
  /** User has HR department access */
  hasHRAccess?: boolean;
  /** User has finance department access */
  hasFinanceAccess?: boolean;
}

/**
 * Result of permission access check
 */
export interface PermissionAccessCheckResult {
  /** Whether access is allowed */
  allowed: boolean;
  /** The permission flags that would grant access (if denied) */
  requiredPermissions?: PermissionFlag[];
  /** Human-readable reason for denial */
  reason?: string;
}

/**
 * Check if a user has permission to access a specific route.
 * Admin and Owner bypass all permission checks.
 * Edge Runtime compatible.
 *
 * For routes with multiple permissions, user needs ANY of them (OR logic).
 *
 * @param pathname - The request pathname
 * @param permissions - User's permission flags from token
 * @returns Permission check result with allowed status and required permissions if denied
 *
 * @security Route matching is CASE-INSENSITIVE to prevent bypass attacks
 * @security Admin/Owner always bypass permission checks (they have full access)
 *
 * @example
 * // User without HR access
 * checkPermissionAccess('/admin/employees', { hasOperationsAccess: true });
 * // { allowed: false, requiredPermissions: ['hasHRAccess'], reason: 'Access denied: requires hasHRAccess' }
 *
 * // Payroll accessible by HR OR Finance
 * checkPermissionAccess('/admin/payroll', { hasHRAccess: true });
 * // { allowed: true }
 *
 * // Admin always allowed
 * checkPermissionAccess('/admin/employees', { isAdmin: true });
 * // { allowed: true }
 */
export function checkPermissionAccess(
  pathname: string,
  permissions: PermissionContext
): PermissionAccessCheckResult {
  // Admin/Owner bypass all permission checks
  if (permissions.isAdmin || permissions.isOwner) {
    return { allowed: true };
  }

  // Strip query string and normalize to lowercase
  const pathOnly = pathname.split('?')[0];
  const normalizedPath = pathOnly.toLowerCase();

  // Find matching route prefix
  for (const { prefix, permissions: requiredPerms } of PERMISSION_ROUTE_MAP) {
    const normalizedPrefix = prefix.toLowerCase();
    if (normalizedPath === normalizedPrefix || normalizedPath.startsWith(normalizedPrefix + '/')) {
      // Check if user has ANY of the required permissions (OR logic)
      const hasAnyPermission = requiredPerms.some(perm => permissions[perm]);
      if (!hasAnyPermission) {
        const permList = requiredPerms.join(' or ');
        return {
          allowed: false,
          requiredPermissions: requiredPerms,
          reason: `Access denied: requires ${permList}`,
        };
      }
      break;
    }
  }

  return { allowed: true };
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS FOR TESTING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get all module route mappings (for testing/validation only)
 * @internal
 */
export function _getModuleRouteMap(): ReadonlyArray<{ prefix: string; moduleId: ModuleId }> {
  return MODULE_ROUTE_MAP;
}

/**
 * Get all permission route mappings (for testing/validation only)
 * @internal
 */
export function _getPermissionRouteMap(): ReadonlyArray<{ prefix: string; permissions: PermissionFlag[] }> {
  return PERMISSION_ROUTE_MAP;
}

/**
 * Check if a module is a core module (for testing/validation only)
 * @internal
 */
export function _isCoreModule(moduleId: string): boolean {
  return CORE_MODULES.has(moduleId);
}
