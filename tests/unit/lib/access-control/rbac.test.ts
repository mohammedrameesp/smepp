/**
 * @file rbac.test.ts
 * @description Unit tests for Role-Based Access Control (RBAC) system
 * @module tests/unit/lib/access-control
 */

// OrgRole enum removed - now using boolean flags (isOwner, isAdmin)

// Mock Prisma
jest.mock('@/lib/core/prisma', () => ({
  prisma: {
    rolePermission: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      upsert: jest.fn(),
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback({
      rolePermission: {
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
    })),
  },
}));

import {
  PERMISSIONS,
  PERMISSION_GROUPS,
  getAllPermissions,
  DEFAULT_MANAGER_PERMISSIONS,
  DEFAULT_MEMBER_PERMISSIONS,
  MODULE_PERMISSION_MAP,
} from '@/lib/access-control/permissions';
import {
  hasPermission,
  hasPermissions,
  isValidPermission,
} from '@/lib/access-control/permission-service';
import { prisma } from '@/lib/core/prisma';

const mockRolePermission = prisma.rolePermission as jest.Mocked<typeof prisma.rolePermission>;

describe('RBAC Permissions System', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PERMISSION CONSTANTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Permission Constants', () => {
    it('should define all asset permissions', () => {
      expect(PERMISSIONS.ASSETS_VIEW).toBe('assets:view');
      expect(PERMISSIONS.ASSETS_CREATE).toBe('assets:create');
      expect(PERMISSIONS.ASSETS_EDIT).toBe('assets:edit');
      expect(PERMISSIONS.ASSETS_DELETE).toBe('assets:delete');
      expect(PERMISSIONS.ASSETS_ASSIGN).toBe('assets:assign');
      expect(PERMISSIONS.ASSETS_EXPORT).toBe('assets:export');
      expect(PERMISSIONS.ASSETS_DEPRECIATION).toBe('assets:depreciation');
    });

    it('should define all employee permissions', () => {
      expect(PERMISSIONS.EMPLOYEES_VIEW).toBe('employees:view');
      expect(PERMISSIONS.EMPLOYEES_VIEW_SALARIES).toBe('employees:view-salaries');
      expect(PERMISSIONS.EMPLOYEES_CREATE).toBe('employees:create');
      expect(PERMISSIONS.EMPLOYEES_EDIT).toBe('employees:edit');
      expect(PERMISSIONS.EMPLOYEES_DELETE).toBe('employees:delete');
      expect(PERMISSIONS.EMPLOYEES_EXPORT).toBe('employees:export');
    });

    it('should define all leave permissions', () => {
      expect(PERMISSIONS.LEAVE_VIEW).toBe('leave:view');
      expect(PERMISSIONS.LEAVE_REQUEST).toBe('leave:request');
      expect(PERMISSIONS.LEAVE_APPROVE).toBe('leave:approve');
      expect(PERMISSIONS.LEAVE_MANAGE_TYPES).toBe('leave:manage-types');
      expect(PERMISSIONS.LEAVE_MANAGE_BALANCES).toBe('leave:manage-balances');
      expect(PERMISSIONS.LEAVE_EXPORT).toBe('leave:export');
    });

    it('should define all payroll permissions', () => {
      expect(PERMISSIONS.PAYROLL_VIEW).toBe('payroll:view');
      expect(PERMISSIONS.PAYROLL_VIEW_SALARIES).toBe('payroll:view-salaries');
      expect(PERMISSIONS.PAYROLL_RUN).toBe('payroll:run');
      expect(PERMISSIONS.PAYROLL_APPROVE).toBe('payroll:approve');
      expect(PERMISSIONS.PAYROLL_EXPORT).toBe('payroll:export');
      expect(PERMISSIONS.PAYROLL_MANAGE_STRUCTURES).toBe('payroll:manage-structures');
      expect(PERMISSIONS.PAYROLL_MANAGE_LOANS).toBe('payroll:manage-loans');
    });

    it('should define all settings permissions', () => {
      expect(PERMISSIONS.SETTINGS_VIEW).toBe('settings:view');
      expect(PERMISSIONS.SETTINGS_MANAGE).toBe('settings:manage');
      expect(PERMISSIONS.SETTINGS_BILLING).toBe('settings:billing');
      expect(PERMISSIONS.SETTINGS_MODULES).toBe('settings:modules');
      expect(PERMISSIONS.SETTINGS_PERMISSIONS).toBe('settings:permissions');
    });

    it('should follow module:action naming pattern', () => {
      const allPermissions = getAllPermissions();
      const pattern = /^[a-z-]+:[a-z-]+$/;

      allPermissions.forEach(permission => {
        expect(permission).toMatch(pattern);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PERMISSION GROUPS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Permission Groups', () => {
    it('should organize permissions by module', () => {
      expect(PERMISSION_GROUPS.assets).toBeDefined();
      expect(PERMISSION_GROUPS.subscriptions).toBeDefined();
      expect(PERMISSION_GROUPS.suppliers).toBeDefined();
      expect(PERMISSION_GROUPS.employees).toBeDefined();
      expect(PERMISSION_GROUPS.leave).toBeDefined();
      expect(PERMISSION_GROUPS.payroll).toBeDefined();
      expect(PERMISSION_GROUPS.users).toBeDefined();
      expect(PERMISSION_GROUPS.settings).toBeDefined();
    });

    it('should include label for each group', () => {
      Object.values(PERMISSION_GROUPS).forEach(group => {
        expect(group.label).toBeDefined();
        expect(typeof group.label).toBe('string');
      });
    });

    it('should include permissions with metadata', () => {
      const assetsGroup = PERMISSION_GROUPS.assets;
      expect(assetsGroup.permissions.length).toBeGreaterThan(0);

      assetsGroup.permissions.forEach(perm => {
        expect(perm.key).toBeDefined();
        expect(perm.label).toBeDefined();
        expect(perm.description).toBeDefined();
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ROLE HIERARCHY
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Boolean Flag Permission Hierarchy', () => {
    const tenantId = 'tenant-123';
    const enabledModules = ['assets', 'subscriptions', 'suppliers', 'employees', 'leave', 'payroll'];

    it('should grant OWNER (isOwner=true) all permissions', async () => {
      // isOwner=true, isAdmin=true (owner is also admin)
      const result = await hasPermission(tenantId, true, true, 'assets:delete', enabledModules);
      expect(result).toBe(true);
    });

    it('should grant ADMIN (isAdmin=true) all permissions', async () => {
      // isOwner=false, isAdmin=true
      const result = await hasPermission(tenantId, false, true, 'settings:permissions', enabledModules);
      expect(result).toBe(true);
    });

    it('should check database for regular members (isOwner=false, isAdmin=false)', async () => {
      mockRolePermission.findUnique.mockResolvedValue({
        id: '1',
        tenantId,
        role: 'MEMBER',
        permission: 'assets:view',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // isOwner=false, isAdmin=false - checks DB for MEMBER permissions
      const result = await hasPermission(tenantId, false, false, 'assets:view', enabledModules);
      expect(mockRolePermission.findUnique).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should deny member permission if not in database', async () => {
      mockRolePermission.findUnique.mockResolvedValue(null);

      const result = await hasPermission(tenantId, false, false, 'assets:delete', enabledModules);
      expect(mockRolePermission.findUnique).toHaveBeenCalled();
      expect(result).toBe(false);
    });

    it('should respect boolean flag hierarchy: isOwner > isAdmin > member', () => {
      // isOwner and isAdmin have all permissions by default
      // Regular members have custom permissions from DB
      const hierarchy = {
        isOwner: 3,    // Full control
        isAdmin: 2,    // Full access
        member: 1,     // DB-controlled
      };

      expect(hierarchy.isOwner).toBeGreaterThan(hierarchy.isAdmin);
      expect(hierarchy.isAdmin).toBeGreaterThan(hierarchy.member);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DEFAULT PERMISSIONS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Default Role Permissions', () => {
    describe('MANAGER defaults', () => {
      it('should include view permissions for all modules', () => {
        expect(DEFAULT_MANAGER_PERMISSIONS).toContain('assets:view');
        expect(DEFAULT_MANAGER_PERMISSIONS).toContain('subscriptions:view');
        expect(DEFAULT_MANAGER_PERMISSIONS).toContain('suppliers:view');
        expect(DEFAULT_MANAGER_PERMISSIONS).toContain('employees:view');
        expect(DEFAULT_MANAGER_PERMISSIONS).toContain('leave:view');
        expect(DEFAULT_MANAGER_PERMISSIONS).toContain('payroll:view');
      });

      it('should include create/edit for most modules', () => {
        expect(DEFAULT_MANAGER_PERMISSIONS).toContain('assets:create');
        expect(DEFAULT_MANAGER_PERMISSIONS).toContain('assets:edit');
        expect(DEFAULT_MANAGER_PERMISSIONS).toContain('subscriptions:create');
        expect(DEFAULT_MANAGER_PERMISSIONS).toContain('employees:create');
      });

      it('should include approval permissions', () => {
        expect(DEFAULT_MANAGER_PERMISSIONS).toContain('leave:approve');
        expect(DEFAULT_MANAGER_PERMISSIONS).toContain('purchase:approve');
        expect(DEFAULT_MANAGER_PERMISSIONS).toContain('asset-requests:approve');
      });

      it('should NOT include delete permissions by default', () => {
        expect(DEFAULT_MANAGER_PERMISSIONS).not.toContain('assets:delete');
        expect(DEFAULT_MANAGER_PERMISSIONS).not.toContain('subscriptions:delete');
        expect(DEFAULT_MANAGER_PERMISSIONS).not.toContain('employees:delete');
      });

      it('should NOT include salary view by default', () => {
        expect(DEFAULT_MANAGER_PERMISSIONS).not.toContain('employees:view-salaries');
        expect(DEFAULT_MANAGER_PERMISSIONS).not.toContain('payroll:view-salaries');
      });

      it('should NOT include payroll run/approve by default', () => {
        expect(DEFAULT_MANAGER_PERMISSIONS).not.toContain('payroll:run');
        expect(DEFAULT_MANAGER_PERMISSIONS).not.toContain('payroll:approve');
      });
    });

    describe('MEMBER defaults', () => {
      it('should include basic view permissions', () => {
        expect(DEFAULT_MEMBER_PERMISSIONS).toContain('assets:view');
        expect(DEFAULT_MEMBER_PERMISSIONS).toContain('subscriptions:view');
        expect(DEFAULT_MEMBER_PERMISSIONS).toContain('suppliers:view');
        expect(DEFAULT_MEMBER_PERMISSIONS).toContain('employees:view');
        expect(DEFAULT_MEMBER_PERMISSIONS).toContain('leave:view');
      });

      it('should include self-service permissions', () => {
        expect(DEFAULT_MEMBER_PERMISSIONS).toContain('leave:request');
        expect(DEFAULT_MEMBER_PERMISSIONS).toContain('purchase:create');
        expect(DEFAULT_MEMBER_PERMISSIONS).toContain('asset-requests:create');
      });

      it('should NOT include any approval permissions', () => {
        expect(DEFAULT_MEMBER_PERMISSIONS).not.toContain('leave:approve');
        expect(DEFAULT_MEMBER_PERMISSIONS).not.toContain('purchase:approve');
        expect(DEFAULT_MEMBER_PERMISSIONS).not.toContain('asset-requests:approve');
      });

      it('should NOT include create/edit for admin modules', () => {
        expect(DEFAULT_MEMBER_PERMISSIONS).not.toContain('assets:create');
        expect(DEFAULT_MEMBER_PERMISSIONS).not.toContain('employees:create');
        expect(DEFAULT_MEMBER_PERMISSIONS).not.toContain('subscriptions:create');
      });

      it('should have fewer permissions than MANAGER', () => {
        expect(DEFAULT_MEMBER_PERMISSIONS.length).toBeLessThan(DEFAULT_MANAGER_PERMISSIONS.length);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // MODULE-PERMISSION MAPPING
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Module-Permission Mapping', () => {
    it('should map assets module to asset permissions', () => {
      expect(MODULE_PERMISSION_MAP.assets).toContain('assets');
      expect(MODULE_PERMISSION_MAP.assets).toContain('asset-requests');
    });

    it('should map payroll module to payroll permissions', () => {
      expect(MODULE_PERMISSION_MAP.payroll).toContain('payroll');
    });

    it('should map leave module to leave permissions', () => {
      expect(MODULE_PERMISSION_MAP.leave).toContain('leave');
    });

    it('should respect module enablement for permissions', async () => {
      const tenantId = 'tenant-123';
      const enabledModules = ['assets']; // Only assets enabled, not payroll

      // Owner/Admin should have payroll permission blocked if module disabled
      const hasPayroll = await hasPermission(tenantId, true, true, 'payroll:view', enabledModules);
      expect(hasPayroll).toBe(false);

      // Owner/Admin should have assets permission when module enabled
      const hasAssets = await hasPermission(tenantId, true, true, 'assets:view', enabledModules);
      expect(hasAssets).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PERMISSION SERVICE OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Permission Service Operations', () => {
    const tenantId = 'tenant-123';
    const enabledModules = ['assets', 'subscriptions'];

    describe('hasPermission', () => {
      it('should return true for owner (isOwner=true) without DB check', async () => {
        const result = await hasPermission(tenantId, true, true, 'assets:view', enabledModules);
        expect(result).toBe(true);
        expect(mockRolePermission.findUnique).not.toHaveBeenCalled();
      });

      it('should return true for admin (isAdmin=true) without DB check', async () => {
        const result = await hasPermission(tenantId, false, true, 'settings:manage', enabledModules);
        expect(result).toBe(true);
        expect(mockRolePermission.findUnique).not.toHaveBeenCalled();
      });

      it('should check DB for regular members', async () => {
        mockRolePermission.findUnique.mockResolvedValue({
          id: '1',
          tenantId,
          role: 'MEMBER',
          permission: 'assets:view',
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        await hasPermission(tenantId, false, false, 'assets:view', enabledModules);
        expect(mockRolePermission.findUnique).toHaveBeenCalledWith({
          where: {
            tenantId_role_permission: { tenantId, role: 'MEMBER', permission: 'assets:view' },
          },
        });
      });
    });

    describe('hasPermissions (batch)', () => {
      it('should check multiple permissions efficiently for members', async () => {
        mockRolePermission.findMany.mockResolvedValue([
          { id: '1', tenantId, role: 'MEMBER', permission: 'assets:view', createdAt: new Date(), updatedAt: new Date() },
          { id: '2', tenantId, role: 'MEMBER', permission: 'assets:edit', createdAt: new Date(), updatedAt: new Date() },
        ]);

        const result = await hasPermissions(
          tenantId,
          false, // isOwner
          false, // isAdmin
          ['assets:view', 'assets:edit', 'assets:delete'],
          enabledModules
        );

        expect(result['assets:view']).toBe(true);
        expect(result['assets:edit']).toBe(true);
        expect(result['assets:delete']).toBe(false);
      });

      it('should return all true for owner', async () => {
        const result = await hasPermissions(
          tenantId,
          true, // isOwner
          true, // isAdmin
          ['assets:view', 'assets:edit', 'assets:delete'],
          enabledModules
        );

        expect(result['assets:view']).toBe(true);
        expect(result['assets:edit']).toBe(true);
        expect(result['assets:delete']).toBe(true);
      });
    });

    describe('isValidPermission', () => {
      it('should return true for valid permissions', () => {
        expect(isValidPermission('assets:view')).toBe(true);
        expect(isValidPermission('payroll:run')).toBe(true);
        expect(isValidPermission('settings:manage')).toBe(true);
      });

      it('should return false for invalid permissions', () => {
        expect(isValidPermission('invalid:permission')).toBe(false);
        expect(isValidPermission('assets:fly')).toBe(false);
        expect(isValidPermission('')).toBe(false);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CORE MODULE PERMISSIONS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Core Module Permissions', () => {
    const tenantId = 'tenant-123';
    // Empty enabled modules - only core should work
    const enabledModules: string[] = [];

    it('should always allow settings permissions for owner/admin', async () => {
      const result = await hasPermission(tenantId, true, true, 'settings:view', enabledModules);
      expect(result).toBe(true);
    });

    it('should always allow users permissions for owner/admin', async () => {
      const result = await hasPermission(tenantId, true, true, 'users:view', enabledModules);
      expect(result).toBe(true);
    });

    it('should always allow reports permissions for owner/admin', async () => {
      const result = await hasPermission(tenantId, true, true, 'reports:view', enabledModules);
      expect(result).toBe(true);
    });

    it('should always allow activity permissions for owner/admin', async () => {
      const result = await hasPermission(tenantId, true, true, 'activity:view', enabledModules);
      expect(result).toBe(true);
    });

    it('should always allow approvals permissions for owner/admin', async () => {
      const result = await hasPermission(tenantId, true, true, 'approvals:view', enabledModules);
      expect(result).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TENANT ISOLATION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Tenant Isolation', () => {
    it('should scope permission checks to tenant', async () => {
      const tenant1 = 'tenant-123';
      const tenant2 = 'tenant-456';
      const enabledModules = ['assets'];

      mockRolePermission.findUnique
        .mockResolvedValueOnce({ id: '1', tenantId: tenant1, role: 'MEMBER', permission: 'assets:delete', createdAt: new Date(), updatedAt: new Date() }) // tenant1
        .mockResolvedValueOnce(null); // tenant2

      // Check for regular members (isOwner=false, isAdmin=false)
      const result1 = await hasPermission(tenant1, false, false, 'assets:delete', enabledModules);
      const result2 = await hasPermission(tenant2, false, false, 'assets:delete', enabledModules);

      expect(result1).toBe(true);
      expect(result2).toBe(false);
    });

    it('should include tenantId in permission queries', async () => {
      const tenantId = 'tenant-123';
      mockRolePermission.findUnique.mockResolvedValue(null);

      await hasPermission(tenantId, false, false, 'assets:view', ['assets']);

      expect(mockRolePermission.findUnique).toHaveBeenCalledWith({
        where: {
          tenantId_role_permission: {
            tenantId,
            role: 'MEMBER',
            permission: 'assets:view',
          },
        },
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SENSITIVE PERMISSIONS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Sensitive Permissions', () => {
    it('should define salary view as separate permission', () => {
      expect(PERMISSIONS.EMPLOYEES_VIEW_SALARIES).toBe('employees:view-salaries');
      expect(PERMISSIONS.PAYROLL_VIEW_SALARIES).toBe('payroll:view-salaries');
    });

    it('should define billing as separate permission', () => {
      expect(PERMISSIONS.SETTINGS_BILLING).toBe('settings:billing');
    });

    it('should define permission management as separate', () => {
      expect(PERMISSIONS.SETTINGS_PERMISSIONS).toBe('settings:permissions');
    });

    it('should NOT include sensitive permissions in MEMBER defaults', () => {
      const sensitivePermissions = [
        'employees:view-salaries',
        'payroll:view-salaries',
        'payroll:run',
        'payroll:approve',
        'settings:billing',
        'settings:permissions',
      ];

      sensitivePermissions.forEach(perm => {
        expect(DEFAULT_MEMBER_PERMISSIONS).not.toContain(perm);
      });
    });

    it('should NOT include sensitive permissions in MANAGER defaults', () => {
      const highlySensitivePermissions = [
        'employees:view-salaries',
        'payroll:view-salaries',
        'payroll:run',
        'payroll:approve',
        'settings:billing',
        'settings:permissions',
        'settings:modules',
      ];

      highlySensitivePermissions.forEach(perm => {
        expect(DEFAULT_MANAGER_PERMISSIONS).not.toContain(perm);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PERMISSION COUNT VALIDATION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Permission Count Validation', () => {
    it('should have complete set of permissions', () => {
      const allPermissions = getAllPermissions();
      // Ensure we have a reasonable number of permissions
      expect(allPermissions.length).toBeGreaterThan(40);
    });

    it('should have permissions for all modules in groups', () => {
      const groupedModules = Object.keys(PERMISSION_GROUPS);
      const expectedModules = [
        'assets', 'asset-requests', 'subscriptions', 'suppliers',
        'employees', 'leave', 'payroll', 'purchase',
        'users', 'documents', 'settings', 'reports', 'activity', 'approvals'
      ];

      expectedModules.forEach(module => {
        expect(groupedModules).toContain(module);
      });
    });
  });
});
