'use client';

import { useState, useEffect } from 'react';

const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || 'localhost:3000';

export interface SubdomainState {
  subdomain: string | null;
  isMainDomain: boolean;
  isCustomDomain: boolean;
  isLoading: boolean;
}

/**
 * Client-side hook to detect the current subdomain from window.location
 * Also handles custom domains by resolving them via internal API
 *
 * @returns SubdomainState with subdomain info and loading state
 *
 * @example
 * const { subdomain, isMainDomain, isLoading } = useSubdomain();
 * // On acme.durj.qa: { subdomain: 'acme', isMainDomain: false, isLoading: false }
 * // On durj.qa: { subdomain: null, isMainDomain: true, isLoading: false }
 * // On portal.company.com: { subdomain: 'acme', isMainDomain: false, isCustomDomain: true, isLoading: false }
 */
export function useSubdomain(): SubdomainState {
  const [state, setState] = useState<SubdomainState>({
    subdomain: null,
    isMainDomain: true,
    isCustomDomain: false,
    isLoading: true,
  });

  useEffect(() => {
    // Only run on client
    if (typeof window === 'undefined') {
      return;
    }

    const host = window.location.host;
    const hostWithoutPort = host.split(':')[0];
    const appDomainWithoutPort = APP_DOMAIN.split(':')[0];

    // Check if this is the main domain
    if (hostWithoutPort === appDomainWithoutPort || host === APP_DOMAIN) {
      setState({
        subdomain: null,
        isMainDomain: true,
        isCustomDomain: false,
        isLoading: false,
      });
      return;
    }

    // Check if host ends with the app domain (subdomain)
    const suffix = `.${appDomainWithoutPort}`;
    if (hostWithoutPort.endsWith(suffix)) {
      const subdomain = hostWithoutPort.slice(0, -suffix.length);
      const firstSubdomain = subdomain.split('.')[0];

      setState({
        subdomain: firstSubdomain,
        isMainDomain: false,
        isCustomDomain: false,
        isLoading: false,
      });
      return;
    }

    // Handle localhost development: acme.localhost format
    if (hostWithoutPort.endsWith('.localhost')) {
      const subdomain = hostWithoutPort.replace('.localhost', '');
      setState({
        subdomain,
        isMainDomain: false,
        isCustomDomain: false,
        isLoading: false,
      });
      return;
    }

    // Unknown domain - could be a custom domain, try to resolve it
    const resolveCustomDomain = async () => {
      try {
        // Call the main domain's internal API to resolve this custom domain
        const response = await fetch(
          `${window.location.protocol}//${APP_DOMAIN}/api/internal/resolve-domain?domain=${encodeURIComponent(hostWithoutPort)}`
        );

        if (response.ok) {
          const data = await response.json();
          if (data.tenant) {
            setState({
              subdomain: data.tenant.slug,
              isMainDomain: false,
              isCustomDomain: true,
              isLoading: false,
            });
            return;
          }
        }
      } catch {
        // Failed to resolve - treat as main domain
      }

      // Not a valid custom domain - treat as main domain
      setState({
        subdomain: null,
        isMainDomain: true,
        isCustomDomain: false,
        isLoading: false,
      });
    };

    resolveCustomDomain();
  }, []);

  return state;
}
