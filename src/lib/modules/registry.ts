/**
 * Central Module Registry
 *
 * Single source of truth for all module definitions in Durj.
 * This replaces scattered module definitions across the codebase.
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
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type ModuleCategory = 'operations' | 'hr' | 'system';

export interface ModuleDefinition {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  iconName: string; // String version for serialization
  category: ModuleCategory;

  // Access Control
  tier: SubscriptionTier;
  isFree: boolean; // Always available regardless of tier

  // Dependencies
  requires: string[];  // Module IDs this depends on
  requiredBy: string[]; // Modules that depend on this (computed)

  // Routes (for middleware protection)
  adminRoutes: string[]; // Admin routes this module controls
  employeeRoutes: string[]; // Employee routes this module controls
  apiRoutes: string[]; // API routes this module controls

  // Status
  isCore: boolean; // Can't be uninstalled
  isBeta: boolean;
  isDeprecated: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

export const MODULE_REGISTRY: Record<string, ModuleDefinition> = {
  // ─────────────────────────────────────────────────────────────────────────────
  // DEFAULT MODULES (Enabled by default for new organizations)
  // ─────────────────────────────────────────────────────────────────────────────
  assets: {
    id: 'assets',
    name: 'Asset Management',
    description: 'Track company assets, assignments, maintenance & warranties',
    icon: Package,
    iconName: 'Package',
    category: 'operations',
    tier: 'FREE',
    isFree: true,
    requires: [],
    requiredBy: [],
    adminRoutes: ['/admin/assets', '/admin/asset-requests'],
    employeeRoutes: ['/employee/assets', '/employee/my-assets', '/employee/asset-requests'],
    apiRoutes: ['/api/assets', '/api/asset-requests'],
    isCore: false,
    isBeta: false,
    isDeprecated: false,
  },

  subscriptions: {
    id: 'subscriptions',
    name: 'Subscription Tracking',
    description: 'Monitor SaaS services, renewals, and recurring costs',
    icon: CreditCard,
    iconName: 'CreditCard',
    category: 'operations',
    tier: 'FREE',
    isFree: true,
    requires: [],
    requiredBy: [],
    adminRoutes: ['/admin/subscriptions'],
    employeeRoutes: ['/employee/subscriptions'],
    apiRoutes: ['/api/subscriptions'],
    isCore: false,
    isBeta: false,
    isDeprecated: false,
  },

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
    requiredBy: [],
    adminRoutes: ['/admin/suppliers'],
    employeeRoutes: ['/employee/suppliers'],
    apiRoutes: ['/api/suppliers'],
    isCore: false,
    isBeta: false,
    isDeprecated: false,
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // HR MODULES (Add-on modules for HR features)
  // ─────────────────────────────────────────────────────────────────────────────
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
    requiredBy: ['leave', 'payroll'],
    adminRoutes: ['/admin/employees'],
    employeeRoutes: [], // Note: /profile is accessible to all users, HR content is conditionally shown
    apiRoutes: ['/api/employees'],
    isCore: true, // Core module - always enabled, can't be uninstalled
    isBeta: false,
    isDeprecated: false,
  },

  leave: {
    id: 'leave',
    name: 'Leave Management',
    description: 'Leave requests, balances, approvals, and team calendar',
    icon: Calendar,
    iconName: 'Calendar',
    category: 'hr',
    tier: 'FREE',
    isFree: true,
    requires: [], // employees is a core module, always enabled
    requiredBy: [],
    adminRoutes: ['/admin/leave'],
    employeeRoutes: ['/employee/leave'],
    apiRoutes: ['/api/leave'],
    isCore: false,
    isBeta: false,
    isDeprecated: false,
  },

  payroll: {
    id: 'payroll',
    name: 'Payroll Processing',
    description: 'Salary structures, payslips, loans, and gratuity calculations',
    icon: DollarSign,
    iconName: 'DollarSign',
    category: 'hr',
    tier: 'FREE',
    isFree: true,
    requires: [], // employees is a core module, always enabled
    requiredBy: [],
    adminRoutes: ['/admin/payroll'],
    employeeRoutes: ['/employee/payroll'],
    apiRoutes: ['/api/payroll'],
    isCore: false,
    isBeta: false,
    isDeprecated: false,
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // SPEND REQUEST MODULE
  // ─────────────────────────────────────────────────────────────────────────────
  'spend-requests': {
    id: 'spend-requests',
    name: 'Spend Requests',
    description: 'Internal spending approval workflow',
    icon: ShoppingCart,
    iconName: 'ShoppingCart',
    category: 'operations',
    tier: 'FREE',
    isFree: true,
    requires: [],
    requiredBy: [],
    adminRoutes: ['/admin/spend-requests'],
    employeeRoutes: ['/employee/spend-requests'],
    apiRoutes: ['/api/spend-requests'],
    isCore: false,
    isBeta: false,
    isDeprecated: false,
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // SYSTEM MODULES (All FREE for now - pricing tiers to be defined later)
  // ─────────────────────────────────────────────────────────────────────────────
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
    requiredBy: [],
    adminRoutes: ['/admin/company-documents'],
    employeeRoutes: [],
    apiRoutes: ['/api/company-documents'],
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
 * Runs once when the module is loaded.
 */
