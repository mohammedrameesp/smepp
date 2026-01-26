/**
 * Module Access Control
 *
 * Helper functions for checking module access at API and route level.
 */

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { NextResponse } from 'next/server';
import { MODULE_REGISTRY, getModuleForRoute, getModule } from './registry';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface ModuleAccessResult {
  allowed: boolean;
  moduleId?: string;
  moduleName?: string;
  reason?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SESSION-BASED ACCESS CHECKS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check if the current user has access to a module
 * Uses session's enabledModules
 */
export async function checkModuleAccess(moduleId: string): Promise<ModuleAccessResult> {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return {
      allowed: false,
      moduleId,
      reason: 'Authentication required',
    };
  }

  const enabledModules = session.user.enabledModules || [];
  const mod = MODULE_REGISTRY[moduleId];

  if (!mod) {
    return {
      allowed: false,
      moduleId,
      reason: `Module "${moduleId}" not found`,
    };
  }

  // Core modules are always accessible
  if (mod.isCore) {
    return { allowed: true, moduleId, moduleName: mod.name };
  }

  // Check if module is enabled for this organization
  if (!enabledModules.includes(moduleId)) {
    return {
      allowed: false,
      moduleId,
      moduleName: mod.name,
      reason: `Module "${mod.name}" is not installed for your organization`,
    };
  }

  return { allowed: true, moduleId, moduleName: mod.name };
}

/**
 * Check module access synchronously from provided enabled modules list
 */
export function hasModuleAccess(
  moduleId: string,
  enabledModules: string[]
): boolean {
  const mod = MODULE_REGISTRY[moduleId];

  if (!mod) {
    return false;
  }

  // Core modules are always accessible
  if (mod.isCore) {
    return true;
  }

  return enabledModules.includes(moduleId);
}

/**
 * Check if a route is accessible based on enabled modules
 */
export function isRouteAccessible(
  route: string,
  enabledModules: string[]
): ModuleAccessResult {
  const moduleId = getModuleForRoute(route);

  // If route is not controlled by any module, allow access
  if (!moduleId) {
    return { allowed: true };
  }

  const mod = getModule(moduleId);
  if (!mod) {
    return { allowed: true };
  }

  // Core modules are always accessible
  if (mod.isCore) {
    return { allowed: true, moduleId, moduleName: mod.name };
  }

  if (!enabledModules.includes(moduleId)) {
    return {
      allowed: false,
      moduleId,
      moduleName: mod.name,
      reason: `The "${mod.name}" module is not installed`,
    };
  }

  return { allowed: true, moduleId, moduleName: mod.name };
}

// ═══════════════════════════════════════════════════════════════════════════════
// API RESPONSE HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a module not installed error response
 */
export function moduleNotInstalledResponse(
  moduleId: string,
  requestId?: string
): NextResponse {
  const mod = MODULE_REGISTRY[moduleId];
  const moduleName = mod?.name || moduleId;

  return NextResponse.json(
    {
      error: 'Module not installed',
      message: `The "${moduleName}" module is not installed for your organization. Please install it from the Modules page.`,
      moduleId,
      code: 'MODULE_NOT_INSTALLED',
      requestId,
    },
    { status: 403 }
  );
}

/**
 * Create a module upgrade required error response
 */
export function moduleUpgradeRequiredResponse(
  moduleId: string,
  requiredTier: string,
  requestId?: string
): NextResponse {
  const mod = MODULE_REGISTRY[moduleId];
  const moduleName = mod?.name || moduleId;

  return NextResponse.json(
    {
      error: 'Upgrade required',
      message: `The "${moduleName}" module requires a ${requiredTier} subscription or higher.`,
      moduleId,
      requiredTier,
      code: 'UPGRADE_REQUIRED',
      requestId,
    },
    { status: 403 }
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MIDDLEWARE HELPER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check if a path should be protected by module access
 * Returns the module ID if protected, null otherwise
 */
export function getProtectedModuleForPath(pathname: string): string | null {
  // Normalize pathname
  const normalizedPath = pathname.endsWith('/')
    ? pathname.slice(0, -1)
    : pathname;

  // Check all modules for matching routes
  for (const mod of Object.values(MODULE_REGISTRY)) {
    // Skip undefined or core modules - core modules are always accessible
    if (!mod || mod.isCore) continue;

    const allRoutes = [
      ...mod.adminRoutes,
      ...mod.employeeRoutes,
    ];

    for (const route of allRoutes) {
      if (normalizedPath === route || normalizedPath.startsWith(route + '/')) {
        return mod.id;
      }
    }
  }

  return null;
}

/**
 * Get the redirect URL when a module is not installed
 */
export function getModuleNotInstalledRedirect(moduleId: string): string {
  return `/admin/modules?install=${moduleId}`;
}
