/**
 * Role Utilities Tests
 *
 * Tests for the role derivation utilities in access-control module.
 */

import {
  deriveOrgRole,
  deriveDisplayRole,
  isAdminOrOwner,
  hasElevatedPrivileges,
  ORG_ROLES,
  DISPLAY_ROLES,
} from '@/lib/access-control';

describe('Role Utilities', () => {
  describe('deriveOrgRole (4-tier)', () => {
    it('should return OWNER when isOwner is true', () => {
      expect(deriveOrgRole({ isOwner: true, isAdmin: false })).toBe(ORG_ROLES.OWNER);
      expect(deriveOrgRole({ isOwner: true, isAdmin: true })).toBe(ORG_ROLES.OWNER); // isOwner takes precedence
    });

    it('should return ADMIN when isAdmin is true and isOwner is false', () => {
      expect(deriveOrgRole({ isOwner: false, isAdmin: true })).toBe(ORG_ROLES.ADMIN);
      expect(deriveOrgRole({ isAdmin: true })).toBe(ORG_ROLES.ADMIN);
    });

    it('should return MEMBER when neither isOwner nor isAdmin is true', () => {
      expect(deriveOrgRole({ isOwner: false, isAdmin: false })).toBe(ORG_ROLES.MEMBER);
      expect(deriveOrgRole({})).toBe(ORG_ROLES.MEMBER);
    });

    it('should handle undefined values gracefully', () => {
      expect(deriveOrgRole({ isOwner: undefined, isAdmin: undefined })).toBe(ORG_ROLES.MEMBER);
    });
  });

  describe('deriveDisplayRole (7-tier)', () => {
    it('should prioritize OWNER over everything', () => {
      expect(
        deriveDisplayRole({
          isOwner: true,
          isAdmin: true,
          hasHRAccess: true,
          hasFinanceAccess: true,
          hasOperationsAccess: true,
        })
      ).toBe(DISPLAY_ROLES.OWNER);
    });

    it('should prioritize ADMIN after OWNER', () => {
      expect(
        deriveDisplayRole({
          isAdmin: true,
          hasHRAccess: true,
          hasFinanceAccess: true,
        })
      ).toBe(DISPLAY_ROLES.ADMIN);
    });

    it('should return MANAGER when isManager or canApprove is true', () => {
      expect(deriveDisplayRole({ isManager: true })).toBe(DISPLAY_ROLES.MANAGER);
      expect(deriveDisplayRole({ canApprove: true })).toBe(DISPLAY_ROLES.MANAGER);
    });

    it('should return HR when hasHRAccess is true', () => {
      expect(deriveDisplayRole({ hasHRAccess: true })).toBe(DISPLAY_ROLES.HR);
    });

    it('should return FINANCE when hasFinanceAccess is true', () => {
      expect(deriveDisplayRole({ hasFinanceAccess: true })).toBe(DISPLAY_ROLES.FINANCE);
    });

    it('should return OPERATIONS when hasOperationsAccess is true', () => {
      expect(deriveDisplayRole({ hasOperationsAccess: true })).toBe(DISPLAY_ROLES.OPERATIONS);
    });

    it('should return EMPLOYEE when no special access', () => {
      expect(deriveDisplayRole({})).toBe(DISPLAY_ROLES.EMPLOYEE);
    });

    it('should respect priority order: HR > FINANCE > OPERATIONS', () => {
      expect(
        deriveDisplayRole({
          hasHRAccess: true,
          hasFinanceAccess: true,
          hasOperationsAccess: true,
        })
      ).toBe(DISPLAY_ROLES.HR);

      expect(
        deriveDisplayRole({
          hasFinanceAccess: true,
          hasOperationsAccess: true,
        })
      ).toBe(DISPLAY_ROLES.FINANCE);
    });
  });

  describe('isAdminOrOwner', () => {
    it('should return true for owner', () => {
      expect(isAdminOrOwner({ isOwner: true })).toBe(true);
    });

    it('should return true for admin', () => {
      expect(isAdminOrOwner({ isAdmin: true })).toBe(true);
    });

    it('should return true when both are true', () => {
      expect(isAdminOrOwner({ isOwner: true, isAdmin: true })).toBe(true);
    });

    it('should return false for regular member', () => {
      expect(isAdminOrOwner({})).toBe(false);
      expect(isAdminOrOwner({ isOwner: false, isAdmin: false })).toBe(false);
    });
  });

  describe('hasElevatedPrivileges', () => {
    it('should return true for owner', () => {
      expect(hasElevatedPrivileges({ isOwner: true })).toBe(true);
    });

    it('should return true for admin', () => {
      expect(hasElevatedPrivileges({ isAdmin: true })).toBe(true);
    });

    it('should return true for manager', () => {
      expect(hasElevatedPrivileges({ isManager: true })).toBe(true);
    });

    it('should return false for regular member', () => {
      expect(hasElevatedPrivileges({})).toBe(false);
    });
  });

  describe('ORG_ROLES constants', () => {
    it('should have all 4 roles', () => {
      expect(Object.keys(ORG_ROLES)).toEqual(['OWNER', 'ADMIN', 'MANAGER', 'MEMBER']);
    });

    it('should have correct string values', () => {
      expect(ORG_ROLES.OWNER).toBe('OWNER');
      expect(ORG_ROLES.ADMIN).toBe('ADMIN');
      expect(ORG_ROLES.MANAGER).toBe('MANAGER');
      expect(ORG_ROLES.MEMBER).toBe('MEMBER');
    });
  });

  describe('DISPLAY_ROLES constants', () => {
    it('should have all 7 roles', () => {
      expect(Object.keys(DISPLAY_ROLES)).toEqual([
        'OWNER',
        'ADMIN',
        'MANAGER',
        'HR',
        'FINANCE',
        'OPERATIONS',
        'EMPLOYEE',
      ]);
    });

    it('should have correct string values', () => {
      expect(DISPLAY_ROLES.OWNER).toBe('OWNER');
      expect(DISPLAY_ROLES.ADMIN).toBe('ADMIN');
      expect(DISPLAY_ROLES.MANAGER).toBe('MANAGER');
      expect(DISPLAY_ROLES.HR).toBe('HR');
      expect(DISPLAY_ROLES.FINANCE).toBe('FINANCE');
      expect(DISPLAY_ROLES.OPERATIONS).toBe('OPERATIONS');
      expect(DISPLAY_ROLES.EMPLOYEE).toBe('EMPLOYEE');
    });
  });
});