(function computeRequiredBy() {
  // First, clear all requiredBy arrays to recompute from scratch
  for (const mod of Object.values(MODULE_REGISTRY)) {
    mod.requiredBy = [];
  }

  // Then, populate requiredBy based on requires
  for (const mod of Object.values(MODULE_REGISTRY)) {
    for (const reqId of mod.requires) {
      const requiredModule = MODULE_REGISTRY[reqId];
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
 * Get a module definition by ID
 */
export function getModule(moduleId: string): ModuleDefinition | undefined {
  return MODULE_REGISTRY[moduleId];
}

/**
 * Get all module IDs
 */
export function getAllModuleIds(): string[] {
  return Object.keys(MODULE_REGISTRY);
}

/**
 * Get all modules
 */
export function getAllModules(): ModuleDefinition[] {
  return Object.values(MODULE_REGISTRY);
}

/**
 * Get modules by category
 */
export function getModulesByCategory(category: ModuleCategory): ModuleDefinition[] {
  return Object.values(MODULE_REGISTRY).filter(m => m.category === category);
}

/**
 * Get modules available at a specific tier
 * NOTE: All modules are available - tier restrictions disabled
 */
export function getModulesForTier(_tier: SubscriptionTier): ModuleDefinition[] {
  return Object.values(MODULE_REGISTRY);
}

/**
 * Get free modules (always available)
 */
export function getFreeModules(): ModuleDefinition[] {
  return Object.values(MODULE_REGISTRY).filter(m => m.isFree);
}

/**
 * Get core modules (can't be uninstalled)
 */
export function getCoreModules(): ModuleDefinition[] {
  return Object.values(MODULE_REGISTRY).filter(m => m.isCore);
}

/**
 * Get default enabled modules for new organizations
 */
export function getDefaultEnabledModules(): string[] {
  return ['employees', 'assets', 'subscriptions', 'suppliers'];
}

/**
 * Check if a module requires a specific tier
 * NOTE: Always returns null - tier restrictions disabled
 */
export function getRequiredTier(_moduleId: string): SubscriptionTier | null {
  return null;
}

/**
 * Get module dependencies (what modules must be installed first)
 */
export function getModuleDependencies(moduleId: string): string[] {
  const mod = MODULE_REGISTRY[moduleId];
  return mod ? mod.requires : [];
}

/**
 * Get modules that depend on this module
 */
export function getModuleDependents(moduleId: string): string[] {
  return Object.values(MODULE_REGISTRY)
    .filter(m => m.requires.includes(moduleId))
    .map(m => m.id);
}

/**
 * Check if a module can be uninstalled
 * Returns an error message if not, or null if it can be uninstalled
 */
export function canUninstallModule(
  moduleId: string,
  enabledModules: string[]
): string | null {
  const mod = MODULE_REGISTRY[moduleId];

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
 * Check if a module can be installed
 * Returns an error message if not, or null if it can be installed
 * NOTE: Tier restrictions disabled - only checks dependencies
 */
export function canInstallModule(
  moduleId: string,
  enabledModules: string[],
  _currentTier: SubscriptionTier
): string | null {
  const mod = MODULE_REGISTRY[moduleId];

  if (!mod) {
    return `Module "${moduleId}" not found`;
  }

  if (enabledModules.includes(moduleId)) {
    return `"${mod.name}" is already installed`;
  }

  // Validate that all dependencies exist in the registry
  const invalidDeps = mod.requires.filter(dep => !MODULE_REGISTRY[dep]);
  if (invalidDeps.length > 0) {
    console.error(`Module "${moduleId}" has invalid dependencies: ${invalidDeps.join(', ')}`);
    return `"${mod.name}" has invalid configuration. Please contact support.`;
  }

  // Check dependencies only (tier check removed)
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
 * Find which module controls a specific route
 */
export function getModuleForRoute(route: string): string | null {
  for (const mod of Object.values(MODULE_REGISTRY)) {
    const allRoutes = [
      ...mod.adminRoutes,
      ...mod.employeeRoutes,
      ...mod.apiRoutes,
    ];

    for (const modRoute of allRoutes) {
      // Exact match or prefix match
      if (route === modRoute || route.startsWith(modRoute + '/')) {
        return mod.id;
      }
    }
  }

  return null;
}

/**
 * Validate a list of module IDs
 */
export function validateModuleIds(moduleIds: string[]): string[] {
  const validModules = getAllModuleIds();
  return moduleIds.filter(id => validModules.includes(id));
}

// ═══════════════════════════════════════════════════════════════════════════════
// SERIALIZABLE MODULE INFO (for client-side use)
// ═══════════════════════════════════════════════════════════════════════════════

export interface SerializableModuleInfo {
  id: string;
  name: string;
  description: string;
  iconName: string;
  category: ModuleCategory;
  tier: SubscriptionTier;
  isFree: boolean;
  requires: string[];
  requiredBy: string[];
  isCore: boolean;
  isBeta: boolean;
}

/**
 * Get serializable module info (without LucideIcon which can't be serialized)
 */
export function getSerializableModules(): SerializableModuleInfo[] {
  return Object.values(MODULE_REGISTRY).map(m => ({
    id: m.id,
    name: m.name,
    description: m.description,
    iconName: m.iconName,
    category: m.category,
    tier: m.tier,
    isFree: m.isFree,
    requires: m.requires,
    requiredBy: m.requiredBy,
    isCore: m.isCore,
    isBeta: m.isBeta,
  }));
}
