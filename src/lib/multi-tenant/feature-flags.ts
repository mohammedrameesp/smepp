/**
 * Feature Flags & Tier Configuration
 *
 * Defines what features are available at each subscription tier.
 */

import { SubscriptionTier } from '@prisma/client';

// ═══════════════════════════════════════════════════════════════════════════════
// TIER CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

export interface TierConfig {
  name: string;
  description: string;
  monthlyPrice: number; // USD
  yearlyPrice: number;  // USD (annual, typically 2 months free)
  maxUsers: number;     // -1 for unlimited
  maxAssets: number;    // -1 for unlimited
  maxSubscriptions: number;
  maxSuppliers: number;
  modules: string[];
  features: string[];
}

export const TIER_CONFIG: Record<SubscriptionTier, TierConfig> = {
  FREE: {
    name: 'Free',
    description: 'Perfect for trying out SME++',
    monthlyPrice: 0,
    yearlyPrice: 0,
    maxUsers: 5,
    maxAssets: 50,
    maxSubscriptions: 20,
    maxSuppliers: 10,
    modules: [
      'assets',
      'subscriptions',
      'suppliers',
    ],
    features: [
      'basic_reports',
      'email_notifications',
    ],
  },

  STARTER: {
    name: 'Starter',
    description: 'For growing teams',
    monthlyPrice: 29,
    yearlyPrice: 290, // ~$24/mo
    maxUsers: 15,
    maxAssets: 200,
    maxSubscriptions: 100,
    maxSuppliers: 50,
    modules: [
      'assets',
      'subscriptions',
      'suppliers',
      'employees',
      'leave',
    ],
    features: [
      'basic_reports',
      'advanced_reports',
      'email_notifications',
      'document_storage',
      'leave_management',
    ],
  },

  PROFESSIONAL: {
    name: 'Professional',
    description: 'For established businesses',
    monthlyPrice: 99,
    yearlyPrice: 990, // ~$82/mo
    maxUsers: 50,
    maxAssets: 1000,
    maxSubscriptions: 500,
    maxSuppliers: 200,
    modules: [
      'assets',
      'subscriptions',
      'suppliers',
      'employees',
      'leave',
      'payroll',
      'purchase_requests',
      'approvals',
      'projects',
    ],
    features: [
      'basic_reports',
      'advanced_reports',
      'email_notifications',
      'document_storage',
      'leave_management',
      'payroll_processing',
      'approval_workflows',
      'api_access',
      'audit_logs',
      'custom_branding',
    ],
  },

  ENTERPRISE: {
    name: 'Enterprise',
    description: 'For large organizations',
    monthlyPrice: 299, // Custom pricing typically
    yearlyPrice: 2990,
    maxUsers: -1, // Unlimited
    maxAssets: -1,
    maxSubscriptions: -1,
    maxSuppliers: -1,
    modules: [
      'assets',
      'subscriptions',
      'suppliers',
      'employees',
      'leave',
      'payroll',
      'purchase_requests',
      'approvals',
      'projects',
      'company_documents',
    ],
    features: [
      'basic_reports',
      'advanced_reports',
      'email_notifications',
      'document_storage',
      'leave_management',
      'payroll_processing',
      'approval_workflows',
      'api_access',
      'audit_logs',
      'custom_branding',
      'sso_integration',
      'priority_support',
      'dedicated_account_manager',
      'custom_integrations',
      'data_export',
    ],
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// FEATURE CHECKING UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check if a tier has access to a specific module
 */
export function hasModuleAccess(tier: SubscriptionTier, module: string): boolean {
  return TIER_CONFIG[tier].modules.includes(module);
}

/**
 * Check if a tier has access to a specific feature
 */
export function hasFeatureAccess(tier: SubscriptionTier, feature: string): boolean {
  return TIER_CONFIG[tier].features.includes(feature);
}

/**
 * Get the tier configuration
 */
export function getTierConfig(tier: SubscriptionTier): TierConfig {
  return TIER_CONFIG[tier];
}

/**
 * Get all modules available for a tier
 */
export function getAvailableModules(tier: SubscriptionTier): string[] {
  return TIER_CONFIG[tier].modules;
}

/**
 * Get all features available for a tier
 */
export function getAvailableFeatures(tier: SubscriptionTier): string[] {
  return TIER_CONFIG[tier].features;
}

/**
 * Check if upgrade is needed for a module
 */
export function needsUpgradeForModule(currentTier: SubscriptionTier, module: string): SubscriptionTier | null {
  if (hasModuleAccess(currentTier, module)) {
    return null;
  }

  // Find the minimum tier that has this module
  const tiers: SubscriptionTier[] = ['FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE'];
  for (const tier of tiers) {
    if (hasModuleAccess(tier, module)) {
      return tier;
    }
  }

  return null;
}

/**
 * Check if upgrade is needed for a feature
 */
export function needsUpgradeForFeature(currentTier: SubscriptionTier, feature: string): SubscriptionTier | null {
  if (hasFeatureAccess(currentTier, feature)) {
    return null;
  }

  const tiers: SubscriptionTier[] = ['FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE'];
  for (const tier of tiers) {
    if (hasFeatureAccess(tier, feature)) {
      return tier;
    }
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE METADATA
// ═══════════════════════════════════════════════════════════════════════════════

export const MODULE_METADATA: Record<string, { name: string; description: string; icon: string }> = {
  assets: {
    name: 'Asset Management',
    description: 'Track hardware, equipment, warranties, and assignments',
    icon: 'Package',
  },
  subscriptions: {
    name: 'Subscription Tracking',
    description: 'Monitor SaaS services, renewals, and costs',
    icon: 'CreditCard',
  },
  suppliers: {
    name: 'Supplier Management',
    description: 'Manage vendors and supplier relationships',
    icon: 'Truck',
  },
  employees: {
    name: 'Employee Directory',
    description: 'Employee profiles and HR information',
    icon: 'Users',
  },
  leave: {
    name: 'Leave Management',
    description: 'Leave requests, balances, and approvals',
    icon: 'Calendar',
  },
  payroll: {
    name: 'Payroll Processing',
    description: 'Salary structures, payslips, and loans',
    icon: 'DollarSign',
  },
  purchase_requests: {
    name: 'Purchase Requests',
    description: 'Internal procurement workflow',
    icon: 'ShoppingCart',
  },
  approvals: {
    name: 'Approval Workflows',
    description: 'Multi-level approval chains',
    icon: 'CheckSquare',
  },
  projects: {
    name: 'Project Management',
    description: 'Track projects and assign resources',
    icon: 'FolderKanban',
  },
  company_documents: {
    name: 'Company Documents',
    description: 'Track licenses, certifications, and compliance',
    icon: 'FileCheck',
  },
};
