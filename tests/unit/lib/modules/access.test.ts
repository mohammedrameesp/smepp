/**
 * @file access.test.ts
 * @description Tests for module access control utilities
 */

// Mock the auth module before importing anything that depends on it
jest.mock('@/lib/core/auth', () => ({
  authOptions: {},
}));

// Mock next-auth/next
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(),
}));

import {
  hasModuleAccess,
  isRouteAccessible,
  getProtectedModuleForPath,
  getModuleNotInstalledRedirect,
} from '@/lib/modules/access';

describe('Module Access Tests', () => {
  // ═══════════════════════════════════════════════════════════════════════════════
  // hasModuleAccess
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('hasModuleAccess', () => {
    describe('Valid Module IDs', () => {
      it('should return true when module is in enabled list', () => {
        expect(hasModuleAccess('assets', ['assets', 'subscriptions'])).toBe(true);
        expect(hasModuleAccess('leave', ['leave', 'employees'])).toBe(true);
        expect(hasModuleAccess('payroll', ['payroll'])).toBe(true);
      });

      it('should return false when module is not in enabled list', () => {
        expect(hasModuleAccess('assets', ['subscriptions'])).toBe(false);
        expect(hasModuleAccess('leave', ['assets'])).toBe(false);
        expect(hasModuleAccess('payroll', [])).toBe(false);
      });
    });

    describe('Core Modules', () => {
      it('should return true for employees (core) even without it in list', () => {
        expect(hasModuleAccess('employees', [])).toBe(true);
        expect(hasModuleAccess('employees', ['assets'])).toBe(true);
      });
    });

    describe('Invalid Module IDs (Security)', () => {
      it('should return false for invalid module IDs', () => {
        expect(hasModuleAccess('invalid-module', ['invalid-module'])).toBe(false);
        expect(hasModuleAccess('', [''])).toBe(false);
        expect(hasModuleAccess('ASSETS', ['ASSETS'])).toBe(false); // Case sensitive ID
      });

      it('should return false for SQL injection attempts', () => {
        expect(hasModuleAccess("'; DROP TABLE modules; --", [])).toBe(false);
        expect(hasModuleAccess('<script>alert(1)</script>', [])).toBe(false);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // isRouteAccessible
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('isRouteAccessible', () => {
    describe('Unprotected Routes', () => {
      it('should allow access to /admin/settings', () => {
        const result = isRouteAccessible('/admin/settings', []);
        expect(result.allowed).toBe(true);
      });

      it('should allow access to /admin', () => {
        const result = isRouteAccessible('/admin', []);
        expect(result.allowed).toBe(true);
      });

      it('should allow access to /api/auth', () => {
        const result = isRouteAccessible('/api/auth', []);
        expect(result.allowed).toBe(true);
      });
    });

    describe('Module Protected Routes', () => {
      it('should allow /admin/assets when assets is enabled', () => {
        const result = isRouteAccessible('/admin/assets', ['assets']);
        expect(result.allowed).toBe(true);
        expect(result.moduleId).toBe('assets');
        expect(result.moduleName).toBe('Asset Management');
      });

      it('should block /admin/assets when assets not enabled', () => {
        const result = isRouteAccessible('/admin/assets', ['leave']);
        expect(result.allowed).toBe(false);
        expect(result.moduleId).toBe('assets');
        expect(result.reason).toContain('not installed');
      });

      it('should allow /admin/leave when leave is enabled', () => {
        const result = isRouteAccessible('/admin/leave', ['leave']);
        expect(result.allowed).toBe(true);
        expect(result.moduleId).toBe('leave');
      });

      it('should block /admin/leave when leave not enabled', () => {
        const result = isRouteAccessible('/admin/leave', ['assets']);
        expect(result.allowed).toBe(false);
        expect(result.moduleName).toBe('Leave Management');
      });
    });

    describe('Core Module Routes', () => {
      it('should allow /admin/employees (core module) without any modules enabled', () => {
        const result = isRouteAccessible('/admin/employees', []);
        expect(result.allowed).toBe(true);
        expect(result.moduleId).toBe('employees');
      });

      it('should allow /api/employees (core module) without any modules enabled', () => {
        const result = isRouteAccessible('/api/employees', []);
        expect(result.allowed).toBe(true);
      });
    });

    describe('Nested Routes', () => {
      it('should check /admin/assets/123 against assets module', () => {
        const result = isRouteAccessible('/admin/assets/123', ['assets']);
        expect(result.allowed).toBe(true);
      });

      it('should block /admin/leave/requests/456 when leave not enabled', () => {
        const result = isRouteAccessible('/admin/leave/requests/456', []);
        expect(result.allowed).toBe(false);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // getProtectedModuleForPath
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('getProtectedModuleForPath', () => {
    describe('Admin Routes', () => {
      it('should return assets for /admin/assets', () => {
        expect(getProtectedModuleForPath('/admin/assets')).toBe('assets');
      });

      it('should return leave for /admin/leave', () => {
        expect(getProtectedModuleForPath('/admin/leave')).toBe('leave');
      });

      it('should return payroll for /admin/payroll', () => {
        expect(getProtectedModuleForPath('/admin/payroll')).toBe('payroll');
      });

      it('should return documents for /admin/company-documents', () => {
        expect(getProtectedModuleForPath('/admin/company-documents')).toBe('documents');
      });
    });

    describe('Employee Routes', () => {
      it('should return assets for /employee/assets', () => {
        expect(getProtectedModuleForPath('/employee/assets')).toBe('assets');
      });

      it('should return leave for /employee/leave', () => {
        expect(getProtectedModuleForPath('/employee/leave')).toBe('leave');
      });
    });

    describe('API Routes', () => {
      it('should return assets for /api/assets', () => {
        expect(getProtectedModuleForPath('/api/assets')).toBe('assets');
      });

      it('should return leave for /api/leave', () => {
        expect(getProtectedModuleForPath('/api/leave')).toBe('leave');
      });

      it('should return payroll for /api/payroll', () => {
        expect(getProtectedModuleForPath('/api/payroll')).toBe('payroll');
      });

      it('should return documents for /api/company-documents', () => {
        expect(getProtectedModuleForPath('/api/company-documents')).toBe('documents');
      });
    });

    describe('Core Modules (Always Accessible)', () => {
      it('should return null for /admin/employees (core module)', () => {
        // Core modules should not be "protected" since they're always accessible
        expect(getProtectedModuleForPath('/admin/employees')).toBeNull();
      });

      it('should return null for /api/employees (core module)', () => {
        expect(getProtectedModuleForPath('/api/employees')).toBeNull();
      });
    });

    describe('Unprotected Routes', () => {
      it('should return null for /admin/settings', () => {
        expect(getProtectedModuleForPath('/admin/settings')).toBeNull();
      });

      it('should return null for /admin', () => {
        expect(getProtectedModuleForPath('/admin')).toBeNull();
      });

      it('should return null for /api/auth', () => {
        expect(getProtectedModuleForPath('/api/auth')).toBeNull();
      });
    });

    describe('Case Insensitive Matching (Security)', () => {
      it('should match /Admin/Assets (mixed case)', () => {
        expect(getProtectedModuleForPath('/Admin/Assets')).toBe('assets');
      });

      it('should match /ADMIN/LEAVE (all uppercase)', () => {
        expect(getProtectedModuleForPath('/ADMIN/LEAVE')).toBe('leave');
      });

      it('should match /api/PAYROLL (mixed case API)', () => {
        expect(getProtectedModuleForPath('/api/PAYROLL')).toBe('payroll');
      });
    });

    describe('Query String and Trailing Slash Handling', () => {
      it('should strip query string', () => {
        expect(getProtectedModuleForPath('/admin/assets?sort=name')).toBe('assets');
      });

      it('should strip trailing slash', () => {
        expect(getProtectedModuleForPath('/admin/assets/')).toBe('assets');
      });

      it('should handle both query and trailing slash', () => {
        expect(getProtectedModuleForPath('/admin/leave/?page=1')).toBe('leave');
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // getModuleNotInstalledRedirect
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('getModuleNotInstalledRedirect', () => {
    it('should return correct redirect URL for valid module', () => {
      expect(getModuleNotInstalledRedirect('payroll')).toBe('/admin/modules?install=payroll');
    });

    it('should return correct redirect URL for assets', () => {
      expect(getModuleNotInstalledRedirect('assets')).toBe('/admin/modules?install=assets');
    });

    it('should encode special characters in module ID', () => {
      const result = getModuleNotInstalledRedirect('module with spaces');
      expect(result).toBe('/admin/modules?install=module%20with%20spaces');
    });

    it('should encode URL-unsafe characters', () => {
      const result = getModuleNotInstalledRedirect('module&param=value');
      expect(result).toBe('/admin/modules?install=module%26param%3Dvalue');
    });

    it('should handle injection attempts safely', () => {
      const result = getModuleNotInstalledRedirect('<script>');
      expect(result).toBe('/admin/modules?install=%3Cscript%3E');
      expect(result).not.toContain('<script>');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // Integration Tests
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('Integration Tests', () => {
    it('should have consistent behavior between hasModuleAccess and isRouteAccessible', () => {
      const enabledModules = ['assets', 'leave'];

      // assets should be accessible
      expect(hasModuleAccess('assets', enabledModules)).toBe(true);
      expect(isRouteAccessible('/admin/assets', enabledModules).allowed).toBe(true);

      // payroll should not be accessible
      expect(hasModuleAccess('payroll', enabledModules)).toBe(false);
      expect(isRouteAccessible('/admin/payroll', enabledModules).allowed).toBe(false);
    });

    it('should have consistent behavior for core modules', () => {
      const enabledModules: string[] = [];

      // employees (core) should be accessible through all functions
      expect(hasModuleAccess('employees', enabledModules)).toBe(true);
      expect(isRouteAccessible('/admin/employees', enabledModules).allowed).toBe(true);
      expect(getProtectedModuleForPath('/admin/employees')).toBeNull(); // Not "protected" since always accessible
    });
  });
});
