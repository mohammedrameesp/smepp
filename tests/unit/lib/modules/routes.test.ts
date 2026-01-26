/**
 * @file routes.test.ts
 * @description Tests for module route mapping (Edge Runtime compatible)
 */

import {
  getModuleForRoute,
  checkModuleAccess,
  checkPermissionAccess,
  _getModuleRouteMap,
  _getPermissionRouteMap,
  _isCoreModule,
  type PermissionContext,
} from '@/lib/modules/routes';

describe('Module Routes Tests', () => {
  // ═══════════════════════════════════════════════════════════════════════════════
  // getModuleForRoute
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('getModuleForRoute', () => {
    describe('Admin Routes', () => {
      it('should return assets for /admin/assets', () => {
        expect(getModuleForRoute('/admin/assets')).toBe('assets');
      });

      it('should return assets for /admin/assets/123', () => {
        expect(getModuleForRoute('/admin/assets/123')).toBe('assets');
      });

      it('should return assets for /admin/asset-requests', () => {
        expect(getModuleForRoute('/admin/asset-requests')).toBe('assets');
      });

      it('should return subscriptions for /admin/subscriptions', () => {
        expect(getModuleForRoute('/admin/subscriptions')).toBe('subscriptions');
      });

      it('should return suppliers for /admin/suppliers', () => {
        expect(getModuleForRoute('/admin/suppliers')).toBe('suppliers');
      });

      it('should return employees for /admin/employees', () => {
        expect(getModuleForRoute('/admin/employees')).toBe('employees');
      });

      it('should return leave for /admin/leave', () => {
        expect(getModuleForRoute('/admin/leave')).toBe('leave');
      });

      it('should return payroll for /admin/payroll', () => {
        expect(getModuleForRoute('/admin/payroll')).toBe('payroll');
      });

      it('should return spend-requests for /admin/spend-requests', () => {
        expect(getModuleForRoute('/admin/spend-requests')).toBe('spend-requests');
      });

      it('should return documents for /admin/company-documents', () => {
        expect(getModuleForRoute('/admin/company-documents')).toBe('documents');
      });
    });

    describe('Employee Routes', () => {
      it('should return assets for /employee/assets', () => {
        expect(getModuleForRoute('/employee/assets')).toBe('assets');
      });

      it('should return assets for /employee/my-assets', () => {
        expect(getModuleForRoute('/employee/my-assets')).toBe('assets');
      });

      it('should return leave for /employee/leave', () => {
        expect(getModuleForRoute('/employee/leave')).toBe('leave');
      });

      it('should return payroll for /employee/payroll', () => {
        expect(getModuleForRoute('/employee/payroll')).toBe('payroll');
      });
    });

    describe('API Routes', () => {
      it('should return assets for /api/assets', () => {
        expect(getModuleForRoute('/api/assets')).toBe('assets');
      });

      it('should return assets for /api/asset-categories', () => {
        expect(getModuleForRoute('/api/asset-categories')).toBe('assets');
      });

      it('should return assets for /api/asset-types', () => {
        expect(getModuleForRoute('/api/asset-types')).toBe('assets');
      });

      it('should return subscriptions for /api/subscriptions', () => {
        expect(getModuleForRoute('/api/subscriptions')).toBe('subscriptions');
      });

      it('should return leave for /api/leave', () => {
        expect(getModuleForRoute('/api/leave')).toBe('leave');
      });

      it('should return payroll for /api/payroll', () => {
        expect(getModuleForRoute('/api/payroll')).toBe('payroll');
      });

      it('should return payroll for /api/settings/payroll-percentages', () => {
        expect(getModuleForRoute('/api/settings/payroll-percentages')).toBe('payroll');
      });

      it('should return documents for /api/company-documents', () => {
        expect(getModuleForRoute('/api/company-documents')).toBe('documents');
      });

      it('should return documents for /api/company-document-types', () => {
        expect(getModuleForRoute('/api/company-document-types')).toBe('documents');
      });
    });

    describe('Case Insensitive Matching (Security)', () => {
      it('should match /Admin/Assets (uppercase A)', () => {
        expect(getModuleForRoute('/Admin/Assets')).toBe('assets');
      });

      it('should match /ADMIN/ASSETS (all uppercase)', () => {
        expect(getModuleForRoute('/ADMIN/ASSETS')).toBe('assets');
      });

      it('should match /AdMiN/aSsEtS (mixed case)', () => {
        expect(getModuleForRoute('/AdMiN/aSsEtS')).toBe('assets');
      });

      it('should match /Admin/Leave with mixed case', () => {
        expect(getModuleForRoute('/Admin/Leave')).toBe('leave');
      });

      it('should match /API/PAYROLL (uppercase API route)', () => {
        expect(getModuleForRoute('/API/PAYROLL')).toBe('payroll');
      });
    });

    describe('Query String Handling (Security)', () => {
      it('should strip query string and match route', () => {
        expect(getModuleForRoute('/admin/assets?sort=name')).toBe('assets');
      });

      it('should handle complex query strings', () => {
        expect(getModuleForRoute('/admin/leave?status=pending&page=1')).toBe('leave');
      });

      it('should handle query strings with special characters', () => {
        expect(getModuleForRoute('/admin/payroll?filter=name%20asc')).toBe('payroll');
      });
    });

    describe('Unprotected Routes', () => {
      it('should return null for /admin/settings', () => {
        expect(getModuleForRoute('/admin/settings')).toBeNull();
      });

      it('should return null for /admin/users', () => {
        expect(getModuleForRoute('/admin/users')).toBeNull();
      });

      it('should return null for /admin', () => {
        expect(getModuleForRoute('/admin')).toBeNull();
      });

      it('should return null for /api/auth', () => {
        expect(getModuleForRoute('/api/auth')).toBeNull();
      });

      it('should return null for /employee', () => {
        expect(getModuleForRoute('/employee')).toBeNull();
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // checkModuleAccess
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('checkModuleAccess', () => {
    describe('Core Module Access', () => {
      it('should allow /admin/employees even without it in enabledModules', () => {
        const result = checkModuleAccess('/admin/employees', []);
        expect(result.allowed).toBe(true);
      });

      it('should allow /api/employees for core module', () => {
        const result = checkModuleAccess('/api/employees', []);
        expect(result.allowed).toBe(true);
      });
    });

    describe('Installed Module Access', () => {
      it('should allow /admin/assets when assets is enabled', () => {
        const result = checkModuleAccess('/admin/assets', ['assets']);
        expect(result.allowed).toBe(true);
      });

      it('should allow /admin/leave when leave is enabled', () => {
        const result = checkModuleAccess('/admin/leave', ['leave']);
        expect(result.allowed).toBe(true);
      });

      it('should allow /api/payroll when payroll is enabled', () => {
        const result = checkModuleAccess('/api/payroll', ['payroll']);
        expect(result.allowed).toBe(true);
      });
    });

    describe('Not Installed Module Access', () => {
      it('should block /admin/assets when assets not enabled', () => {
        const result = checkModuleAccess('/admin/assets', ['leave', 'payroll']);
        expect(result.allowed).toBe(false);
        expect(result.moduleId).toBe('assets');
        expect(result.reason).toBe('not_installed');
      });

      it('should block /admin/leave when leave not enabled', () => {
        const result = checkModuleAccess('/admin/leave', ['assets']);
        expect(result.allowed).toBe(false);
        expect(result.moduleId).toBe('leave');
      });

      it('should block /api/payroll when payroll not enabled', () => {
        const result = checkModuleAccess('/api/payroll', ['assets']);
        expect(result.allowed).toBe(false);
        expect(result.moduleId).toBe('payroll');
      });
    });

    describe('Unprotected Route Access', () => {
      it('should allow /admin/settings regardless of modules', () => {
        const result = checkModuleAccess('/admin/settings', []);
        expect(result.allowed).toBe(true);
      });

      it('should allow /admin regardless of modules', () => {
        const result = checkModuleAccess('/admin', []);
        expect(result.allowed).toBe(true);
      });
    });

    describe('Case Insensitive (Security)', () => {
      it('should block /ADMIN/ASSETS when assets not enabled', () => {
        const result = checkModuleAccess('/ADMIN/ASSETS', []);
        expect(result.allowed).toBe(false);
        expect(result.moduleId).toBe('assets');
      });

      it('should allow /Admin/Assets when assets is enabled', () => {
        const result = checkModuleAccess('/Admin/Assets', ['assets']);
        expect(result.allowed).toBe(true);
      });
    });

    describe('Invalid/Unknown Routes', () => {
      it('should allow access to routes that do not map to any module', () => {
        // Routes that don't match any MODULE_ROUTE_MAP entry are not module-protected
        const result = checkModuleAccess('/admin/fake-module', []);
        expect(result.allowed).toBe(true);
        expect(result.moduleId).toBeUndefined();
      });

      it('should allow access when path looks like a module but is not registered', () => {
        // A path that might look like a module route but isn't in the mapping
        const result = checkModuleAccess('/admin/inventory', ['assets']);
        expect(result.allowed).toBe(true);
        expect(result.moduleId).toBeUndefined();
      });

      it('should not grant access when enabledModules contains invalid module IDs', () => {
        // Even if enabledModules contains garbage, a valid protected route should check correctly
        const result = checkModuleAccess('/admin/assets', ['invalid-module', 'fake', 'not-real']);
        expect(result.allowed).toBe(false);
        expect(result.moduleId).toBe('assets');
        expect(result.reason).toBe('not_installed');
      });

      it('should not be affected by similar but different module names in enabledModules', () => {
        // 'asset' (singular) should not grant access to 'assets' route
        const result = checkModuleAccess('/admin/assets', ['asset', 'Assets', 'ASSETS']);
        expect(result.allowed).toBe(false);
        expect(result.moduleId).toBe('assets');
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // checkPermissionAccess
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('checkPermissionAccess', () => {
    describe('Admin/Owner Bypass', () => {
      it('should allow admin to access any route', () => {
        const permissions: PermissionContext = { isAdmin: true };

        expect(checkPermissionAccess('/admin/assets', permissions).allowed).toBe(true);
        expect(checkPermissionAccess('/admin/employees', permissions).allowed).toBe(true);
        expect(checkPermissionAccess('/admin/payroll', permissions).allowed).toBe(true);
      });

      it('should allow owner to access any route', () => {
        const permissions: PermissionContext = { isOwner: true };

        expect(checkPermissionAccess('/admin/assets', permissions).allowed).toBe(true);
        expect(checkPermissionAccess('/admin/employees', permissions).allowed).toBe(true);
        expect(checkPermissionAccess('/admin/payroll', permissions).allowed).toBe(true);
      });
    });

    describe('Operations Access', () => {
      it('should allow operations access to /admin/assets', () => {
        const permissions: PermissionContext = { hasOperationsAccess: true };
        expect(checkPermissionAccess('/admin/assets', permissions).allowed).toBe(true);
      });

      it('should allow operations access to /admin/subscriptions', () => {
        const permissions: PermissionContext = { hasOperationsAccess: true };
        expect(checkPermissionAccess('/admin/subscriptions', permissions).allowed).toBe(true);
      });

      it('should allow operations access to /admin/suppliers', () => {
        const permissions: PermissionContext = { hasOperationsAccess: true };
        expect(checkPermissionAccess('/admin/suppliers', permissions).allowed).toBe(true);
      });

      it('should block user without operations access from /admin/assets', () => {
        const permissions: PermissionContext = { hasHRAccess: true };
        const result = checkPermissionAccess('/admin/assets', permissions);
        expect(result.allowed).toBe(false);
        expect(result.requiredPermission).toBe('hasOperationsAccess');
      });
    });

    describe('HR Access', () => {
      it('should allow HR access to /admin/employees', () => {
        const permissions: PermissionContext = { hasHRAccess: true };
        expect(checkPermissionAccess('/admin/employees', permissions).allowed).toBe(true);
      });

      it('should allow HR access to /admin/leave', () => {
        const permissions: PermissionContext = { hasHRAccess: true };
        expect(checkPermissionAccess('/admin/leave', permissions).allowed).toBe(true);
      });

      it('should block user without HR access from /admin/employees', () => {
        const permissions: PermissionContext = { hasOperationsAccess: true };
        const result = checkPermissionAccess('/admin/employees', permissions);
        expect(result.allowed).toBe(false);
        expect(result.requiredPermission).toBe('hasHRAccess');
      });
    });

    describe('Finance Access', () => {
      it('should allow finance access to /admin/payroll', () => {
        const permissions: PermissionContext = { hasFinanceAccess: true };
        expect(checkPermissionAccess('/admin/payroll', permissions).allowed).toBe(true);
      });

      it('should allow finance access to /admin/spend-requests', () => {
        const permissions: PermissionContext = { hasFinanceAccess: true };
        expect(checkPermissionAccess('/admin/spend-requests', permissions).allowed).toBe(true);
      });

      it('should block user without finance access from /admin/payroll', () => {
        const permissions: PermissionContext = { hasOperationsAccess: true };
        const result = checkPermissionAccess('/admin/payroll', permissions);
        expect(result.allowed).toBe(false);
        expect(result.requiredPermission).toBe('hasFinanceAccess');
      });
    });

    describe('Case Insensitive (Security)', () => {
      it('should check permission for /ADMIN/ASSETS correctly', () => {
        const permissions: PermissionContext = { hasHRAccess: true };
        const result = checkPermissionAccess('/ADMIN/ASSETS', permissions);
        expect(result.allowed).toBe(false);
        expect(result.requiredPermission).toBe('hasOperationsAccess');
      });

      it('should allow /Admin/Assets with operations access', () => {
        const permissions: PermissionContext = { hasOperationsAccess: true };
        expect(checkPermissionAccess('/Admin/Assets', permissions).allowed).toBe(true);
      });
    });

    describe('Unprotected Routes', () => {
      it('should allow access to /admin/settings without any permissions', () => {
        const permissions: PermissionContext = {};
        expect(checkPermissionAccess('/admin/settings', permissions).allowed).toBe(true);
      });

      it('should allow access to /employee routes without admin permissions', () => {
        const permissions: PermissionContext = {};
        expect(checkPermissionAccess('/employee/leave', permissions).allowed).toBe(true);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // Internal Test Helpers
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('Internal Test Helpers', () => {
    it('_isCoreModule should return true for employees', () => {
      expect(_isCoreModule('employees')).toBe(true);
    });

    it('_isCoreModule should return false for assets', () => {
      expect(_isCoreModule('assets')).toBe(false);
    });

    it('_getModuleRouteMap should return readonly array', () => {
      const routeMap = _getModuleRouteMap();
      expect(Array.isArray(routeMap)).toBe(true);
      expect(routeMap.length).toBeGreaterThan(0);
    });

    it('_getPermissionRouteMap should return readonly array', () => {
      const routeMap = _getPermissionRouteMap();
      expect(Array.isArray(routeMap)).toBe(true);
      expect(routeMap.length).toBeGreaterThan(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // Route Map Sync Verification
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('Route Map Sync Verification', () => {
    it('should have at least 8 module route entries', () => {
      const routeMap = _getModuleRouteMap();
      // Count unique modules
      const modules = new Set(routeMap.map(r => r.moduleId));
      expect(modules.size).toBeGreaterThanOrEqual(8);
    });

    it('should have all expected modules in route map', () => {
      const routeMap = _getModuleRouteMap();
      const modules = new Set(routeMap.map(r => r.moduleId));

      expect(modules.has('assets')).toBe(true);
      expect(modules.has('subscriptions')).toBe(true);
      expect(modules.has('suppliers')).toBe(true);
      expect(modules.has('employees')).toBe(true);
      expect(modules.has('leave')).toBe(true);
      expect(modules.has('payroll')).toBe(true);
      expect(modules.has('spend-requests')).toBe(true);
      expect(modules.has('documents')).toBe(true);
    });

    it('should have admin, employee, and API routes for assets', () => {
      const routeMap = _getModuleRouteMap();
      const assetRoutes = routeMap.filter(r => r.moduleId === 'assets');

      const hasAdmin = assetRoutes.some(r => r.prefix.startsWith('/admin/'));
      const hasEmployee = assetRoutes.some(r => r.prefix.startsWith('/employee/'));
      const hasApi = assetRoutes.some(r => r.prefix.startsWith('/api/'));

      expect(hasAdmin).toBe(true);
      expect(hasEmployee).toBe(true);
      expect(hasApi).toBe(true);
    });
  });
});
