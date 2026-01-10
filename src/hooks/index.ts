/**
 * @file index.ts
 * @description Barrel export for all hooks
 * @module hooks
 */

// New data fetching hooks
export { useUsers } from './use-users';
export { useOrgSettings } from './use-org-settings';
export { useExchangeRates } from './use-exchange-rates';
export { useCurrencyConversion } from './use-currency-conversion';
export { useDialogForm } from './use-dialog-form';

// API hooks
export { useApiQuery, usePaginatedQuery } from './use-api-query';
export type { QueryOptions, QueryState, QueryResult, PaginatedQueryOptions, PaginatedData } from './use-api-query';
export { useApiMutation, useDeleteMutation } from './use-api-mutation';
export type { MutationOptions, MutationState, MutationResult } from './use-api-mutation';

// Auto-save hook
export { useAutoSave, AutoSaveIndicator } from './use-auto-save';
export type { AutoSaveStatus, UseAutoSaveOptions, UseAutoSaveResult } from './use-auto-save';

// Permission hooks
export { usePermission, usePermissions, useAnyPermission, useAllPermissions } from './use-permission';

// Tenant hooks
export { useSubdomain } from './use-subdomain';
export type { SubdomainState } from './use-subdomain';
export { useTenantBranding } from './use-tenant-branding';
export type { TenantBrandingState } from './use-tenant-branding';
