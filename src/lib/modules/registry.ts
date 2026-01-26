/**
 * @file registry.ts
 * @description Central Module Registry - Single source of truth for all feature modules in Durj.
 *
 * @module lib/modules
 *
 * ## Overview
 *
 * This registry defines all feature modules available in the platform, including:
 * - Module metadata (name, description, icon, category)
 * - Access control (subscription tier requirements, free vs paid)
 * - Dependencies (which modules depend on others)
 * - Protected routes (admin, employee, and API routes)
 * - Module status (core, beta, deprecated)
 *
 * ## How Module Access Works
 *
 * 1. **Middleware Level** (src/middleware.ts):
 *    - Uses routes.ts for Edge Runtime compatible route checking
 *    - Blocks routes for disabled modules → redirects to /admin/modules
 *
 * 2. **API Level** (src/lib/http/handler.ts):
 *    - Uses `requireModule` option for per-endpoint checks
 *    - Returns 403 MODULE_NOT_INSTALLED for disabled modules
 *
 * 3. **UI Level** (admin/modules page):
 *    - Uses this registry for module installation/uninstallation UI
 *    - Enforces dependencies via canInstallModule/canUninstallModule
 *
 * ## Usage Examples
 *
 * ```typescript
 * // Check if a module is enabled for an organization
 * import { hasModuleAccess } from '@/lib/modules';
 * const canAccessLeave = hasModuleAccess('leave', organization.enabledModules);
 *
 * // API route with module protection
 * export const GET = withErrorHandler(handler, {
 *   requireAuth: true,
 *   requireModule: 'payroll',
 * });
 *
 * // Check if module can be installed (respects dependencies)
 * const error = canInstallModule('leave', enabledModules, 'FREE');
 * if (error) {
 *   console.error(error); // "Leave Management requires Employee Management"
 * }
 * ```
 *
 * ## Security Considerations
 *
 * - Module access MUST be enforced server-side (middleware + API handlers)
 * - Client-side checks are for UX only, not security
 * - Module IDs are validated against this registry (unknown IDs rejected)
 * - Core modules (isCore: true) cannot be uninstalled
 * - Dependencies are enforced: can't enable child without parent
 *
 * @security Module access is checked at multiple levels:
 * 1. Edge middleware blocks routes for disabled modules
 * 2. API handler wrapper checks requireModule option
 * 3. Database queries should be tenant-scoped regardless
 *
 * @see src/middleware.ts - Edge middleware for route protection
 * @see src/lib/modules/routes.ts - Edge Runtime compatible route mapping
 * @see src/lib/modules/access.ts - Access control helpers
 * @see src/lib/http/handler.ts - API handler with requireModule option
 */

