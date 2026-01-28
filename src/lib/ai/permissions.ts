import { Role } from '@prisma/client';
import { chatFunctions } from './functions';

/**
 * Check if a user role can access a specific function
 */
export function canAccessFunction(functionName: string, userRole: Role): boolean {
  const fn = chatFunctions.find((f) => f.name === functionName);
  if (!fn) return false;

  // Admin-only functions require DIRECTOR role (Dashboard ADMINs are mapped to DIRECTOR)
  // The requiresAdmin flag is the single source of truth (defined in functions.ts)
  if (fn.requiresAdmin) {
    return userRole === Role.DIRECTOR;
  }

  // All other functions are available to all authenticated users
  return true;
}
