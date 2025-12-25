'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

/**
 * ImpersonationHandler
 *
 * This component cleans up the URL after the middleware has processed
 * the impersonation token. The middleware already sets the cookie and
 * allows access, so we just need to clean the URL.
 */
export function ImpersonationHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [cleaned, setCleaned] = useState(false);

  useEffect(() => {
    const impersonateToken = searchParams.get('impersonate');

    // If there's an impersonate token in URL, clean it up (middleware already handled it)
    if (impersonateToken && !cleaned) {
      setCleaned(true);

      // Remove the impersonate parameter from URL without refreshing
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('impersonate');

      // Use replaceState to clean URL without navigation
      window.history.replaceState({}, '', newUrl.pathname + newUrl.search);
    }
  }, [searchParams, pathname, cleaned]);

  // This component doesn't render anything
  return null;
}
