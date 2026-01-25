// All domain components migrated to features:
// - hr/employees → @/features/employees/components
// - hr/leave → @/features/leave/components
// - hr/payroll → @/features/payroll/components
// - hr/onboarding → @/features/onboarding/components
// - projects/spend-requests → @/features/spend-requests/components
// - system/users → @/features/users/components
// - system/settings → @/features/settings/components
// - system/approvals → @/features/approvals/lib
// - system/notifications → @/features/notifications/components

// Still in HR domain (profile is tightly coupled with employees)
export * from './hr';
