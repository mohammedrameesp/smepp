import { Role } from '@prisma/client';
import { chatFunctions, type FunctionDomain } from './functions';

/**
 * Domain access configuration for future granular permissions
 * Currently all domains are accessible to all authenticated users
 * This structure allows easy extension for role-based domain access
 */
export const DOMAIN_ACCESS: Record<FunctionDomain, Role[]> = {
  HR: [Role.DIRECTOR, Role.MANAGER, Role.EMPLOYEE],
  FINANCE: [Role.DIRECTOR, Role.MANAGER, Role.EMPLOYEE],
  OPERATIONS: [Role.DIRECTOR, Role.MANAGER, Role.EMPLOYEE],
  SYSTEM: [Role.DIRECTOR, Role.MANAGER, Role.EMPLOYEE],
};

/**
 * Check if a user role can access a specific domain
 * Currently returns true for all authenticated users
 * Can be configured per-organization in the future
 */
export function canAccessDomain(domain: FunctionDomain, userRole: Role): boolean {
  const allowedRoles = DOMAIN_ACCESS[domain];
  return allowedRoles.includes(userRole);
}

/**
 * Check if a user role can access a specific function
 * Considers both admin requirements and domain access
 */
export function canAccessFunction(functionName: string, userRole: Role): boolean {
  const fn = chatFunctions.find((f) => f.name === functionName);
  if (!fn) return false;

  // Admin-only functions require DIRECTOR role (Dashboard ADMINs are mapped to DIRECTOR)
  // The requiresAdmin flag is the single source of truth (defined in functions.ts)
  if (fn.requiresAdmin) {
    if (userRole !== Role.DIRECTOR) {
      return false;
    }
  }

  // Check domain access if specified
  // Currently all domains are open, but this provides the hook for future restrictions
  if (fn.requiresDomain) {
    if (!canAccessDomain(fn.requiresDomain, userRole)) {
      return false;
    }
  }

  // All other functions are available to all authenticated users
  return true;
}

/**
 * Get all functions accessible by a user role
 * Useful for debugging and showing available capabilities
 */
export function getAccessibleFunctions(userRole: Role): string[] {
  return chatFunctions
    .filter((fn) => canAccessFunction(fn.name, userRole))
    .map((fn) => fn.name);
}

/**
 * Get functions grouped by domain for a user role
 * Useful for organizing capabilities in UI
 */
export function getAccessibleFunctionsByDomain(userRole: Role): Record<FunctionDomain | 'general', string[]> {
  const result: Record<FunctionDomain | 'general', string[]> = {
    HR: [],
    FINANCE: [],
    OPERATIONS: [],
    SYSTEM: [],
    general: [],
  };

  for (const fn of chatFunctions) {
    if (!canAccessFunction(fn.name, userRole)) continue;

    const domain = fn.requiresDomain || 'general';
    result[domain].push(fn.name);
  }

  return result;
}
