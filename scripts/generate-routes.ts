#!/usr/bin/env npx tsx
/**
 * @file generate-routes.ts
 * @description Generates routes.generated.ts from registry.ts
 *
 * This script extracts route mappings and module metadata from the central
 * registry to generate Edge Runtime compatible data without lucide-react imports.
 *
 * Usage:
 *   npm run generate:routes
 *   npx tsx scripts/generate-routes.ts
 *
 * Output:
 *   src/lib/modules/routes.generated.ts
 */

import * as fs from 'fs';
import * as path from 'path';

// Import the registry (safe in Node.js, not Edge Runtime)
import { MODULE_REGISTRY, type ModuleId } from '../src/lib/modules/registry';

const OUTPUT_PATH = path.join(__dirname, '../src/lib/modules/routes.generated.ts');

interface RouteEntry {
  prefix: string;
  moduleId: ModuleId;
}

function generateRoutesFile(): void {
  // Collect all routes from registry
  const routes: RouteEntry[] = [];
  const coreModules: ModuleId[] = [];
  const moduleIds: ModuleId[] = [];

  for (const [id, mod] of Object.entries(MODULE_REGISTRY)) {
    if (!mod) continue;

    const moduleId = id as ModuleId;
    moduleIds.push(moduleId);

    // Collect core modules
    if (mod.isCore) {
      coreModules.push(moduleId);
    }

    // Collect all routes (admin, employee, API)
    for (const route of mod.adminRoutes) {
      routes.push({ prefix: route, moduleId });
    }
    for (const route of mod.employeeRoutes) {
      routes.push({ prefix: route, moduleId });
    }
    for (const route of mod.apiRoutes) {
      routes.push({ prefix: route, moduleId });
    }
  }

  // Sort routes by prefix for consistent output
  routes.sort((a, b) => a.prefix.localeCompare(b.prefix));

  // Group routes by module for readable output
  const routesByModule = new Map<ModuleId, RouteEntry[]>();
  for (const route of routes) {
    const existing = routesByModule.get(route.moduleId) || [];
    existing.push(route);
    routesByModule.set(route.moduleId, existing);
  }

  // Generate TypeScript content
  const content = `/**
 * AUTO-GENERATED FILE - DO NOT EDIT MANUALLY
 * Generated from src/lib/modules/registry.ts by scripts/generate-routes.ts
 * Run 'npm run generate:routes' to regenerate
 *
 * @generated
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Valid module identifiers.
 * Generated from MODULE_REGISTRY keys.
 */
export type ModuleId =
${moduleIds.map(id => `  | '${id}'`).join('\n')};

// ═══════════════════════════════════════════════════════════════════════════════
// CORE MODULES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Core modules are always enabled and cannot be uninstalled.
 * Generated from modules with isCore: true in registry.ts.
 *
 * @security These modules bypass the "module not installed" check
 */
export const CORE_MODULES: ReadonlySet<string> = new Set([${coreModules.map(id => `'${id}'`).join(', ')}]);

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE ROUTE MAPPING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Route prefix to module mapping.
 * Generated from adminRoutes, employeeRoutes, and apiRoutes in registry.ts.
 *
 * @security All routes protected by a module MUST be listed here
 * @security Missing routes will be accessible without the module installed
 */
export const MODULE_ROUTE_MAP: ReadonlyArray<{ prefix: string; moduleId: ModuleId }> = [
${generateRouteMapEntries(routesByModule)}
];
`;

  // Write the file
  fs.writeFileSync(OUTPUT_PATH, content, 'utf-8');
  console.log(`Generated ${OUTPUT_PATH}`);
  console.log(`  - ${moduleIds.length} modules`);
  console.log(`  - ${coreModules.length} core modules: ${coreModules.join(', ')}`);
  console.log(`  - ${routes.length} route mappings`);
}

function generateRouteMapEntries(routesByModule: Map<ModuleId, RouteEntry[]>): string {
  const lines: string[] = [];

  // Define module order for consistent output (operations, hr, system)
  const moduleOrder: ModuleId[] = [
    'assets',
    'subscriptions',
    'suppliers',
    'spend-requests',
    'employees',
    'leave',
    'payroll',
    'documents',
  ];

  for (const moduleId of moduleOrder) {
    const routes = routesByModule.get(moduleId);
    if (!routes || routes.length === 0) continue;

    // Add module header comment
    const moduleName = MODULE_REGISTRY[moduleId]?.name || moduleId;
    const isCore = MODULE_REGISTRY[moduleId]?.isCore ? ' (CORE - always enabled)' : '';
    lines.push(`  // ${moduleName.toUpperCase()}${isCore}`);

    // Separate routes by type
    const adminRoutes = routes.filter(r => r.prefix.startsWith('/admin/'));
    const employeeRoutes = routes.filter(r => r.prefix.startsWith('/employee/'));
    const apiRoutes = routes.filter(r => r.prefix.startsWith('/api/'));

    if (adminRoutes.length > 0) {
      for (const route of adminRoutes) {
        lines.push(`  { prefix: '${route.prefix}', moduleId: '${route.moduleId}' },`);
      }
    }

    if (employeeRoutes.length > 0) {
      for (const route of employeeRoutes) {
        lines.push(`  { prefix: '${route.prefix}', moduleId: '${route.moduleId}' },`);
      }
    }

    if (apiRoutes.length > 0) {
      for (const route of apiRoutes) {
        lines.push(`  { prefix: '${route.prefix}', moduleId: '${route.moduleId}' },`);
      }
    }

    lines.push('');
  }

  // Remove trailing empty line
  if (lines.length > 0 && lines[lines.length - 1] === '') {
    lines.pop();
  }

  return lines.join('\n');
}

// Run the generator
generateRoutesFile();