import { SubscriptionTier } from '@prisma/client';
import {
  Package,
  CreditCard,
  Truck,
  Users,
  Calendar,
  DollarSign,
  ShoppingCart,
  FileCheck,
  type LucideIcon,
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Valid module identifiers.
 * Use this type for type-safe module ID references.
 *
 * @example
 * function checkModule(moduleId: ModuleId): boolean { ... }
 */
export type ModuleId =
  | 'assets'
  | 'subscriptions'
  | 'suppliers'
  | 'employees'
  | 'leave'
  | 'payroll'
  | 'spend-requests'
  | 'documents';

/**
 * Module categories for UI grouping and organization.
 */
export type ModuleCategory = 'operations' | 'hr' | 'system';

/**
 * Complete module definition including metadata, access control, and routes.
 *
 * @property id - Unique identifier (kebab-case, e.g., 'spend-requests')
 * @property name - Display name for UI
 * @property description - Short description of module functionality
 * @property icon - Lucide React icon component (for server components)
 * @property iconName - String name of icon (for client serialization)
 * @property category - Grouping category (operations, hr, system)
 * @property tier - Minimum subscription tier required (tier restrictions disabled)
 * @property isFree - Whether module is available on free tier
 * @property requires - Module IDs this depends on (must be enabled first)
 * @property requiredBy - Modules that depend on this (auto-computed from requires)
 * @property adminRoutes - Admin route prefixes protected by this module
 * @property employeeRoutes - Employee route prefixes protected by this module
 * @property apiRoutes - API route prefixes protected by this module
 * @property isCore - If true, module cannot be uninstalled (e.g., employees)
 * @property isBeta - If true, shown with beta badge in UI
 * @property isDeprecated - If true, hidden from new installations
 */
export interface ModuleDefinition {
  id: ModuleId;
  name: string;
  description: string;
  icon: LucideIcon;
  iconName: string;
  category: ModuleCategory;

  // Access Control (tier restrictions currently disabled - all modules free)
  tier: SubscriptionTier;
  isFree: boolean;

  // Dependencies
  requires: ModuleId[];
  requiredBy: ModuleId[];

  // Routes (for middleware protection - must be prefix patterns)
  adminRoutes: string[];
  employeeRoutes: string[];
  apiRoutes: string[];

  // Status flags
  isCore: boolean;
  isBeta: boolean;
  isDeprecated: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Registry type that allows string indexing with proper type safety.
 * Returns undefined for unknown module IDs.
 */
type ModuleRegistry = {
  [K in ModuleId]: ModuleDefinition;
} & {
  [key: string]: ModuleDefinition | undefined;
};

/**
 * Central registry of all feature modules.
 *
 * @security All module IDs are validated against this registry.
 * Unknown module IDs are rejected to prevent injection attacks.
 *
 * @note requiredBy fields are auto-computed from requires fields
 * by the IIFE at the bottom of this file. Set initial values to
 * empty arrays - they will be populated automatically.
 */
export const MODULE_REGISTRY: ModuleRegistry = {
  // ─────────────────────────────────────────────────────────────────────────────
  // OPERATIONS MODULES (Enabled by default for new organizations)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Asset Management Module
   *
   * Tracks physical and digital assets, assignments, maintenance schedules,
   * warranties, depreciation, and disposal workflows.
   */
  assets: {
    id: 'assets',
    name: 'Asset Management',
    description: 'Track company assets, assignments, maintenance & warranties',
    icon: Package,
    iconName: 'Package',
    category: 'operations',
    tier: 'FREE',
    isFree: true,
    requires: ['employees'], // Assets are assigned to employees
    requiredBy: [], // Auto-computed
    adminRoutes: ['/admin/assets', '/admin/asset-requests'],
    employeeRoutes: ['/employee/assets', '/employee/my-assets', '/employee/asset-requests'],
    apiRoutes: [
      '/api/assets',
      '/api/asset-requests',
      '/api/asset-categories',
      '/api/asset-types',
      '/api/asset-type-mappings',
    ],
    isCore: false,
    isBeta: false,
    isDeprecated: false,
  },

  /**
   * Subscription Tracking Module
   *
   * Monitors SaaS subscriptions, renewal dates, costs, and usage.
   */
  subscriptions: {
    id: 'subscriptions',
    name: 'Subscription Tracking',
    description: 'Monitor SaaS services, renewals, and recurring costs',
    icon: CreditCard,
    iconName: 'CreditCard',
    category: 'operations',
    tier: 'FREE',
    isFree: true,
    requires: ['employees'], // Subscriptions have employee owners/managers
    requiredBy: [], // Auto-computed
    adminRoutes: ['/admin/subscriptions'],
    employeeRoutes: ['/employee/subscriptions'],
    apiRoutes: ['/api/subscriptions'],
    isCore: false,
    isBeta: false,
    isDeprecated: false,
  },

  /**
   * Supplier Management Module
   *
   * Manages vendor relationships, contracts, and supplier approvals.
   */
  suppliers: {
    id: 'suppliers',
    name: 'Supplier Management',
    description: 'Manage vendors, contracts, and supplier relationships',
    icon: Truck,
    iconName: 'Truck',
    category: 'operations',
    tier: 'FREE',
    isFree: true,
    requires: [],
    requiredBy: [], // Auto-computed
    adminRoutes: ['/admin/suppliers'],
    employeeRoutes: ['/employee/suppliers'],
    apiRoutes: ['/api/suppliers'],
    isCore: false,
    isBeta: false,
    isDeprecated: false,
  },

  /**
   * Spend Requests Module
   *
   * Internal spending approval workflow for purchases and expenses.
   */
  'spend-requests': {
    id: 'spend-requests',
    name: 'Spend Requests',
    description: 'Internal spending approval workflow',
    icon: ShoppingCart,
    iconName: 'ShoppingCart',
    category: 'operations',
    tier: 'FREE',
    isFree: true,
    requires: ['employees'], // Requests submitted/approved by employees
    requiredBy: [], // Auto-computed
    adminRoutes: ['/admin/spend-requests'],
    employeeRoutes: ['/employee/spend-requests'],
    apiRoutes: ['/api/spend-requests'],
    isCore: false,
    isBeta: false,
    isDeprecated: false,
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // HR MODULES
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Employee Management Module (CORE)
   *
   * Manages employee profiles, departments, and organizational structure.
   * This is a CORE module - it cannot be uninstalled and is always enabled.
   * Other HR modules (leave, payroll) depend on this module.
   *
   * @security Core modules bypass uninstall checks
   */
  employees: {
    id: 'employees',
    name: 'Employee Management',
    description: 'Manage employee profiles, departments, and organizational structure',
    icon: Users,
    iconName: 'Users',
    category: 'hr',
    tier: 'FREE',
    isFree: true,
    requires: [],
    requiredBy: [], // Auto-computed: ['leave', 'payroll']
    adminRoutes: ['/admin/employees'],
    employeeRoutes: [], // Note: /profile is accessible to all users regardless of module
    apiRoutes: ['/api/employees'],
    isCore: true, // CORE MODULE - always enabled, cannot be uninstalled
    isBeta: false,
    isDeprecated: false,
  },

  /**
   * Leave Management Module
   *
   * Manages leave requests, balances, approvals, and team calendar.
   * Depends on the employees module for employee data.
   */
  leave: {
    id: 'leave',
    name: 'Leave Management',
    description: 'Leave requests, balances, approvals, and team calendar',
    icon: Calendar,
    iconName: 'Calendar',
    category: 'hr',
    tier: 'FREE',
    isFree: true,
    requires: ['employees'], // Depends on employee profiles
    requiredBy: [], // Auto-computed
    adminRoutes: ['/admin/leave'],
    employeeRoutes: ['/employee/leave'],
    apiRoutes: ['/api/leave'],
    isCore: false,
    isBeta: false,
    isDeprecated: false,
  },

  /**
   * Payroll Processing Module
   *
   * Manages salary structures, payslips, loans, WPS files, and gratuity calculations.
   * Depends on the employees module for employee data and salary assignments.
   */
  payroll: {
    id: 'payroll',
    name: 'Payroll Processing',
    description: 'Salary structures, payslips, loans, and gratuity calculations',
    icon: DollarSign,
    iconName: 'DollarSign',
    category: 'hr',
    tier: 'FREE',
    isFree: true,
    requires: ['employees'], // Depends on employee profiles
    requiredBy: [], // Auto-computed
    adminRoutes: ['/admin/payroll'],
    employeeRoutes: ['/employee/payroll'],
    apiRoutes: ['/api/payroll', '/api/settings/payroll-percentages'],
    isCore: false,
    isBeta: false,
    isDeprecated: false,
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // SYSTEM MODULES
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Company Documents Module
   *
   * Tracks company licenses, certifications, and compliance documents.
   */
  documents: {
    id: 'documents',
    name: 'Company Documents',
    description: 'Track licenses, certifications, and compliance documents',
    icon: FileCheck,
    iconName: 'FileCheck',
    category: 'system',
    tier: 'FREE',
    isFree: true,
    requires: [],
    requiredBy: [], // Auto-computed
    adminRoutes: ['/admin/company-documents'],
    employeeRoutes: [],
    apiRoutes: ['/api/company-documents', '/api/company-document-types'],
    isCore: false,
    isBeta: false,
    isDeprecated: false,
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// AUTO-COMPUTE REQUIRED_BY FROM REQUIRES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Automatically compute requiredBy fields from requires fields.
 * This ensures consistency and prevents manual sync errors.
 *
 * The algorithm:
 * 1. Clear all requiredBy arrays
 * 2. For each module, add its ID to the requiredBy array of its dependencies
 *
 * @example
 * leave.requires = ['employees']
 * → employees.requiredBy = ['leave']
 *
 * @note Runs once when the module is loaded (IIFE)
 */
(function computeRequiredBy() {
  // First, clear all requiredBy arrays to recompute from scratch
  for (const mod of Object.values(MODULE_REGISTRY)) {
    if (mod) {
      mod.requiredBy = [];
    }
  }

  // Then, populate requiredBy based on requires
  for (const mod of Object.values(MODULE_REGISTRY)) {
    if (!mod) continue;
    for (const reqId of mod.requires) {
      const requiredModule = MODULE_REGISTRY[reqId as ModuleId];
      if (requiredModule && !requiredModule.requiredBy.includes(mod.id)) {
        requiredModule.requiredBy.push(mod.id);
      }
    }
  }
})();

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * All valid module IDs as an array.
 * Used for validation and iteration.
 */
export const ALL_MODULE_IDS: readonly ModuleId[] = Object.keys(MODULE_REGISTRY) as ModuleId[];

/**
 * Check if a string is a valid module ID.
 *
 * @param moduleId - The string to check
 * @returns true if the string is a valid module ID
 *
 * @security Use this to validate user-provided module IDs before processing
 *
 * @example
 * if (!isValidModuleId(userInput)) {
 *   throw new Error('Invalid module ID');
 * }
 */
export function isValidModuleId(moduleId: string): moduleId is ModuleId {
  return moduleId in MODULE_REGISTRY;
}

/**
 * Get a module definition by ID.
 *
 * @param moduleId - The module identifier
 * @returns Module definition if found, undefined otherwise
 *
 * @example
 * const leaveModule = getModule('leave');
 * if (leaveModule) {
 *   console.log(leaveModule.name); // "Leave Management"
 * }
 */
export function getModule(moduleId: string): ModuleDefinition | undefined {
  if (!isValidModuleId(moduleId)) {
    return undefined;
  }
  return MODULE_REGISTRY[moduleId];
}

/**
 * Get all module IDs.
 *
 * @returns Array of all valid module identifiers
 */
export function getAllModuleIds(): ModuleId[] {
  return Object.keys(MODULE_REGISTRY) as ModuleId[];
}

/**
 * Get all module definitions.
 *
 * @returns Array of all module definitions
 */
export function getAllModules(): ModuleDefinition[] {
  return Object.values(MODULE_REGISTRY).filter((m): m is ModuleDefinition => m !== undefined);
}

/**
 * Get modules by category.
 *
 * @param category - The module category to filter by
 * @returns Array of modules in the specified category
 *
 * @example
 * const hrModules = getModulesByCategory('hr');
 * // Returns: [employees, leave, payroll]
 */
export function getModulesByCategory(category: ModuleCategory): ModuleDefinition[] {
  return Object.values(MODULE_REGISTRY).filter((m): m is ModuleDefinition => m !== undefined && m.category === category);
}

/**
 * Get modules available at a specific tier.
 *
 * @note All modules are currently available - tier restrictions disabled
 * @param _tier - Subscription tier (ignored)
 * @returns All modules (tier restrictions not enforced)
 */
export function getModulesForTier(_tier: SubscriptionTier): ModuleDefinition[] {
  return Object.values(MODULE_REGISTRY).filter((m): m is ModuleDefinition => m !== undefined);
}

/**
 * Get free modules (available on free tier).
 *
 * @returns Modules with isFree: true
 */
export function getFreeModules(): ModuleDefinition[] {
  return Object.values(MODULE_REGISTRY).filter((m): m is ModuleDefinition => m !== undefined && m.isFree);
}

/**
 * Get core modules that cannot be uninstalled.
 *
 * @returns Modules with isCore: true (e.g., employees)
 */
export function getCoreModules(): ModuleDefinition[] {
  return Object.values(MODULE_REGISTRY).filter((m): m is ModuleDefinition => m !== undefined && m.isCore);
}

/**
 * Get default enabled modules for new organizations.
 * These modules are automatically enabled when a new organization is created.
 *
 * @returns Array of module IDs to enable by default
 */
export function getDefaultEnabledModules(): ModuleId[] {
  return ['employees', 'assets', 'subscriptions', 'suppliers'];
}

/**
 * Check if a module requires a specific tier.
 *
 * @note Always returns null - tier restrictions disabled
 * @param _moduleId - The module to check
 * @returns null (tier restrictions not enforced)
 */
export function getRequiredTier(_moduleId: string): SubscriptionTier | null {
  return null;
}

/**
 * Get module dependencies (what modules must be installed first).
 *
 * @param moduleId - The module to check
 * @returns Array of required module IDs, empty if module not found
 *
 * @example
 * getModuleDependencies('leave'); // ['employees']
 * getModuleDependencies('assets'); // []
 */
export function getModuleDependencies(moduleId: string): ModuleId[] {
  const mod = MODULE_REGISTRY[moduleId as ModuleId];
  return mod ? [...mod.requires] : [];
}

/**
 * Get modules that depend on this module.
 *
 * @param moduleId - The module to check
 * @returns Array of dependent module IDs
 *
 * @example
 * getModuleDependents('employees'); // ['leave', 'payroll']
 */
export function getModuleDependents(moduleId: string): ModuleId[] {
  return Object.values(MODULE_REGISTRY)
    .filter((m): m is ModuleDefinition => m !== undefined && m.requires.includes(moduleId as ModuleId))
    .map(m => m.id);
}

/**
 * Check if a module can be uninstalled.
 *
 * A module cannot be uninstalled if:
 * 1. It doesn't exist
 * 2. It's a core module (isCore: true)
 * 3. Other enabled modules depend on it
 *
 * @param moduleId - The module to check
 * @param enabledModules - Currently enabled module IDs
 * @returns Error message if cannot uninstall, null if can uninstall
 *
 * @security Core modules bypass this check entirely - they're always enabled
 *
 * @example
 * const error = canUninstallModule('employees', ['employees', 'leave']);
 * // Returns: "Employee Management is a core module and cannot be uninstalled"
 */
export function canUninstallModule(
  moduleId: string,
  enabledModules: string[]
): string | null {
  const mod = MODULE_REGISTRY[moduleId as ModuleId];

  if (!mod) {
    return `Module "${moduleId}" not found`;
  }

  if (mod.isCore) {
    return `"${mod.name}" is a core module and cannot be uninstalled`;
  }

  // Check if any enabled module depends on this one
  const dependents = getModuleDependents(moduleId);
  const enabledDependents = dependents.filter(d => enabledModules.includes(d));

  if (enabledDependents.length > 0) {
    const dependentNames = enabledDependents
      .map(d => MODULE_REGISTRY[d]?.name || d)
      .join(', ');
    return `Cannot uninstall "${mod.name}". The following modules depend on it: ${dependentNames}. Uninstall them first.`;
  }

  return null;
}

/**
 * Check if a module can be installed.
 *
 * A module cannot be installed if:
 * 1. It doesn't exist
 * 2. It's already installed
 * 3. Its dependencies are not installed
 *
 * @note Tier restrictions are currently disabled - all modules available
 *
 * @param moduleId - The module to install
 * @param enabledModules - Currently enabled module IDs
 * @param _currentTier - Subscription tier (ignored - tier restrictions disabled)
 * @returns Error message if cannot install, null if can install
 *
 * @security Dependencies are validated against the registry to prevent injection
 *
 * @example
 * const error = canInstallModule('leave', ['assets'], 'FREE');
 * // Returns: "Leave Management requires: Employee Management"
 */
export function canInstallModule(
  moduleId: string,
  enabledModules: string[],
  _currentTier: SubscriptionTier
): string | null {
  const mod = MODULE_REGISTRY[moduleId as ModuleId];

  if (!mod) {
    return `Module "${moduleId}" not found`;
  }

  if (enabledModules.includes(moduleId)) {
    return `"${mod.name}" is already installed`;
  }

  // Validate that all dependencies exist in the registry (security check)
  const invalidDeps = mod.requires.filter(dep => !MODULE_REGISTRY[dep]);
  if (invalidDeps.length > 0) {
    // Log for monitoring - this indicates a configuration error
    console.error(`[SECURITY] Module "${moduleId}" has invalid dependencies: ${invalidDeps.join(', ')}`);
    return `"${mod.name}" has invalid configuration. Please contact support.`;
  }

  // Check dependencies only (tier check disabled)
  const missingDeps = mod.requires.filter(dep => !enabledModules.includes(dep));

  if (missingDeps.length > 0) {
    const depNames = missingDeps
      .map(d => MODULE_REGISTRY[d]?.name || d)
      .join(', ');
    return `"${mod.name}" requires the following modules to be installed first: ${depNames}`;
  }

  return null;
}

/**
 * Find which module controls a specific route.
 * Used by middleware for route-based access control.
 *
 * @param route - The request pathname (e.g., "/admin/assets/123")
 * @returns Module ID if route is protected, null otherwise
 *
 * @security Route matching is case-insensitive to prevent bypass attacks
 *
 * @example
 * getModuleForRoute('/admin/assets'); // 'assets'
 * getModuleForRoute('/admin/assets/123'); // 'assets'
 * getModuleForRoute('/admin/settings'); // null (not protected by any module)
 */
export function getModuleForRoute(route: string): ModuleId | null {
  // Normalize route for case-insensitive matching
  const normalizedRoute = route.toLowerCase();

  for (const mod of Object.values(MODULE_REGISTRY)) {
    if (!mod) continue;

    const allRoutes = [
      ...mod.adminRoutes,
      ...mod.employeeRoutes,
      ...mod.apiRoutes,
    ];

    for (const modRoute of allRoutes) {
      const normalizedModRoute = modRoute.toLowerCase();
      // Exact match or prefix match with path separator
      if (normalizedRoute === normalizedModRoute || normalizedRoute.startsWith(normalizedModRoute + '/')) {
        return mod.id;
      }
    }
  }

  return null;
}

/**
 * Validate a list of module IDs and return only valid ones.
 *
 * @param moduleIds - Array of strings to validate
 * @returns Array of valid module IDs (invalid ones filtered out)
 *
 * @security Use this to sanitize user-provided module lists
 *
 * @example
 * validateModuleIds(['assets', 'invalid', 'leave']);
 * // Returns: ['assets', 'leave']
 */
export function validateModuleIds(moduleIds: string[]): ModuleId[] {
  return moduleIds.filter(isValidModuleId);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SERIALIZABLE MODULE INFO (for client-side use)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Serializable version of ModuleDefinition for client-side use.
 * Excludes LucideIcon which cannot be serialized across the wire.
 */
export interface SerializableModuleInfo {
  id: ModuleId;
  name: string;
  description: string;
  iconName: string;
  category: ModuleCategory;
  tier: SubscriptionTier;
  isFree: boolean;
  requires: ModuleId[];
  requiredBy: ModuleId[];
  isCore: boolean;
  isBeta: boolean;
}

/**
 * Get serializable module info for client-side rendering.
 * Excludes LucideIcon (React component) which cannot be serialized.
 *
 * @returns Array of serializable module info objects
 *
 * @example
 * // In a Server Component
 * const modules = getSerializableModules();
 * return <ModuleGrid modules={modules} />
 */
export function getSerializableModules(): SerializableModuleInfo[] {
  return Object.values(MODULE_REGISTRY)
    .filter((m): m is ModuleDefinition => m !== undefined)
    .map(m => ({
      id: m.id,
      name: m.name,
      description: m.description,
      iconName: m.iconName,
      category: m.category,
      tier: m.tier,
      isFree: m.isFree,
      requires: [...m.requires],
      requiredBy: [...m.requiredBy],
      isCore: m.isCore,
      isBeta: m.isBeta,
    }));
}