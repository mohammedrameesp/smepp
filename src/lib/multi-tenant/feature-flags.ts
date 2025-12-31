/**
 * @file feature-flags.ts
 * @description Feature flags and subscription tier configuration. Defines available modules
 *              and features per subscription tier, and provides utilities to check access
 *              and determine upgrade requirements.
 * @module multi-tenant
 *
 * @note Tier restrictions are currently disabled. All features and modules are available
 *       to all organizations. This will be re-implemented when billing is ready.
 */

import { SubscriptionTier } from '@prisma/client';

// ═══════════════════════════════════════════════════════════════════════════════
// TIER CONFIGURATION (For pricing page display only)
// ═══════════════════════════════════════════════════════════════════════════════

export interface TierConfig {
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  maxUsers: number;
  maxAssets: number;
  maxSubscriptions: number;
  maxSuppliers: number;
  modules: string[];
  features: string[];
}

// All modules available (use hyphens for consistency)
const ALL_MODULES = [
  'assets',
  'subscriptions',
  'suppliers',
  'employees',
  'leave',
  'payroll',
  'purchase-requests',
  'approvals',
  'projects',
  'documents',
];

// All features available
const ALL_FEATURES = [
  'basic_reports',
  'advanced_reports',
  'in_app_notifications',
  'browser_notifications',
  'email_notifications',
  'whatsapp_notifications',
  'sms_notifications',
  'audit_logs',
  'subdomain',
  'custom_domain',
  'google_sso',
  'microsoft_sso',
  'custom_branding',
  'api_access',
  'priority_support',
  'file_storage_10gb',
];

export const TIER_CONFIG: Record<SubscriptionTier, TierConfig> = {
  FREE: {
    name: 'Free',
    description: 'All features included',
    monthlyPrice: 0,
    yearlyPrice: 0,
    maxUsers: -1,
    maxAssets: -1,
    maxSubscriptions: -1,
    maxSuppliers: -1,
    modules: ALL_MODULES,
    features: ALL_FEATURES,
  },
  PLUS: {
    name: 'Plus',
    description: 'Priority support & advanced features',
    monthlyPrice: 149,
    yearlyPrice: 1490,
    maxUsers: -1,
    maxAssets: -1,
    maxSubscriptions: -1,
    maxSuppliers: -1,
    modules: ALL_MODULES,
    features: ALL_FEATURES,
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// FEATURE CHECKING UTILITIES - All return true/null (tier restrictions disabled)
// ═══════════════════════════════════════════════════════════════════════════════

export function hasModuleAccess(_tier: SubscriptionTier, _module: string): boolean {
  return true;
}

export function hasFeatureAccess(_tier: SubscriptionTier, _feature: string): boolean {
  return true;
}

export function getTierConfig(tier: SubscriptionTier): TierConfig {
  return TIER_CONFIG[tier] || TIER_CONFIG.FREE;
}

export function getAvailableModules(_tier: SubscriptionTier): string[] {
  return ALL_MODULES;
}

export function getAvailableFeatures(_tier: SubscriptionTier): string[] {
  return ALL_FEATURES;
}

export function needsUpgradeForModule(_currentTier: SubscriptionTier, _module: string): SubscriptionTier | null {
  return null;
}

export function needsUpgradeForFeature(_currentTier: SubscriptionTier, _feature: string): SubscriptionTier | null {
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE METADATA
// ═══════════════════════════════════════════════════════════════════════════════

export const MODULE_METADATA: Record<string, { name: string; description: string; icon: string }> = {
  assets: { name: 'Asset Management', description: 'Track hardware, equipment, warranties, and assignments', icon: 'Package' },
  subscriptions: { name: 'Subscription Tracking', description: 'Monitor SaaS services, renewals, and costs', icon: 'CreditCard' },
  suppliers: { name: 'Supplier Management', description: 'Manage vendors and supplier relationships', icon: 'Truck' },
  employees: { name: 'Employee Directory', description: 'Employee profiles and HR information', icon: 'Users' },
  leave: { name: 'Leave Management', description: 'Leave requests, balances, and approvals', icon: 'Calendar' },
  payroll: { name: 'Payroll Processing', description: 'Salary structures, payslips, and loans', icon: 'DollarSign' },
  'purchase-requests': { name: 'Purchase Requests', description: 'Internal procurement workflow', icon: 'ShoppingCart' },
  approvals: { name: 'Approval Workflows', description: 'Multi-level approval chains', icon: 'CheckSquare' },
  projects: { name: 'Project Management', description: 'Track projects and assign resources', icon: 'FolderKanban' },
  documents: { name: 'Company Documents', description: 'Track licenses, certifications, and compliance', icon: 'FileCheck' },
};
