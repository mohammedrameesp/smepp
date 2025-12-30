'use client';

import { useState, useEffect } from 'react';

const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || 'localhost:3000';

export interface SubdomainState {
  subdomain: string | null;
  isMainDomain: boolean;
  isLoading: boolean;
}

/**
 * Client-side hook to detect the current subdomain from window.location
 *
 * @returns SubdomainState with subdomain info and loading state
 *
 * @example
 * const { subdomain, isMainDomain, isLoading } = useSubdomain();
 * // On acme.durj.qa: { subdomain: 'acme', isMainDomain: false, isLoading: false }
 * // On durj.qa: { subdomain: null, isMainDomain: true, isLoading: false }
 */
export function useSubdomain(): SubdomainState {
  const [state, setState] = useState<SubdomainState>({
    subdomain: null,
    isMainDomain: true,
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
        isLoading: false,
      });
      return;
    }

    // Check if host ends with the app domain
    const suffix = `.${appDomainWithoutPort}`;
    if (hostWithoutPort.endsWith(suffix)) {
      const subdomain = hostWithoutPort.slice(0, -suffix.length);
      const firstSubdomain = subdomain.split('.')[0];

      setState({
        subdomain: firstSubdomain,
        isMainDomain: false,
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
        isLoading: false,
      });
      return;
    }

    // Unknown domain - treat as main domain
    setState({
      subdomain: null,
      isMainDomain: true,
      isLoading: false,
    });
  }, []);

  return state;
}
