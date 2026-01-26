/**
 * @file feature-flags.ts
 * @description Feature flags and subscription tier configuration. Defines available modules
 *              and features per subscription tier, and provides utilities to check access
 *              and determine upgrade requirements.
 * @module multi-tenant
 *
 * @note TIER RESTRICTIONS CURRENTLY DISABLED
 * All features and modules are available to all organizations.
 * This will be re-implemented when billing is ready.
 *
 * @security FEATURE FLAG SECURITY CONSIDERATIONS (for when billing is enabled):
 * - Feature access MUST be validated server-side (API handlers, middleware)
 * - Client-side checks are for UX only, not security
 * - Module access is enforced in middleware (src/middleware.ts)
 * - Feature flags should be cached but refreshed on session changes
 * - Super admin can override for testing (audit logged)
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
// Note: 'employees' removed - employee features are now implicit via TeamMember.isEmployee flag
const ALL_MODULES = [
  'assets',
  'subscriptions',
  'suppliers',
  'leave',
  'payroll',
  'spend-requests',
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

export function hasTierModuleAccess(_tier: SubscriptionTier, _module: string): boolean {
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
  leave: { name: 'Leave Management', description: 'Leave requests, balances, and approvals', icon: 'Calendar' },
  payroll: { name: 'Payroll Processing', description: 'Salary structures, payslips, and loans', icon: 'DollarSign' },
  'spend-requests': { name: 'Spend Requests', description: 'Internal spending approval workflow', icon: 'ShoppingCart' },
  documents: { name: 'Company Documents', description: 'Track licenses, certifications, and compliance', icon: 'FileCheck' },
};

/*
 * ==========================================
 *REVIEW SUMMARY
 * ==========================================
 *
 * SECURITY FINDINGS:
 * - [NOTE] Tier restrictions intentionally disabled (all return true)
 * - [VERIFIED] Structure ready for server-side enforcement when billing enabled
 * - [VERIFIED] Module access checked in middleware (src/middleware.ts)
 *
 * CHANGES MADE:
 * - Added security documentation for when billing is enabled
 * - No functional changes (restrictions intentionally disabled)
 *
 * REMAINING CONCERNS:
 * - When billing is enabled, ensure:
 *   - Feature checks are server-side (API handlers, middleware)
 *   - Client-side checks are for UX only
 *   - Super admin overrides are audit logged
 *   - Feature flag cache is invalidated on subscription changes
 *
 * REQUIRED TESTS:
 * - [EXISTING] tests/unit/multi-tenant/feature-flags.test.ts (all passing)
 *
 * INTEGRATION NOTES:
 * - Module access enforced in src/middleware.ts via checkRouteModuleAccess()
 * - Handler.ts uses requireModule option for API-level checks
 * - UI components use these for conditional rendering (UX only)
 *
 * REVIEWER CONFIDENCE: HIGH
 * STATUS: Ready for production (restrictions disabled by design)
 */
