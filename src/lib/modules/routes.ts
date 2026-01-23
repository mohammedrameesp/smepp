/**
 * Module Route Mapping (for middleware - Edge Runtime compatible)
 *
 * This file provides route-to-module mapping without any dependencies
 * that aren't compatible with Edge Runtime (like lucide-react).
 *
 * IMPORTANT: Keep in sync with registry.ts module definitions.
 */

// Core modules are always enabled (can't be uninstalled)
// Keep in sync with isCore: true in registry.ts
const CORE_MODULES = ['employees'];

// Route prefixes mapped to module IDs
const MODULE_ROUTE_MAP: Array<{ prefix: string; moduleId: string }> = [
  // Assets
  { prefix: '/admin/assets', moduleId: 'assets' },
  { prefix: '/admin/asset-requests', moduleId: 'assets' },
  { prefix: '/employee/assets', moduleId: 'assets' },
  { prefix: '/employee/my-assets', moduleId: 'assets' },
  { prefix: '/employee/asset-requests', moduleId: 'assets' },
  // Subscriptions
  { prefix: '/admin/subscriptions', moduleId: 'subscriptions' },
  { prefix: '/employee/subscriptions', moduleId: 'subscriptions' },
  // Suppliers
  { prefix: '/admin/suppliers', moduleId: 'suppliers' },
  { prefix: '/employee/suppliers', moduleId: 'suppliers' },
  // Employees
  { prefix: '/admin/employees', moduleId: 'employees' },
  // Note: /profile is accessible to all users; HR content is conditionally shown based on isEmployee flag
  // Leave
  { prefix: '/admin/leave', moduleId: 'leave' },
  { prefix: '/employee/leave', moduleId: 'leave' },
  // Payroll
  { prefix: '/admin/payroll', moduleId: 'payroll' },
  { prefix: '/employee/payroll', moduleId: 'payroll' },
  // Purchase Requests
  { prefix: '/admin/purchase-requests', moduleId: 'purchase-requests' },
  { prefix: '/employee/purchase-requests', moduleId: 'purchase-requests' },
  // Documents
  { prefix: '/admin/company-documents', moduleId: 'documents' },
];

/**
 * Find which module controls a specific route
 * Edge Runtime compatible - no external dependencies
 */
export function getModuleForRoute(pathname: string): string | null {
  for (const { prefix, moduleId } of MODULE_ROUTE_MAP) {
    if (pathname === prefix || pathname.startsWith(prefix + '/')) {
      return moduleId;
    }
  }
  return null;
}

/**
 * Check if a path requires a specific module and if it's enabled
 * Core modules (like 'employees') are always considered enabled
 */
export function checkModuleAccess(
  pathname: string,
  enabledModules: string[]
): { allowed: boolean; moduleId?: string; reason?: 'not_installed' } {
  const moduleId = getModuleForRoute(pathname);

  if (moduleId) {
    // Core modules are always enabled
    if (CORE_MODULES.includes(moduleId)) {
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

type PermissionFlag = 'hasOperationsAccess' | 'hasHRAccess' | 'hasFinanceAccess';

// Route prefixes mapped to required permission flags
const PERMISSION_ROUTE_MAP: Array<{ prefix: string; permission: PermissionFlag }> = [
  // Operations module routes
  { prefix: '/admin/assets', permission: 'hasOperationsAccess' },
  { prefix: '/admin/asset-requests', permission: 'hasOperationsAccess' },
  { prefix: '/admin/subscriptions', permission: 'hasOperationsAccess' },
  { prefix: '/admin/suppliers', permission: 'hasOperationsAccess' },
  // HR module routes
  { prefix: '/admin/employees', permission: 'hasHRAccess' },
  { prefix: '/admin/leave', permission: 'hasHRAccess' },
  // Finance module routes
  { prefix: '/admin/payroll', permission: 'hasFinanceAccess' },
  { prefix: '/admin/purchase-requests', permission: 'hasFinanceAccess' },
];

export interface PermissionContext {
  isAdmin?: boolean;
  isOwner?: boolean;
  hasOperationsAccess?: boolean;
  hasHRAccess?: boolean;
  hasFinanceAccess?: boolean;
}

/**
 * Check if a user has permission to access a specific route
 * Admin and Owner bypass all permission checks
 * Edge Runtime compatible
 */
export function checkPermissionAccess(
  pathname: string,
  permissions: PermissionContext
): { allowed: boolean; requiredPermission?: PermissionFlag; reason?: string } {
  // Admin/Owner bypass all permission checks
  if (permissions.isAdmin || permissions.isOwner) {
    return { allowed: true };
  }

  // Find matching route prefix
  for (const { prefix, permission } of PERMISSION_ROUTE_MAP) {
    if (pathname === prefix || pathname.startsWith(prefix + '/')) {
      // Check if user has the required permission
      if (!permissions[permission]) {
        return {
          allowed: false,
          requiredPermission: permission,
          reason: `Access denied: requires ${permission}`,
        };
      }
      break;
    }
  }

  return { allowed: true };
}
