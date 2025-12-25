'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

/**
 * ImpersonationHandler
 *
 * This component checks for an impersonation token in the URL when a super admin
 * lands on a client's subdomain. If found, it verifies the token and sets up
 * the impersonation session.
 */
export function ImpersonationHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const impersonateToken = searchParams.get('impersonate');

    if (impersonateToken && !processing) {
      setProcessing(true);

      // Verify the impersonation token and set up the session
      fetch('/api/impersonate/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: impersonateToken }),
      })
        .then(async (res) => {
          if (res.ok) {
            // Remove the impersonate parameter from URL and refresh
            const newUrl = new URL(window.location.href);
            newUrl.searchParams.delete('impersonate');

            // Use replace to avoid adding to history
            window.location.replace(newUrl.pathname + newUrl.search);
          } else {
            const data = await res.json();
            console.error('Impersonation failed:', data.error);

            // Remove the invalid token from URL
            const newUrl = new URL(window.location.href);
            newUrl.searchParams.delete('impersonate');
            router.replace(newUrl.pathname + newUrl.search);
          }
        })
        .catch((err) => {
          console.error('Impersonation error:', err);
          setProcessing(false);
        });
    }
  }, [searchParams, router, pathname, processing]);

  // This component doesn't render anything
  return null;
}
