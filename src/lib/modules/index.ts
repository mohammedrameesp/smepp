/**
 * @file index.ts
 * @description Module System - Barrel export for all module-related functionality
 *
 * ════════════════════════════════════════════════════════════════════════════════
 * MODULE SYSTEM OVERVIEW
 * ════════════════════════════════════════════════════════════════════════════════
 *
 * The module system controls which features are available to each organization.
 * Modules can be installed/uninstalled via the admin panel, with dependencies
 * and tier restrictions enforced.
 *
 * ## Files
 *
 * - `registry.ts` - Module definitions, metadata, and dependency logic
 * - `access.ts` - Access control functions for checking module access
 * - `routes.ts` - Edge Runtime compatible route mapping (for middleware only)
 *
 * ## Usage
 *
 * @example Check if a module is installed
 * ```typescript
 * import { hasModuleAccess } from '@/lib/modules';
 *
 * if (hasModuleAccess('payroll', organization.enabledModules)) {
 *   // Show payroll features
 * }
 * ```
 *
 * @example Get module info
 * ```typescript
 * import { getModule, ModuleId } from '@/lib/modules';
 *
 * const payroll = getModule('payroll');
 * console.log(payroll?.name); // "Payroll Processing"
 * ```
 *
 * @example Validate module installation
 * ```typescript
 * import { canInstallModule } from '@/lib/modules';
 *
 * const error = canInstallModule('leave', ['assets'], 'FREE');
 * if (error) {
 *   console.error(error); // "Leave Management requires: Employee Management"
 * }
 * ```
 *
 * ## Notes
 *
 * - `routes.ts` is NOT exported from this barrel - import directly for middleware
 * - All access checks are server-side only
 * - Client-side checks are for UX only
 *
 * @module lib/modules
 */

// ═══════════════════════════════════════════════════════════════════════════════
// REGISTRY EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════
// Module definitions, types, and helper functions

export {
  // Constants
  MODULE_REGISTRY,
  ALL_MODULE_IDS,

  // Types
  type ModuleId,
  type ModuleCategory,
  type ModuleDefinition,
  type SerializableModuleInfo,

  // Module lookup functions
  getModule,
  getAllModuleIds,
  getAllModules,
  getModulesByCategory,
  getModulesForTier,
  getFreeModules,
  getCoreModules,
  getDefaultEnabledModules,
  getSerializableModules,

  // Dependency functions
  getModuleDependencies,
  getModuleDependents,
  canInstallModule,
  canUninstallModule,

  // Validation functions
  isValidModuleId,
  validateModuleIds,
  getRequiredTier,

  // Route lookup (non-Edge compatible)
  getModuleForRoute,
} from './registry';

// ═══════════════════════════════════════════════════════════════════════════════
// ACCESS CONTROL EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════
// Functions for checking module access at runtime

export {
  // Types
  type ModuleAccessResult,

  // Session-based access checks
  checkModuleAccess,
  hasModuleAccess,
  isRouteAccessible,

  // API response helpers
  moduleNotInstalledResponse,
  moduleUpgradeRequiredResponse,

  // Middleware helpers (use routes.ts directly for Edge Runtime)
  getProtectedModuleForPath,
  getModuleNotInstalledRedirect,
} from './access';

// ═══════════════════════════════════════════════════════════════════════════════
// NOTE: routes.ts NOT EXPORTED FROM BARREL
// ═══════════════════════════════════════════════════════════════════════════════
// routes.ts is Edge Runtime compatible and should be imported directly in
// middleware.ts to avoid bundling non-Edge-compatible code from registry.ts.
//
// Usage in middleware:
// import { checkRouteModuleAccess, checkPermissionAccess } from '@/lib/modules/routes';
