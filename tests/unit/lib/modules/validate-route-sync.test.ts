/**
 * @file validate-route-sync.test.ts
 * @description Validates that routes.generated.ts is in sync with registry.ts
 *
 * This test catches drift between the generated routes file and the source
 * registry. If this test fails, run: npm run generate:routes
 */

import {
  MODULE_REGISTRY,
  type ModuleId,
  getAllModuleIds,
} from '@/lib/modules/registry';
import {
  MODULE_ROUTE_MAP,
  CORE_MODULES,
  type ModuleId as GeneratedModuleId,
} from '@/lib/modules/routes.generated';

describe('Route Sync Validation', () => {
  describe('ModuleId type sync', () => {
    it('should have same module IDs in generated file as registry', () => {
      const registryIds = getAllModuleIds().sort();
      const generatedIds = [...new Set(MODULE_ROUTE_MAP.map(r => r.moduleId))].sort();

      // All modules in registry should have at least one route
      // (except if they have empty routes, which is valid)
      for (const id of registryIds) {
        const mod = MODULE_REGISTRY[id];
        const hasRoutes =
          mod &&
          (mod.adminRoutes.length > 0 ||
            mod.employeeRoutes.length > 0 ||
            mod.apiRoutes.length > 0);

        if (hasRoutes) {
          expect(generatedIds).toContain(id);
        }
      }
    });
  });

  describe('CORE_MODULES sync', () => {
    it('should have same core modules as registry', () => {
      const registryCoreModules = getAllModuleIds().filter(id => MODULE_REGISTRY[id]?.isCore);
      const generatedCoreModules = [...CORE_MODULES];

      expect(generatedCoreModules.sort()).toEqual(registryCoreModules.sort());
    });

    it('should mark employees as core module', () => {
      expect(CORE_MODULES.has('employees')).toBe(true);
      expect(MODULE_REGISTRY.employees.isCore).toBe(true);
    });
  });

  describe('MODULE_ROUTE_MAP sync', () => {
    it('should have all admin routes from registry', () => {
      const generatedPrefixes = new Set(MODULE_ROUTE_MAP.map(r => r.prefix));

      for (const id of getAllModuleIds()) {
        const mod = MODULE_REGISTRY[id];
        if (!mod) continue;

        for (const route of mod.adminRoutes) {
          expect(generatedPrefixes.has(route)).toBe(true);
        }
      }
    });

    it('should have all employee routes from registry', () => {
      const generatedPrefixes = new Set(MODULE_ROUTE_MAP.map(r => r.prefix));

      for (const id of getAllModuleIds()) {
        const mod = MODULE_REGISTRY[id];
        if (!mod) continue;

        for (const route of mod.employeeRoutes) {
          expect(generatedPrefixes.has(route)).toBe(true);
        }
      }
    });

    it('should have all API routes from registry', () => {
      const generatedPrefixes = new Set(MODULE_ROUTE_MAP.map(r => r.prefix));

      for (const id of getAllModuleIds()) {
        const mod = MODULE_REGISTRY[id];
        if (!mod) continue;

        for (const route of mod.apiRoutes) {
          expect(generatedPrefixes.has(route)).toBe(true);
        }
      }
    });

    it('should have correct module ID for each route', () => {
      for (const { prefix, moduleId } of MODULE_ROUTE_MAP) {
        // Find which registry module has this route
        let found = false;
        for (const id of getAllModuleIds()) {
          const mod = MODULE_REGISTRY[id];
          if (!mod) continue;

          const allRoutes = [...mod.adminRoutes, ...mod.employeeRoutes, ...mod.apiRoutes];
          if (allRoutes.includes(prefix)) {
            expect(moduleId).toBe(id);
            found = true;
            break;
          }
        }
        expect(found).toBe(true);
      }
    });

    it('should not have routes that are not in registry', () => {
      // Build a set of all routes from registry
      const registryRoutes = new Set<string>();
      for (const id of getAllModuleIds()) {
        const mod = MODULE_REGISTRY[id];
        if (!mod) continue;

        for (const route of mod.adminRoutes) registryRoutes.add(route);
        for (const route of mod.employeeRoutes) registryRoutes.add(route);
        for (const route of mod.apiRoutes) registryRoutes.add(route);
      }

      // Check that all generated routes exist in registry
      for (const { prefix } of MODULE_ROUTE_MAP) {
        expect(registryRoutes.has(prefix)).toBe(true);
      }
    });
  });

  describe('Route count validation', () => {
    it('should have expected total route count', () => {
      // Count all routes from registry
      let registryCount = 0;
      for (const id of getAllModuleIds()) {
        const mod = MODULE_REGISTRY[id];
        if (!mod) continue;

        registryCount +=
          mod.adminRoutes.length + mod.employeeRoutes.length + mod.apiRoutes.length;
      }

      expect(MODULE_ROUTE_MAP.length).toBe(registryCount);
    });

    it('should match route counts per module', () => {
      for (const id of getAllModuleIds()) {
        const mod = MODULE_REGISTRY[id];
        if (!mod) continue;

        const expectedCount =
          mod.adminRoutes.length + mod.employeeRoutes.length + mod.apiRoutes.length;
        const generatedCount = MODULE_ROUTE_MAP.filter(r => r.moduleId === id).length;

        expect(generatedCount).toBe(expectedCount);
      }
    });
  });
});

describe('Type compatibility', () => {
  it('should allow assigning registry ModuleId to generated ModuleId', () => {
    // This is a compile-time check - if types don't match, TypeScript will error
    const registryId: ModuleId = 'assets';
    const generatedId: GeneratedModuleId = registryId;
    expect(generatedId).toBe('assets');
  });

  it('should allow assigning generated ModuleId to registry ModuleId', () => {
    // This is a compile-time check - if types don't match, TypeScript will error
    const generatedId: GeneratedModuleId = 'assets';
    const registryId: ModuleId = generatedId;
    expect(registryId).toBe('assets');
  });
});
