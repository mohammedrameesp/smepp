'use client';

import { ReactNode } from 'react';
import {
  usePermission,
  usePermissions,
  useAnyPermission,
  useAllPermissions,
} from '@/hooks/use-permission';
import { Skeleton } from '@/components/ui/skeleton';

interface PermissionGateProps {
  /**
   * The permission required to render children
   */
  permission: string;
  /**
   * Content to render when user has permission
   */
  children: ReactNode;
  /**
   * Content to render when user doesn't have permission (default: null)
   */
  fallback?: ReactNode;
  /**
   * Content to render while checking permission (default: null)
   */
  loading?: ReactNode;
  /**
   * Show a skeleton while loading (alternative to loading prop)
   */
  showLoadingSkeleton?: boolean;
}

/**
 * Component that conditionally renders children based on user permission
 *
 * @example
 * ```tsx
 * <PermissionGate permission="assets:edit">
 *   <EditAssetButton assetId={asset.id} />
 * </PermissionGate>
 *
 * // With fallback
 * <PermissionGate
 *   permission="payroll:run"
 *   fallback={<p>You don't have permission to run payroll</p>}
 * >
 *   <RunPayrollButton />
 * </PermissionGate>
 * ```
 */
export function PermissionGate({
  permission,
  children,
  fallback = null,
  loading = null,
  showLoadingSkeleton = false,
}: PermissionGateProps) {
  const { hasPermission, isLoading } = usePermission(permission);

  if (isLoading) {
    if (showLoadingSkeleton) {
      return <Skeleton className="h-9 w-24" />;
    }
    return <>{loading}</>;
  }

  if (!hasPermission) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

interface AnyPermissionGateProps {
  /**
   * User needs at least one of these permissions
   */
  permissions: string[];
  children: ReactNode;
  fallback?: ReactNode;
  loading?: ReactNode;
}

/**
 * Component that renders children if user has ANY of the specified permissions
 *
 * @example
 * ```tsx
 * <AnyPermissionGate permissions={['assets:edit', 'assets:delete']}>
 *   <AssetActionsMenu />
 * </AnyPermissionGate>
 * ```
 */
export function AnyPermissionGate({
  permissions,
  children,
  fallback = null,
  loading = null,
}: AnyPermissionGateProps) {
  const { hasAnyPermission, isLoading } = useAnyPermission(permissions);

  if (isLoading) {
    return <>{loading}</>;
  }

  if (!hasAnyPermission) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

interface AllPermissionsGateProps {
  /**
   * User needs ALL of these permissions
   */
  permissions: string[];
  children: ReactNode;
  fallback?: ReactNode;
  loading?: ReactNode;
}

/**
 * Component that renders children only if user has ALL specified permissions
 *
 * @example
 * ```tsx
 * <AllPermissionsGate permissions={['payroll:run', 'payroll:approve']}>
 *   <RunAndApprovePayroll />
 * </AllPermissionsGate>
 * ```
 */
export function AllPermissionsGate({
  permissions,
  children,
  fallback = null,
  loading = null,
}: AllPermissionsGateProps) {
  const { hasAllPermissions, isLoading } = useAllPermissions(permissions);

  if (isLoading) {
    return <>{loading}</>;
  }

  if (!hasAllPermissions) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

interface ConditionalPermissionProps {
  /**
   * Map of permissions to check
   */
  permissions: string[];
  /**
   * Render function that receives permission check results
   */
  children: (permissions: Record<string, boolean>, isLoading: boolean) => ReactNode;
}

/**
 * Component that provides permission check results to a render function
 *
 * @example
 * ```tsx
 * <ConditionalPermission permissions={['assets:edit', 'assets:delete']}>
 *   {(perms, isLoading) => (
 *     <div>
 *       {perms['assets:edit'] && <EditButton />}
 *       {perms['assets:delete'] && <DeleteButton />}
 *     </div>
 *   )}
 * </ConditionalPermission>
 * ```
 */
export function ConditionalPermission({
  permissions,
  children,
}: ConditionalPermissionProps) {
  const { permissions: permissionMap, isLoading } = usePermissions(permissions);

  return <>{children(permissionMap, isLoading)}</>;
}
