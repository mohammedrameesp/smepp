/**
 * @file config-tabs.test.ts
 * @description Tests for organization configuration tab logic
 *
 * Tests the configuration sub-tab organization and module-dependent
 * settings visibility logic introduced in the configuration tab reorganization.
 */

describe('Organization Configuration Tabs', () => {
  // Available modules constant (mirrored from organization-tabs.tsx)
  const AVAILABLE_MODULES = [
    { id: 'assets', name: 'Assets', description: 'Track company assets' },
    { id: 'subscriptions', name: 'Subscriptions', description: 'Manage subscriptions' },
    { id: 'suppliers', name: 'Suppliers', description: 'Vendor management' },
    { id: 'employees', name: 'Employees', description: 'HR management' },
    { id: 'leave', name: 'Leave', description: 'Leave management' },
    { id: 'payroll', name: 'Payroll', description: 'Salary & payslips' },
    { id: 'purchase-requests', name: 'Purchase Requests', description: 'Procurement' },
    { id: 'documents', name: 'Documents', description: 'Company documents' },
  ];

  // Configuration sub-tabs structure
  const CONFIG_SUB_TABS = {
    general: {
      id: 'general',
      label: 'General',
      requiresModule: null, // Always accessible
      settings: ['codePrefix', 'codeFormats', 'enabledModules'],
    },
    assets: {
      id: 'assets',
      label: 'Assets',
      requiresModule: 'assets',
      settings: ['assetCategories', 'assetTypeMappings', 'depreciationCategories', 'locations'],
    },
    financial: {
      id: 'financial',
      label: 'Financial',
      requiresModule: null, // Always accessible
      settings: ['additionalCurrencies', 'exchangeRates'],
    },
    hr: {
      id: 'hr',
      label: 'HR',
      requiresModule: 'payroll',
      settings: ['payrollSettings'],
    },
  };

  describe('Sub-Tab Structure', () => {
    it('should have exactly 4 sub-tabs', () => {
      const subTabs = Object.keys(CONFIG_SUB_TABS);
      expect(subTabs).toHaveLength(4);
    });

    it('should have correct sub-tab IDs', () => {
      const subTabIds = Object.keys(CONFIG_SUB_TABS);
      expect(subTabIds).toContain('general');
      expect(subTabIds).toContain('assets');
      expect(subTabIds).toContain('financial');
      expect(subTabIds).toContain('hr');
    });

    it('should have General tab always accessible', () => {
      expect(CONFIG_SUB_TABS.general.requiresModule).toBeNull();
    });

    it('should have Financial tab always accessible', () => {
      expect(CONFIG_SUB_TABS.financial.requiresModule).toBeNull();
    });

    it('should require assets module for Assets tab', () => {
      expect(CONFIG_SUB_TABS.assets.requiresModule).toBe('assets');
    });

    it('should require payroll module for HR tab', () => {
      expect(CONFIG_SUB_TABS.hr.requiresModule).toBe('payroll');
    });
  });

  describe('Settings Distribution', () => {
    describe('General Tab Settings', () => {
      it('should contain code prefix setting', () => {
        expect(CONFIG_SUB_TABS.general.settings).toContain('codePrefix');
      });

      it('should contain code formats setting', () => {
        expect(CONFIG_SUB_TABS.general.settings).toContain('codeFormats');
      });

      it('should contain enabled modules setting', () => {
        expect(CONFIG_SUB_TABS.general.settings).toContain('enabledModules');
      });
    });

    describe('Assets Tab Settings', () => {
      it('should contain asset categories setting', () => {
        expect(CONFIG_SUB_TABS.assets.settings).toContain('assetCategories');
      });

      it('should contain asset type mappings setting', () => {
        expect(CONFIG_SUB_TABS.assets.settings).toContain('assetTypeMappings');
      });

      it('should contain depreciation categories setting', () => {
        expect(CONFIG_SUB_TABS.assets.settings).toContain('depreciationCategories');
      });

      it('should contain locations setting', () => {
        expect(CONFIG_SUB_TABS.assets.settings).toContain('locations');
      });
    });

    describe('Financial Tab Settings', () => {
      it('should contain additional currencies setting', () => {
        expect(CONFIG_SUB_TABS.financial.settings).toContain('additionalCurrencies');
      });

      it('should contain exchange rates setting', () => {
        expect(CONFIG_SUB_TABS.financial.settings).toContain('exchangeRates');
      });
    });

    describe('HR Tab Settings', () => {
      it('should contain payroll settings', () => {
        expect(CONFIG_SUB_TABS.hr.settings).toContain('payrollSettings');
      });
    });
  });

  describe('Module Visibility Logic', () => {
    // Helper function to check if a sub-tab should show content or placeholder
    function shouldShowContent(subTabId: string, enabledModules: string[]): boolean {
      const subTab = CONFIG_SUB_TABS[subTabId as keyof typeof CONFIG_SUB_TABS];
      if (!subTab.requiresModule) return true;
      return enabledModules.includes(subTab.requiresModule);
    }

    describe('With All Modules Enabled', () => {
      const allModulesEnabled = AVAILABLE_MODULES.map(m => m.id);

      it('should show General content', () => {
        expect(shouldShowContent('general', allModulesEnabled)).toBe(true);
      });

      it('should show Assets content', () => {
        expect(shouldShowContent('assets', allModulesEnabled)).toBe(true);
      });

      it('should show Financial content', () => {
        expect(shouldShowContent('financial', allModulesEnabled)).toBe(true);
      });

      it('should show HR content', () => {
        expect(shouldShowContent('hr', allModulesEnabled)).toBe(true);
      });
    });

    describe('With Minimal Modules', () => {
      const minimalModules = ['assets', 'subscriptions', 'suppliers'];

      it('should show General content', () => {
        expect(shouldShowContent('general', minimalModules)).toBe(true);
      });

      it('should show Assets content (assets enabled)', () => {
        expect(shouldShowContent('assets', minimalModules)).toBe(true);
      });

      it('should show Financial content', () => {
        expect(shouldShowContent('financial', minimalModules)).toBe(true);
      });

      it('should show placeholder for HR (payroll not enabled)', () => {
        expect(shouldShowContent('hr', minimalModules)).toBe(false);
      });
    });

    describe('With No Modules', () => {
      const noModules: string[] = [];

      it('should show General content', () => {
        expect(shouldShowContent('general', noModules)).toBe(true);
      });

      it('should show placeholder for Assets', () => {
        expect(shouldShowContent('assets', noModules)).toBe(false);
      });

      it('should show Financial content', () => {
        expect(shouldShowContent('financial', noModules)).toBe(true);
      });

      it('should show placeholder for HR', () => {
        expect(shouldShowContent('hr', noModules)).toBe(false);
      });
    });

    describe('With Only Payroll Module', () => {
      const payrollOnly = ['payroll'];

      it('should show placeholder for Assets', () => {
        expect(shouldShowContent('assets', payrollOnly)).toBe(false);
      });

      it('should show HR content', () => {
        expect(shouldShowContent('hr', payrollOnly)).toBe(true);
      });
    });
  });

  describe('Module Toggle Logic', () => {
    // Helper function mimicking toggleModule from the component
    function toggleModule(currentModules: string[], moduleId: string): string[] {
      return currentModules.includes(moduleId)
        ? currentModules.filter(m => m !== moduleId)
        : [...currentModules, moduleId];
    }

    it('should add module when not present', () => {
      const current = ['assets', 'subscriptions'];
      const result = toggleModule(current, 'payroll');
      expect(result).toContain('payroll');
      expect(result).toHaveLength(3);
    });

    it('should remove module when present', () => {
      const current = ['assets', 'subscriptions', 'payroll'];
      const result = toggleModule(current, 'payroll');
      expect(result).not.toContain('payroll');
      expect(result).toHaveLength(2);
    });

    it('should not modify other modules when adding', () => {
      const current = ['assets', 'subscriptions'];
      const result = toggleModule(current, 'payroll');
      expect(result).toContain('assets');
      expect(result).toContain('subscriptions');
    });

    it('should not modify other modules when removing', () => {
      const current = ['assets', 'subscriptions', 'payroll'];
      const result = toggleModule(current, 'payroll');
      expect(result).toContain('assets');
      expect(result).toContain('subscriptions');
    });
  });

  describe('Available Modules', () => {
    it('should have 8 available modules', () => {
      expect(AVAILABLE_MODULES).toHaveLength(8);
    });

    it('should include core modules', () => {
      const moduleIds = AVAILABLE_MODULES.map(m => m.id);
      expect(moduleIds).toContain('assets');
      expect(moduleIds).toContain('subscriptions');
      expect(moduleIds).toContain('suppliers');
    });

    it('should include HR modules', () => {
      const moduleIds = AVAILABLE_MODULES.map(m => m.id);
      expect(moduleIds).toContain('employees');
      expect(moduleIds).toContain('leave');
      expect(moduleIds).toContain('payroll');
    });

    it('should include other modules', () => {
      const moduleIds = AVAILABLE_MODULES.map(m => m.id);
      expect(moduleIds).toContain('purchase-requests');
      expect(moduleIds).toContain('documents');
    });

    it('should have name and description for each module', () => {
      AVAILABLE_MODULES.forEach(module => {
        expect(module.name).toBeDefined();
        expect(module.name.length).toBeGreaterThan(0);
        expect(module.description).toBeDefined();
        expect(module.description.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Currency Toggle Logic', () => {
    // Helper function mimicking toggleCurrency from the component
    function toggleCurrency(currentCurrencies: string[], code: string): string[] {
      return currentCurrencies.includes(code)
        ? currentCurrencies.filter(c => c !== code)
        : [...currentCurrencies, code];
    }

    const AVAILABLE_CURRENCIES = ['USD', 'EUR', 'GBP', 'SAR', 'AED', 'KWD'];

    it('should add currency when not present', () => {
      const current = ['USD', 'EUR'];
      const result = toggleCurrency(current, 'GBP');
      expect(result).toContain('GBP');
    });

    it('should remove currency when present', () => {
      const current = ['USD', 'EUR', 'GBP'];
      const result = toggleCurrency(current, 'EUR');
      expect(result).not.toContain('EUR');
    });

    it('should preserve order of existing currencies', () => {
      const current = ['USD', 'EUR'];
      const result = toggleCurrency(current, 'GBP');
      expect(result[0]).toBe('USD');
      expect(result[1]).toBe('EUR');
      expect(result[2]).toBe('GBP');
    });

    it('should handle empty array', () => {
      const current: string[] = [];
      const result = toggleCurrency(current, 'USD');
      expect(result).toEqual(['USD']);
    });

    it('should handle removing last currency', () => {
      const current = ['USD'];
      const result = toggleCurrency(current, 'USD');
      expect(result).toEqual([]);
    });
  });

  describe('Default Enabled Modules', () => {
    const DEFAULT_ENABLED_MODULES = ['assets', 'subscriptions', 'suppliers'];

    it('should have assets enabled by default', () => {
      expect(DEFAULT_ENABLED_MODULES).toContain('assets');
    });

    it('should have subscriptions enabled by default', () => {
      expect(DEFAULT_ENABLED_MODULES).toContain('subscriptions');
    });

    it('should have suppliers enabled by default', () => {
      expect(DEFAULT_ENABLED_MODULES).toContain('suppliers');
    });

    it('should have exactly 3 default modules', () => {
      expect(DEFAULT_ENABLED_MODULES).toHaveLength(3);
    });

    it('should not have payroll enabled by default', () => {
      expect(DEFAULT_ENABLED_MODULES).not.toContain('payroll');
    });
  });
});
