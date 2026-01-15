'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useSession } from 'next-auth/react';

/**
 * Simple cache for permission checks
 */
const permissionCache = new Map<string, { result: boolean | Record<string, boolean>; timestamp: number }>();
const CACHE_TTL = 60000; // 1 minute

function getCached(key: string) {
  const cached = permissionCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.result;
  }
  return null;
}

function setCache(key: string, result: boolean | Record<string, boolean>) {
  permissionCache.set(key, { result, timestamp: Date.now() });
}

/**
 * Hook to check if the current user has a specific permission
 *
 * @param permission - The permission to check (e.g., "assets:edit")
 * @returns Object with hasPermission boolean and loading state
 *
 * @example
 * ```tsx
 * function EditAssetButton({ assetId }: { assetId: string }) {
 *   const { hasPermission, isLoading } = usePermission('assets:edit');
 *
 *   if (isLoading) return <Skeleton />;
 *   if (!hasPermission) return null;
 *
 *   return <Button onClick={() => editAsset(assetId)}>Edit</Button>;
 * }
 * ```
 */
export function usePermission(permission: string): {
  hasPermission: boolean;
  isLoading: boolean;
  error: Error | undefined;
} {
  const { data: session, status } = useSession();
  const [hasPermission, setHasPermission] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | undefined>();
  const fetchedRef = useRef(false);

  // OWNER and ADMIN always have all permissions
  const isPrivilegedRole = session?.user?.isOwner || session?.user?.isAdmin;

  useEffect(() => {
    // Reset when permission changes
    fetchedRef.current = false;
    setIsLoading(true);
    setError(undefined);
  }, [permission]);

  useEffect(() => {
    if (status === 'loading') return;

    // Not authenticated
    if (status !== 'authenticated') {
      setHasPermission(false);
      setIsLoading(false);
      return;
    }

    // Privileged roles always have permission
    if (isPrivilegedRole) {
      setHasPermission(true);
      setIsLoading(false);
      return;
    }

    // Check cache
    const cacheKey = `single:${permission}`;
    const cached = getCached(cacheKey);
    if (cached !== null) {
      setHasPermission(cached as boolean);
      setIsLoading(false);
      return;
    }

    // Prevent duplicate fetches
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    // Fetch permission
    fetch(`/api/permissions/check?permission=${encodeURIComponent(permission)}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch permission');
        return res.json();
      })
      .then((data) => {
        setHasPermission(data.allowed);
        setCache(cacheKey, data.allowed);
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err);
        setHasPermission(false);
        setIsLoading(false);
      });
  }, [status, permission, isPrivilegedRole]);

  return { hasPermission, isLoading, error };
}

/**
 * Hook to check multiple permissions at once
 *
 * @param permissions - Array of permissions to check
 * @returns Object mapping each permission to boolean, plus loading state
 *
 * @example
 * ```tsx
 * function AssetActions({ assetId }: { assetId: string }) {
 *   const { permissions, isLoading } = usePermissions(['assets:edit', 'assets:delete']);
 *
 *   return (
 *     <div>
 *       {permissions['assets:edit'] && <EditButton />}
 *       {permissions['assets:delete'] && <DeleteButton />}
 *     </div>
 *   );
 * }
 * ```
 */
export function usePermissions(permissions: string[]): {
  permissions: Record<string, boolean>;
  isLoading: boolean;
  error: Error | undefined;
} {
  const { data: session, status } = useSession();
  const [permissionMap, setPermissionMap] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | undefined>();
  const fetchedRef = useRef(false);

  // OWNER and ADMIN always have all permissions
  const isPrivilegedRole = session?.user?.isOwner || session?.user?.isAdmin;

  // Create stable key for the permissions array
  const permissionsKey = useMemo(() => permissions.sort().join(','), [permissions]);

  useEffect(() => {
    // Reset when permissions change
    fetchedRef.current = false;
    setIsLoading(true);
    setError(undefined);
  }, [permissionsKey]);

  useEffect(() => {
    if (status === 'loading') return;

    const allFalse = Object.fromEntries(permissions.map((p) => [p, false]));

    // Not authenticated
    if (status !== 'authenticated') {
      setPermissionMap(allFalse);
      setIsLoading(false);
      return;
    }

    // Privileged roles always have all permissions
    if (isPrivilegedRole) {
      const allGranted = Object.fromEntries(permissions.map((p) => [p, true]));
      setPermissionMap(allGranted);
      setIsLoading(false);
      return;
    }

    // Check cache
    const cacheKey = `multi:${permissionsKey}`;
    const cached = getCached(cacheKey);
    if (cached !== null) {
      setPermissionMap(cached as Record<string, boolean>);
      setIsLoading(false);
      return;
    }

    // Prevent duplicate fetches
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    // Fetch permissions
    fetch(`/api/permissions/check?permissions=${encodeURIComponent(permissionsKey)}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch permissions');
        return res.json();
      })
      .then((data) => {
        setPermissionMap(data.permissions || allFalse);
        setCache(cacheKey, data.permissions);
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err);
        setPermissionMap(allFalse);
        setIsLoading(false);
      });
  }, [status, permissionsKey, permissions, isPrivilegedRole]);

  return { permissions: permissionMap, isLoading, error };
}

/**
 * Hook to check if user can perform any of the given permissions
 *
 * @param permissions - Array of permissions (user needs at least one)
 * @returns boolean indicating if user has at least one permission
 */
export function useAnyPermission(permissions: string[]): {
  hasAnyPermission: boolean;
  isLoading: boolean;
} {
  const { permissions: permissionMap, isLoading } = usePermissions(permissions);

  const hasAnyPermission = Object.values(permissionMap).some(Boolean);

  return { hasAnyPermission, isLoading };
}

/**
 * Hook to check if user has all of the given permissions
 *
 * @param permissions - Array of permissions (user needs all)
 * @returns boolean indicating if user has all permissions
 */
export function useAllPermissions(permissions: string[]): {
  hasAllPermissions: boolean;
  isLoading: boolean;
} {
  const { permissions: permissionMap, isLoading } = usePermissions(permissions);

  const hasAllPermissions = permissions.length > 0 && permissions.every((p) => permissionMap[p]);

  return { hasAllPermissions, isLoading };
}
