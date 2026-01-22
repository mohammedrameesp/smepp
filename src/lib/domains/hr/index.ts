/**
 * @file index.ts
 * @description HR Domain barrel export - provides centralized access to HR module utilities
 * @module domains/hr
 */

// All HR modules migrated to features:
// - employees → @/features/employees
// - leave → @/features/leave
// - payroll → @/features/payroll

// Employment defaults and utilities (Qatar Labor Law)
export * from './employment-defaults';
