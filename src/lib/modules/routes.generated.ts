/**
 * AUTO-GENERATED FILE - DO NOT EDIT MANUALLY
 * Generated from src/lib/modules/registry.ts by scripts/generate-routes.ts
 * Run 'npm run generate:routes' to regenerate
 *
 * @generated
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Valid module identifiers.
 * Generated from MODULE_REGISTRY keys.
 */
export type ModuleId =
  | 'assets'
  | 'subscriptions'
  | 'suppliers'
  | 'spend-requests'
  | 'employees'
  | 'leave'
  | 'payroll'
  | 'documents';

// ═══════════════════════════════════════════════════════════════════════════════
// CORE MODULES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Core modules are always enabled and cannot be uninstalled.
 * Generated from modules with isCore: true in registry.ts.
 *
 * @security These modules bypass the "module not installed" check
 */
export const CORE_MODULES: ReadonlySet<string> = new Set(['employees']);

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE ROUTE MAPPING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Route prefix to module mapping.
 * Generated from adminRoutes, employeeRoutes, and apiRoutes in registry.ts.
 *
 * @security All routes protected by a module MUST be listed here
 * @security Missing routes will be accessible without the module installed
 */
export const MODULE_ROUTE_MAP: ReadonlyArray<{ prefix: string; moduleId: ModuleId }> = [
  // ASSET MANAGEMENT
  { prefix: '/admin/asset-requests', moduleId: 'assets' },
  { prefix: '/admin/assets', moduleId: 'assets' },
  { prefix: '/employee/asset-requests', moduleId: 'assets' },
  { prefix: '/employee/assets', moduleId: 'assets' },
  { prefix: '/employee/my-assets', moduleId: 'assets' },
  { prefix: '/api/asset-categories', moduleId: 'assets' },
  { prefix: '/api/asset-requests', moduleId: 'assets' },
  { prefix: '/api/asset-type-mappings', moduleId: 'assets' },
  { prefix: '/api/asset-types', moduleId: 'assets' },
  { prefix: '/api/assets', moduleId: 'assets' },

  // SUBSCRIPTION TRACKING
  { prefix: '/admin/subscriptions', moduleId: 'subscriptions' },
  { prefix: '/employee/subscriptions', moduleId: 'subscriptions' },
  { prefix: '/api/subscriptions', moduleId: 'subscriptions' },

  // SUPPLIER MANAGEMENT
  { prefix: '/admin/suppliers', moduleId: 'suppliers' },
  { prefix: '/employee/suppliers', moduleId: 'suppliers' },
  { prefix: '/api/suppliers', moduleId: 'suppliers' },

  // SPEND REQUESTS
  { prefix: '/admin/spend-requests', moduleId: 'spend-requests' },
  { prefix: '/employee/spend-requests', moduleId: 'spend-requests' },
  { prefix: '/api/spend-requests', moduleId: 'spend-requests' },

  // EMPLOYEE MANAGEMENT (CORE - always enabled)
  { prefix: '/admin/employees', moduleId: 'employees' },
  { prefix: '/api/employees', moduleId: 'employees' },

  // LEAVE MANAGEMENT
  { prefix: '/admin/leave', moduleId: 'leave' },
  { prefix: '/employee/leave', moduleId: 'leave' },
  { prefix: '/api/leave', moduleId: 'leave' },

  // PAYROLL PROCESSING
  { prefix: '/admin/payroll', moduleId: 'payroll' },
  { prefix: '/employee/payroll', moduleId: 'payroll' },
  { prefix: '/api/payroll', moduleId: 'payroll' },
  { prefix: '/api/settings/payroll-percentages', moduleId: 'payroll' },

  // COMPANY DOCUMENTS
  { prefix: '/admin/company-documents', moduleId: 'documents' },
  { prefix: '/api/company-document-types', moduleId: 'documents' },
  { prefix: '/api/company-documents', moduleId: 'documents' },
];
