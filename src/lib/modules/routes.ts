/**
 * Module Route Mapping (for middleware - Edge Runtime compatible)
 *
 * This file provides route-to-module mapping without any dependencies
 * that aren't compatible with Edge Runtime (like lucide-react).
 *
 * IMPORTANT: Keep in sync with registry.ts module definitions.
 */

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
 */
export function checkModuleAccess(
  pathname: string,
  enabledModules: string[]
): { allowed: boolean; moduleId?: string; reason?: 'not_installed' } {
  const moduleId = getModuleForRoute(pathname);

  if (moduleId && !enabledModules.includes(moduleId)) {
    return { allowed: false, moduleId, reason: 'not_installed' };
  }

  return { allowed: true };
}
