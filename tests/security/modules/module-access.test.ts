/**
 * @file module-access.test.ts
 * @description Security tests for module access control
 *
 * These tests verify that module access controls cannot be bypassed through:
 * - Invalid module IDs
 * - Case variations in routes
 * - Unknown or malformed routes
 */

import {
  getModuleForRoute,
  checkRouteModuleAccess,
  _isCoreModule,
} from '@/lib/modules/routes';
import { isValidModuleId } from '@/lib/modules/registry';

describe('Module Access Security Tests', () => {
  describe('Invalid module IDs rejected', () => {
    it('should reject empty string as module ID', () => {
      expect(isValidModuleId('')).toBe(false);
    });

    it('should reject null-like strings as module ID', () => {
      expect(isValidModuleId('null')).toBe(false);
      expect(isValidModuleId('undefined')).toBe(false);
    });

    it('should reject SQL injection attempts as module ID', () => {
      expect(isValidModuleId("'; DROP TABLE modules; --")).toBe(false);
      expect(isValidModuleId('1 OR 1=1')).toBe(false);
      expect(isValidModuleId("' OR '1'='1")).toBe(false);
    });

    it('should reject path traversal attempts as module ID', () => {
      expect(isValidModuleId('../../../etc/passwd')).toBe(false);
      expect(isValidModuleId('..\\..\\..\\windows\\system32')).toBe(false);
    });

    it('should reject module IDs with special characters', () => {
      expect(isValidModuleId('assets<script>')).toBe(false);
      expect(isValidModuleId('assets&admin')).toBe(false);
      expect(isValidModuleId('assets|payroll')).toBe(false);
    });

    it('should reject uppercase variations of valid module IDs', () => {
      // Module IDs are case-sensitive and must be lowercase
      expect(isValidModuleId('ASSETS')).toBe(false);
      expect(isValidModuleId('Assets')).toBe(false);
      expect(isValidModuleId('EMPLOYEES')).toBe(false);
    });

    it('should reject module IDs with whitespace', () => {
      expect(isValidModuleId(' assets')).toBe(false);
      expect(isValidModuleId('assets ')).toBe(false);
      expect(isValidModuleId('assets employees')).toBe(false);
      expect(isValidModuleId('\tassets')).toBe(false);
      expect(isValidModuleId('assets\n')).toBe(false);
    });

    it('should not grant access when enabledModules contains invalid IDs', () => {
      // User might try to inject invalid module IDs to bypass checks
      const result = checkRouteModuleAccess('/admin/payroll', ['PAYROLL', 'payroll-bypass', '../payroll']);
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('not_installed');
    });

    it('should not be fooled by similar-looking module IDs', () => {
      // Unicode homograph attacks
      expect(isValidModuleId('аssets')).toBe(false); // Cyrillic 'а' instead of Latin 'a'
      expect(isValidModuleId('assеts')).toBe(false); // Cyrillic 'е' instead of Latin 'e'
    });
  });

  describe('Case variations in routes do not bypass protection', () => {
    it('should protect /ADMIN/ASSETS same as /admin/assets', () => {
      const lowercase = getModuleForRoute('/admin/assets');
      const uppercase = getModuleForRoute('/ADMIN/ASSETS');
      const mixed = getModuleForRoute('/Admin/Assets');

      expect(lowercase).toBe('assets');
      expect(uppercase).toBe('assets');
      expect(mixed).toBe('assets');
    });

    it('should protect /ADMIN/LEAVE same as /admin/leave', () => {
      const lowercase = getModuleForRoute('/admin/leave');
      const uppercase = getModuleForRoute('/ADMIN/LEAVE');
      const mixed = getModuleForRoute('/Admin/Leave');

      expect(lowercase).toBe('leave');
      expect(uppercase).toBe('leave');
      expect(mixed).toBe('leave');
    });

    it('should protect /API/PAYROLL same as /api/payroll', () => {
      const lowercase = getModuleForRoute('/api/payroll');
      const uppercase = getModuleForRoute('/API/PAYROLL');
      const mixed = getModuleForRoute('/Api/Payroll');

      expect(lowercase).toBe('payroll');
      expect(uppercase).toBe('payroll');
      expect(mixed).toBe('payroll');
    });

    it('should block uppercase route when module not installed', () => {
      const result = checkRouteModuleAccess('/ADMIN/PAYROLL', ['employees']);
      expect(result.allowed).toBe(false);
      expect(result.moduleId).toBe('payroll');
    });

    it('should allow uppercase route when module is installed', () => {
      const result = checkRouteModuleAccess('/ADMIN/ASSETS', ['assets']);
      expect(result.allowed).toBe(true);
    });

    it('should handle deeply nested routes with case variations', () => {
      expect(getModuleForRoute('/ADMIN/ASSETS/123/EDIT')).toBe('assets');
      expect(getModuleForRoute('/Api/Leave/Requests/456/Approve')).toBe('leave');
      expect(getModuleForRoute('/EMPLOYEE/PAYROLL/PAYSLIPS')).toBe('payroll');
    });
  });

  describe('Unknown routes return null (no false positives)', () => {
    it('should return null for completely unknown routes', () => {
      expect(getModuleForRoute('/admin/unknown')).toBeNull();
      expect(getModuleForRoute('/admin/fake-module')).toBeNull();
      expect(getModuleForRoute('/api/nonexistent')).toBeNull();
    });

    it('should return null for root paths', () => {
      expect(getModuleForRoute('/')).toBeNull();
      expect(getModuleForRoute('/admin')).toBeNull();
      expect(getModuleForRoute('/employee')).toBeNull();
      expect(getModuleForRoute('/api')).toBeNull();
    });

    it('should return null for system routes that should not be module-protected', () => {
      expect(getModuleForRoute('/admin/settings')).toBeNull();
      expect(getModuleForRoute('/admin/users')).toBeNull();
      expect(getModuleForRoute('/admin/billing')).toBeNull();
      expect(getModuleForRoute('/api/auth')).toBeNull();
      expect(getModuleForRoute('/api/settings')).toBeNull();
    });

    it('should return null for marketing/public routes', () => {
      expect(getModuleForRoute('/pricing')).toBeNull();
      expect(getModuleForRoute('/features')).toBeNull();
      expect(getModuleForRoute('/login')).toBeNull();
      expect(getModuleForRoute('/signup')).toBeNull();
    });

    it('should allow access to unknown routes (not module-protected)', () => {
      const result = checkRouteModuleAccess('/admin/settings', []);
      expect(result.allowed).toBe(true);
    });

    it('should not match partial prefixes that are not module routes', () => {
      // /admin/asset should not match /admin/assets
      expect(getModuleForRoute('/admin/asset')).toBeNull();
      // /admin/employ should not match /admin/employees
      expect(getModuleForRoute('/admin/employ')).toBeNull();
      // /api/leav should not match /api/leave
      expect(getModuleForRoute('/api/leav')).toBeNull();
    });

    it('should not match routes with extra characters at the end without separator', () => {
      // /admin/assetsxxx should not match /admin/assets
      expect(getModuleForRoute('/admin/assetsxxx')).toBeNull();
      // /admin/employeestest should not match /admin/employees
      expect(getModuleForRoute('/admin/employeestest')).toBeNull();
    });
  });

  describe('Query string handling security', () => {
    it('should strip query strings before route matching', () => {
      expect(getModuleForRoute('/admin/assets?id=1')).toBe('assets');
      expect(getModuleForRoute('/admin/assets?module=payroll')).toBe('assets');
    });

    it('should not allow query string injection to change module', () => {
      // Attacker might try to inject a different module via query string
      const result = checkRouteModuleAccess('/admin/assets?bypass=true&module=payroll', ['payroll']);
      expect(result.allowed).toBe(false); // assets module not enabled
      expect(result.moduleId).toBe('assets'); // correctly identified as assets
    });

    it('should handle URL-encoded query strings', () => {
      expect(getModuleForRoute('/admin/assets?filter=%3Cscript%3E')).toBe('assets');
      expect(getModuleForRoute('/admin/leave?type=sick%20leave')).toBe('leave');
    });

    it('should not match routes with fragments (fragments are client-side only)', () => {
      // Fragments (#) are never sent to the server, so if they appear in a pathname
      // it's likely a bug or attack. The current implementation doesn't strip them,
      // which is acceptable since they shouldn't appear in server-side paths.
      // This test documents the current behavior.
      expect(getModuleForRoute('/admin/assets#section')).toBeNull();
    });
  });

  describe('Core module security', () => {
    it('should always allow access to core modules', () => {
      // Even with empty enabledModules, core modules should be accessible
      const result = checkRouteModuleAccess('/admin/employees', []);
      expect(result.allowed).toBe(true);
    });

    it('should identify employees as a core module', () => {
      expect(_isCoreModule('employees')).toBe(true);
    });

    it('should not identify non-core modules as core', () => {
      expect(_isCoreModule('assets')).toBe(false);
      expect(_isCoreModule('leave')).toBe(false);
      expect(_isCoreModule('payroll')).toBe(false);
    });

    it('should not allow forging core module status', () => {
      // Invalid strings should not be considered core
      expect(_isCoreModule('EMPLOYEES')).toBe(false);
      expect(_isCoreModule('employees ')).toBe(false);
      expect(_isCoreModule('')).toBe(false);
    });
  });

  describe('Path traversal protection', () => {
    it('should not allow path traversal to access protected routes', () => {
      // These should not match any module
      expect(getModuleForRoute('/admin/../admin/assets')).toBeNull();
      expect(getModuleForRoute('/admin/./assets')).toBeNull();
      expect(getModuleForRoute('/../admin/assets')).toBeNull();
    });

    it('should not allow double slashes to bypass protection', () => {
      // Double slashes might confuse some routers
      expect(getModuleForRoute('//admin/assets')).toBeNull();
      expect(getModuleForRoute('/admin//assets')).toBeNull();
    });
  });
});
