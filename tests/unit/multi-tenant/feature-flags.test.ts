/**
 * @file feature-flags.test.ts
 * @description Tests for feature flags and subscription tier configuration
 */

import { SubscriptionTier } from '@prisma/client';
import {
  TIER_CONFIG,
  hasModuleAccess,
  hasFeatureAccess,
  getTierConfig,
  getAvailableModules,
  getAvailableFeatures,
  needsUpgradeForModule,
  needsUpgradeForFeature,
  MODULE_METADATA,
} from '@/lib/multi-tenant/feature-flags';

describe('Feature Flags Tests', () => {
  describe('TIER_CONFIG', () => {
    it('should have configuration for FREE tier', () => {
      expect(TIER_CONFIG.FREE).toBeDefined();
      expect(TIER_CONFIG.FREE.name).toBe('Free');
    });

    it('should have configuration for PLUS tier', () => {
      expect(TIER_CONFIG.PLUS).toBeDefined();
      expect(TIER_CONFIG.PLUS.name).toBe('Plus');
    });

    describe('FREE Tier Configuration', () => {
      const freeTier = TIER_CONFIG.FREE;

      it('should have unlimited users (-1)', () => {
        expect(freeTier.maxUsers).toBe(-1);
      });

      it('should have unlimited assets (-1)', () => {
        expect(freeTier.maxAssets).toBe(-1);
      });

      it('should have unlimited subscriptions (-1)', () => {
        expect(freeTier.maxSubscriptions).toBe(-1);
      });

      it('should have unlimited suppliers (-1)', () => {
        expect(freeTier.maxSuppliers).toBe(-1);
      });

      it('should have $0 monthly price', () => {
        expect(freeTier.monthlyPrice).toBe(0);
      });

      it('should have $0 yearly price', () => {
        expect(freeTier.yearlyPrice).toBe(0);
      });

      it('should include all modules', () => {
        const expectedModules = [
          'assets',
          'subscriptions',
          'suppliers',
          'leave',
          'payroll',
          'spend-requests',
          'documents',
        ];
        expect(freeTier.modules).toEqual(expect.arrayContaining(expectedModules));
      });

      it('should include all features', () => {
        expect(freeTier.features.length).toBeGreaterThan(0);
        expect(freeTier.features).toContain('basic_reports');
        expect(freeTier.features).toContain('in_app_notifications');
      });
    });

    describe('PLUS Tier Configuration', () => {
      const plusTier = TIER_CONFIG.PLUS;

      it('should have unlimited users (-1)', () => {
        expect(plusTier.maxUsers).toBe(-1);
      });

      it('should have $149 monthly price', () => {
        expect(plusTier.monthlyPrice).toBe(149);
      });

      it('should have $1490 yearly price (2 months free)', () => {
        expect(plusTier.yearlyPrice).toBe(1490);
        // Yearly should be cheaper than 12 * monthly
        expect(plusTier.yearlyPrice).toBeLessThan(plusTier.monthlyPrice * 12);
      });

      it('should include all modules (same as FREE since restrictions disabled)', () => {
        expect(plusTier.modules).toEqual(TIER_CONFIG.FREE.modules);
      });

      it('should include all features', () => {
        expect(plusTier.features).toContain('priority_support');
        expect(plusTier.features).toContain('advanced_reports');
      });
    });
  });

  describe('hasModuleAccess', () => {
    it('should always return true (tier restrictions disabled)', () => {
      expect(hasModuleAccess('FREE' as SubscriptionTier, 'assets')).toBe(true);
      expect(hasModuleAccess('FREE' as SubscriptionTier, 'payroll')).toBe(true);
      expect(hasModuleAccess('PLUS' as SubscriptionTier, 'payroll')).toBe(true);
    });

    it('should return true for any module regardless of tier', () => {
      const modules = ['assets', 'subscriptions', 'suppliers', 'leave', 'payroll', 'spend-requests', 'documents'];

      modules.forEach((module) => {
        expect(hasModuleAccess('FREE' as SubscriptionTier, module)).toBe(true);
      });
    });

    it('should return true for unknown modules (lenient behavior)', () => {
      expect(hasModuleAccess('FREE' as SubscriptionTier, 'unknown-module')).toBe(true);
    });
  });

  describe('hasFeatureAccess', () => {
    it('should always return true (tier restrictions disabled)', () => {
      expect(hasFeatureAccess('FREE' as SubscriptionTier, 'basic_reports')).toBe(true);
      expect(hasFeatureAccess('FREE' as SubscriptionTier, 'advanced_reports')).toBe(true);
      expect(hasFeatureAccess('FREE' as SubscriptionTier, 'priority_support')).toBe(true);
    });

    it('should return true for any feature regardless of tier', () => {
      const features = [
        'basic_reports',
        'advanced_reports',
        'in_app_notifications',
        'email_notifications',
        'whatsapp_notifications',
        'api_access',
      ];

      features.forEach((feature) => {
        expect(hasFeatureAccess('FREE' as SubscriptionTier, feature)).toBe(true);
      });
    });
  });

  describe('getTierConfig', () => {
    it('should return FREE tier config for FREE tier', () => {
      const config = getTierConfig('FREE' as SubscriptionTier);

      expect(config).toBe(TIER_CONFIG.FREE);
      expect(config.name).toBe('Free');
    });

    it('should return PLUS tier config for PLUS tier', () => {
      const config = getTierConfig('PLUS' as SubscriptionTier);

      expect(config).toBe(TIER_CONFIG.PLUS);
      expect(config.name).toBe('Plus');
    });

    it('should fallback to FREE config for unknown tier', () => {
      const config = getTierConfig('UNKNOWN' as SubscriptionTier);

      expect(config).toBe(TIER_CONFIG.FREE);
    });
  });

  describe('getAvailableModules', () => {
    it('should return all modules regardless of tier', () => {
      const freeModules = getAvailableModules('FREE' as SubscriptionTier);
      const plusModules = getAvailableModules('PLUS' as SubscriptionTier);

      expect(freeModules).toEqual(plusModules);
    });

    it('should include core modules', () => {
      const modules = getAvailableModules('FREE' as SubscriptionTier);

      expect(modules).toContain('assets');
      expect(modules).toContain('subscriptions');
      expect(modules).toContain('suppliers');
    });

    it('should include HR modules', () => {
      const modules = getAvailableModules('FREE' as SubscriptionTier);

      expect(modules).toContain('leave');
      expect(modules).toContain('payroll');
    });

    it('should include operational modules', () => {
      const modules = getAvailableModules('FREE' as SubscriptionTier);

      expect(modules).toContain('spend-requests');
      expect(modules).toContain('documents');
    });
  });

  describe('getAvailableFeatures', () => {
    it('should return all features regardless of tier', () => {
      const freeFeatures = getAvailableFeatures('FREE' as SubscriptionTier);
      const plusFeatures = getAvailableFeatures('PLUS' as SubscriptionTier);

      expect(freeFeatures).toEqual(plusFeatures);
    });

    it('should include reporting features', () => {
      const features = getAvailableFeatures('FREE' as SubscriptionTier);

      expect(features).toContain('basic_reports');
      expect(features).toContain('advanced_reports');
    });

    it('should include notification features', () => {
      const features = getAvailableFeatures('FREE' as SubscriptionTier);

      expect(features).toContain('in_app_notifications');
      expect(features).toContain('email_notifications');
      expect(features).toContain('whatsapp_notifications');
    });

    it('should include authentication features', () => {
      const features = getAvailableFeatures('FREE' as SubscriptionTier);

      expect(features).toContain('google_sso');
      expect(features).toContain('microsoft_sso');
    });

    it('should include customization features', () => {
      const features = getAvailableFeatures('FREE' as SubscriptionTier);

      expect(features).toContain('custom_branding');
      expect(features).toContain('subdomain');
    });
  });

  describe('needsUpgradeForModule', () => {
    it('should always return null (no upgrade needed)', () => {
      expect(needsUpgradeForModule('FREE' as SubscriptionTier, 'payroll')).toBeNull();
      expect(needsUpgradeForModule('FREE' as SubscriptionTier, 'leave')).toBeNull();
    });

    it('should return null for any module', () => {
      const modules = ['assets', 'subscriptions', 'suppliers', 'leave', 'payroll', 'spend-requests'];

      modules.forEach((module) => {
        expect(needsUpgradeForModule('FREE' as SubscriptionTier, module)).toBeNull();
      });
    });
  });

  describe('needsUpgradeForFeature', () => {
    it('should always return null (no upgrade needed)', () => {
      expect(needsUpgradeForFeature('FREE' as SubscriptionTier, 'priority_support')).toBeNull();
      expect(needsUpgradeForFeature('FREE' as SubscriptionTier, 'api_access')).toBeNull();
    });

    it('should return null for any feature', () => {
      const features = ['basic_reports', 'advanced_reports', 'whatsapp_notifications', 'custom_domain'];

      features.forEach((feature) => {
        expect(needsUpgradeForFeature('FREE' as SubscriptionTier, feature)).toBeNull();
      });
    });
  });

  describe('MODULE_METADATA', () => {
    it('should have metadata for assets module', () => {
      expect(MODULE_METADATA.assets).toBeDefined();
      expect(MODULE_METADATA.assets.name).toBe('Asset Management');
      expect(MODULE_METADATA.assets.description).toContain('hardware');
      expect(MODULE_METADATA.assets.icon).toBe('Package');
    });

    it('should have metadata for subscriptions module', () => {
      expect(MODULE_METADATA.subscriptions).toBeDefined();
      expect(MODULE_METADATA.subscriptions.name).toBe('Subscription Tracking');
      expect(MODULE_METADATA.subscriptions.icon).toBe('CreditCard');
    });

    it('should have metadata for suppliers module', () => {
      expect(MODULE_METADATA.suppliers).toBeDefined();
      expect(MODULE_METADATA.suppliers.name).toBe('Supplier Management');
      expect(MODULE_METADATA.suppliers.icon).toBe('Truck');
    });

    it('should have metadata for leave module', () => {
      expect(MODULE_METADATA.leave).toBeDefined();
      expect(MODULE_METADATA.leave.name).toBe('Leave Management');
      expect(MODULE_METADATA.leave.icon).toBe('Calendar');
    });

    it('should have metadata for payroll module', () => {
      expect(MODULE_METADATA.payroll).toBeDefined();
      expect(MODULE_METADATA.payroll.name).toBe('Payroll Processing');
      expect(MODULE_METADATA.payroll.icon).toBe('DollarSign');
    });

    it('should have metadata for spend-requests module', () => {
      expect(MODULE_METADATA['spend-requests']).toBeDefined();
      expect(MODULE_METADATA['spend-requests'].name).toBe('Spend Requests');
      expect(MODULE_METADATA['spend-requests'].icon).toBe('ShoppingCart');
    });

    it('should have metadata for documents module', () => {
      expect(MODULE_METADATA.documents).toBeDefined();
      expect(MODULE_METADATA.documents.name).toBe('Company Documents');
      expect(MODULE_METADATA.documents.icon).toBe('FileCheck');
    });

    it('should have all required fields for each module', () => {
      Object.values(MODULE_METADATA).forEach((metadata) => {
        expect(metadata).toHaveProperty('name');
        expect(metadata).toHaveProperty('description');
        expect(metadata).toHaveProperty('icon');
        expect(typeof metadata.name).toBe('string');
        expect(typeof metadata.description).toBe('string');
        expect(typeof metadata.icon).toBe('string');
      });
    });
  });

  describe('Tier Pricing Consistency', () => {
    it('should have yearly price less than 12x monthly for paid tiers', () => {
      const plusTier = TIER_CONFIG.PLUS;

      if (plusTier.monthlyPrice > 0) {
        expect(plusTier.yearlyPrice).toBeLessThan(plusTier.monthlyPrice * 12);
      }
    });

    it('should have FREE tier with $0 pricing', () => {
      expect(TIER_CONFIG.FREE.monthlyPrice).toBe(0);
      expect(TIER_CONFIG.FREE.yearlyPrice).toBe(0);
    });
  });

  describe('Module Consistency', () => {
    it('should have all modules in TIER_CONFIG listed in MODULE_METADATA', () => {
      const configuredModules = TIER_CONFIG.FREE.modules;

      configuredModules.forEach((module) => {
        expect(MODULE_METADATA[module]).toBeDefined();
      });
    });

    it('should use hyphenated naming for multi-word modules', () => {
      const modules = TIER_CONFIG.FREE.modules;

      modules.forEach((module) => {
        // Should not contain spaces
        expect(module).not.toContain(' ');
        // If multi-word, should use hyphens
        if (module.includes('-')) {
          expect(/^[a-z-]+$/.test(module)).toBe(true);
        }
      });
    });
  });
});
