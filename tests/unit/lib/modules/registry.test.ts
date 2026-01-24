/**
 * @file registry.test.ts
 * @description Tests for module registry and dependency management
 */

import {
  MODULE_REGISTRY,
  getModule,
  getAllModuleIds,
  getAllModules,
  getModulesByCategory,
  getModuleDependencies,
  getModuleDependents,
  canInstallModule,
  canUninstallModule,
  getDefaultEnabledModules,
  getSerializableModules,
} from '@/lib/modules/registry';

describe('Module Registry Tests', () => {
  describe('MODULE_REGISTRY', () => {
    it('should have all expected modules defined', () => {
      const expectedModules = [
        'assets',
        'subscriptions',
        'suppliers',
        'employees',
        'leave',
        'payroll',
        'purchase-requests',
        'documents',
      ];

      expectedModules.forEach((moduleId) => {
        expect(MODULE_REGISTRY[moduleId]).toBeDefined();
        expect(MODULE_REGISTRY[moduleId].id).toBe(moduleId);
      });
    });

    it('should have employees module defined', () => {
      expect(MODULE_REGISTRY['employees']).toBeDefined();
      expect(MODULE_REGISTRY['employees'].name).toBe('Employee Management');
      expect(MODULE_REGISTRY['employees'].category).toBe('hr');
    });

    it('should have all required fields for each module', () => {
      const requiredFields = [
        'id',
        'name',
        'description',
        'icon',
        'iconName',
        'category',
        'tier',
        'isFree',
        'requires',
        'requiredBy',
        'adminRoutes',
        'employeeRoutes',
        'apiRoutes',
        'isCore',
        'isBeta',
        'isDeprecated',
      ];

      Object.values(MODULE_REGISTRY).forEach((module) => {
        requiredFields.forEach((field) => {
          expect(module).toHaveProperty(field);
        });
      });
    });
  });

  describe('Module Dependencies', () => {
    describe('employees module', () => {
      it('should be required by leave and payroll', () => {
        expect(MODULE_REGISTRY['employees'].requiredBy).toContain('leave');
        expect(MODULE_REGISTRY['employees'].requiredBy).toContain('payroll');
      });

      it('should have no dependencies itself', () => {
        expect(MODULE_REGISTRY['employees'].requires).toEqual([]);
      });
    });

    describe('leave module', () => {
      it('should require employees', () => {
        expect(MODULE_REGISTRY['leave'].requires).toContain('employees');
      });
    });

    describe('payroll module', () => {
      it('should require employees', () => {
        expect(MODULE_REGISTRY['payroll'].requires).toContain('employees');
      });
    });

    describe('operations modules', () => {
      it('should have no dependencies', () => {
        const operationsModules = ['assets', 'subscriptions', 'suppliers'];

        operationsModules.forEach((moduleId) => {
          expect(MODULE_REGISTRY[moduleId].requires).toEqual([]);
        });
      });
    });
  });

  describe('getModule', () => {
    it('should return module definition for valid ID', () => {
      const module = getModule('employees');

      expect(module).toBeDefined();
      expect(module?.id).toBe('employees');
      expect(module?.name).toBe('Employee Management');
    });

    it('should return undefined for invalid ID', () => {
      const module = getModule('invalid-module');

      expect(module).toBeUndefined();
    });
  });

  describe('getAllModuleIds', () => {
    it('should return all module IDs', () => {
      const ids = getAllModuleIds();

      expect(ids).toContain('employees');
      expect(ids).toContain('leave');
      expect(ids).toContain('payroll');
      expect(ids).toContain('assets');
      expect(ids.length).toBeGreaterThanOrEqual(8);
    });
  });

  describe('getAllModules', () => {
    it('should return all modules', () => {
      const modules = getAllModules();

      expect(modules.length).toBeGreaterThanOrEqual(8);
      expect(modules.some((m) => m.id === 'employees')).toBe(true);
    });
  });

  describe('getModulesByCategory', () => {
    it('should return HR modules', () => {
      const hrModules = getModulesByCategory('hr');

      expect(hrModules.some((m) => m.id === 'employees')).toBe(true);
      expect(hrModules.some((m) => m.id === 'leave')).toBe(true);
      expect(hrModules.some((m) => m.id === 'payroll')).toBe(true);
    });

    it('should return operations modules', () => {
      const opsModules = getModulesByCategory('operations');

      expect(opsModules.some((m) => m.id === 'assets')).toBe(true);
      expect(opsModules.some((m) => m.id === 'subscriptions')).toBe(true);
      expect(opsModules.some((m) => m.id === 'suppliers')).toBe(true);
    });
  });

  describe('getModuleDependencies', () => {
    it('should return employees for leave module', () => {
      const deps = getModuleDependencies('leave');

      expect(deps).toContain('employees');
    });

    it('should return employees for payroll module', () => {
      const deps = getModuleDependencies('payroll');

      expect(deps).toContain('employees');
    });

    it('should return empty array for assets module', () => {
      const deps = getModuleDependencies('assets');

      expect(deps).toEqual([]);
    });

    it('should return empty array for invalid module', () => {
      const deps = getModuleDependencies('invalid');

      expect(deps).toEqual([]);
    });
  });

  describe('getModuleDependents', () => {
    it('should return leave and payroll for employees module', () => {
      const dependents = getModuleDependents('employees');

      expect(dependents).toContain('leave');
      expect(dependents).toContain('payroll');
    });

    it('should return empty array for leave module', () => {
      const dependents = getModuleDependents('leave');

      expect(dependents).toEqual([]);
    });
  });

  describe('canInstallModule', () => {
    it('should allow installing leave when employees is enabled', () => {
      const error = canInstallModule('leave', ['employees'], 'FREE');

      expect(error).toBeNull();
    });

    it('should block installing leave without employees', () => {
      const error = canInstallModule('leave', ['assets'], 'FREE');

      expect(error).not.toBeNull();
      expect(error).toContain('Employee Management');
    });

    it('should allow installing payroll when employees is enabled', () => {
      const error = canInstallModule('payroll', ['employees'], 'FREE');

      expect(error).toBeNull();
    });

    it('should block installing payroll without employees', () => {
      const error = canInstallModule('payroll', ['assets', 'suppliers'], 'FREE');

      expect(error).not.toBeNull();
      expect(error).toContain('Employee Management');
    });

    it('should allow installing assets without dependencies', () => {
      const error = canInstallModule('assets', [], 'FREE');

      expect(error).toBeNull();
    });

    it('should allow installing employees without dependencies', () => {
      const error = canInstallModule('employees', [], 'FREE');

      expect(error).toBeNull();
    });

    it('should return error for already installed module', () => {
      const error = canInstallModule('assets', ['assets'], 'FREE');

      expect(error).not.toBeNull();
      expect(error).toContain('already installed');
    });

    it('should return error for unknown module', () => {
      const error = canInstallModule('invalid-module', [], 'FREE');

      expect(error).not.toBeNull();
      expect(error).toContain('not found');
    });
  });

  describe('canUninstallModule', () => {
    it('should block uninstalling employees as it is a core module', () => {
      const error = canUninstallModule('employees', ['employees', 'assets']);

      expect(error).not.toBeNull();
      expect(error).toContain('core module');
    });

    it('should block uninstalling employees even when leave is enabled', () => {
      const error = canUninstallModule('employees', ['employees', 'leave']);

      expect(error).not.toBeNull();
      expect(error).toContain('core module');
    });

    it('should block uninstalling employees even when payroll is enabled', () => {
      const error = canUninstallModule('employees', ['employees', 'payroll']);

      expect(error).not.toBeNull();
      expect(error).toContain('core module');
    });

    it('should block uninstalling employees when both leave and payroll are enabled', () => {
      const error = canUninstallModule('employees', ['employees', 'leave', 'payroll']);

      expect(error).not.toBeNull();
      expect(error).toContain('core module');
    });

    it('should allow uninstalling leave regardless of other modules', () => {
      const error = canUninstallModule('leave', ['employees', 'leave', 'payroll']);

      expect(error).toBeNull();
    });

    it('should allow uninstalling assets without restrictions', () => {
      const error = canUninstallModule('assets', ['assets', 'employees']);

      expect(error).toBeNull();
    });

    it('should return error for unknown module', () => {
      const error = canUninstallModule('invalid-module', []);

      expect(error).not.toBeNull();
      expect(error).toContain('not found');
    });
  });

  describe('getDefaultEnabledModules', () => {
    it('should return default modules', () => {
      const defaults = getDefaultEnabledModules();

      expect(defaults).toContain('assets');
      expect(defaults).toContain('subscriptions');
      expect(defaults).toContain('suppliers');
    });

    it('should include employees in defaults as a core module', () => {
      const defaults = getDefaultEnabledModules();

      expect(defaults).toContain('employees');
    });
  });

  describe('getSerializableModules', () => {
    it('should return modules without LucideIcon', () => {
      const modules = getSerializableModules();

      modules.forEach((module) => {
        expect(module).toHaveProperty('id');
        expect(module).toHaveProperty('name');
        expect(module).toHaveProperty('iconName');
        expect(module).toHaveProperty('requires');
        expect(module).toHaveProperty('requiredBy');
        expect(module).not.toHaveProperty('icon');
      });
    });

    it('should include employees module', () => {
      const modules = getSerializableModules();
      const employees = modules.find((m) => m.id === 'employees');

      expect(employees).toBeDefined();
      expect(employees?.name).toBe('Employee Management');
      expect(employees?.requiredBy).toContain('leave');
      expect(employees?.requiredBy).toContain('payroll');
    });

    it('should include requires field for leave module', () => {
      const modules = getSerializableModules();
      const leave = modules.find((m) => m.id === 'leave');

      expect(leave).toBeDefined();
      expect(leave?.requires).toContain('employees');
    });
  });

  describe('Dependency Graph Consistency', () => {
    it('should have consistent requires/requiredBy relationships', () => {
      Object.values(MODULE_REGISTRY).forEach((module) => {
        // For each module that requires another, the other should list this in requiredBy
        module.requires.forEach((requiredModuleId) => {
          const requiredModule = MODULE_REGISTRY[requiredModuleId];

          if (requiredModule) {
            expect(requiredModule.requiredBy).toContain(module.id);
          }
        });

        // For each module in requiredBy, that module should list this in requires
        module.requiredBy.forEach((dependentModuleId) => {
          const dependentModule = MODULE_REGISTRY[dependentModuleId];

          if (dependentModule) {
            expect(dependentModule.requires).toContain(module.id);
          }
        });
      });
    });

    it('should not have circular dependencies', () => {
      const visited = new Set<string>();
      const recursionStack = new Set<string>();

      function hasCycle(moduleId: string): boolean {
        if (recursionStack.has(moduleId)) return true;
        if (visited.has(moduleId)) return false;

        visited.add(moduleId);
        recursionStack.add(moduleId);

        const module = MODULE_REGISTRY[moduleId];
        if (module) {
          for (const depId of module.requires) {
            if (hasCycle(depId)) return true;
          }
        }

        recursionStack.delete(moduleId);
        return false;
      }

      Object.keys(MODULE_REGISTRY).forEach((moduleId) => {
        visited.clear();
        recursionStack.clear();
        expect(hasCycle(moduleId)).toBe(false);
      });
    });

    it('should have valid module IDs in requires arrays', () => {
      Object.values(MODULE_REGISTRY).forEach((module) => {
        module.requires.forEach((requiredModuleId) => {
          expect(MODULE_REGISTRY[requiredModuleId]).toBeDefined();
        });
      });
    });

    it('should have valid module IDs in requiredBy arrays', () => {
      Object.values(MODULE_REGISTRY).forEach((module) => {
        module.requiredBy.forEach((dependentModuleId) => {
          expect(MODULE_REGISTRY[dependentModuleId]).toBeDefined();
        });
      });
    });
  });
});
