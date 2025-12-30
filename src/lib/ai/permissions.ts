import { Role } from '@prisma/client';
import { chatFunctions } from './functions';

/**
 * Functions that require admin role to access
 */
const ADMIN_ONLY_FUNCTIONS = [
  'getEmployeeSalary',
  'getTotalPayroll',
];

/**
 * Check if a user role can access a specific function
 */
export function canAccessFunction(functionName: string, userRole: Role): boolean {
  const fn = chatFunctions.find((f) => f.name === functionName);
  if (!fn) return false;

  // Admin-only functions require ADMIN role
  if (fn.requiresAdmin || ADMIN_ONLY_FUNCTIONS.includes(functionName)) {
    return userRole === Role.ADMIN;
  }

  // All other functions are available to all authenticated users
  return true;
}

/**
 * Get list of functions available to a user role
 */
export function getAvailableFunctions(userRole: Role) {
  return chatFunctions.filter((fn) => canAccessFunction(fn.name, userRole));
}

/**
 * Check if user can view sensitive data
 */
export function canViewSensitiveData(userRole: Role): boolean {
  return userRole === Role.ADMIN;
}

/**
 * Filter sensitive fields from data based on user role
 */
export function filterSensitiveData<T extends Record<string, unknown>>(
  data: T,
  userRole: Role
): T {
  if (canViewSensitiveData(userRole)) {
    return data;
  }

  // Remove sensitive fields for non-admin users
  const sensitiveFields = [
    'salary',
    'basicSalary',
    'grossSalary',
    'housingAllowance',
    'transportAllowance',
    'foodAllowance',
    'otherAllowances',
    'qidNumber',
    'passportNumber',
    'iban',
    'bankName',
  ];

  const filtered = { ...data };
  for (const field of sensitiveFields) {
    if (field in filtered) {
      delete filtered[field];
    }
  }

  return filtered;
}
