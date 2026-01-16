/**
 * @file permission-refresh.tsx
 * @description Component that monitors for permission changes and refreshes the session
 *              This ensures users see their updated permissions without logging out
 * @module components/auth
 */

'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useRef } from 'react';

// Check every 60 seconds for permission changes
const CHECK_INTERVAL_MS = 60 * 1000;

/**
 * PermissionRefresh - Monitors for permission changes and triggers session refresh
 *
 * This component:
 * 1. Polls an API endpoint to check if the user's permissionsUpdatedAt has changed
 * 2. If changed, calls update() to refresh the session with new permissions
 * 3. This allows permission changes to take effect without logout/login
 */
export function PermissionRefresh() {
  const { data: session, update } = useSession();
  const lastKnownPermissionsUpdatedAt = useRef<string | null | undefined>(undefined);
  const checkInProgress = useRef(false);

  useEffect(() => {
    // Only check for team members (not super admins)
    if (!session?.user?.isTeamMember || !session?.user?.id) {
      return;
    }

    // Initialize with current value
    if (lastKnownPermissionsUpdatedAt.current === undefined) {
      lastKnownPermissionsUpdatedAt.current = session.user.permissionsUpdatedAt || null;
    }

    const checkForPermissionChanges = async () => {
      // Prevent concurrent checks
      if (checkInProgress.current) return;
      checkInProgress.current = true;

      try {
        const response = await fetch('/api/auth/permissions-check');
        if (!response.ok) return;

        const data = await response.json();
        const serverPermissionsUpdatedAt = data.permissionsUpdatedAt || null;

        // Compare with last known value
        if (serverPermissionsUpdatedAt !== lastKnownPermissionsUpdatedAt.current) {
          // Permissions changed - trigger session refresh
          await update();
          // Update our reference to the new value
          lastKnownPermissionsUpdatedAt.current = serverPermissionsUpdatedAt;
        }
      } catch {
        // Silently ignore errors - this is a background refresh
      } finally {
        checkInProgress.current = false;
      }
    };

    // Check immediately on mount (with a small delay to avoid blocking initial render)
    const initialTimeout = setTimeout(checkForPermissionChanges, 5000);

    // Then check periodically
    const interval = setInterval(checkForPermissionChanges, CHECK_INTERVAL_MS);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [session?.user?.isTeamMember, session?.user?.id, session?.user?.permissionsUpdatedAt, update]);

  // This component renders nothing - it just handles the background refresh logic
  return null;
}
