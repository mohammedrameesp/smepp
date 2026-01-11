'use client';

import { useState, useEffect } from 'react';
import type { TenantBranding, TenantBrandingResponse } from '@/lib/types/tenant-branding';
import { DEFAULT_TENANT_BRANDING } from '@/lib/types/tenant-branding';

export interface TenantBrandingState {
  branding: TenantBranding | null;
  isLoading: boolean;
  error: string | null;
  isDefault: boolean;
}

/**
 * Hook to fetch tenant branding from the public API
 *
 * @param subdomain - The subdomain to fetch branding for (or null for main domain)
 * @returns TenantBrandingState with branding data, loading state, and errors
 *
 * @example
 * const { subdomain } = useSubdomain();
 * const { branding, isLoading, error } = useTenantBranding(subdomain);
 */
export function useTenantBranding(subdomain: string | null): TenantBrandingState {
  const [state, setState] = useState<TenantBrandingState>({
    branding: null,
    isLoading: true,
    error: null,
    isDefault: true,
  });

  useEffect(() => {
    // If no subdomain (main domain), return default branding
    if (!subdomain) {
      setState({
        branding: {
          organizationId: '',
          organizationName: 'Durj',
          organizationSlug: '',
          logoUrl: null,
          logoUrlInverse: null,
          primaryColor: DEFAULT_TENANT_BRANDING.primaryColor!,
          secondaryColor: DEFAULT_TENANT_BRANDING.secondaryColor!,
          loginBackgroundUrl: null,
          welcomeTitle: DEFAULT_TENANT_BRANDING.welcomeTitle!,
          welcomeSubtitle: DEFAULT_TENANT_BRANDING.welcomeSubtitle!,
          website: null,
          allowedAuthMethods: DEFAULT_TENANT_BRANDING.allowedAuthMethods!,
          allowedEmailDomains: DEFAULT_TENANT_BRANDING.allowedEmailDomains!,
          enforceDomainRestriction: DEFAULT_TENANT_BRANDING.enforceDomainRestriction!,
        },
        isLoading: false,
        error: null,
        isDefault: true,
      });
      return;
    }

    // Fetch branding from API
    const fetchBranding = async () => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const response = await fetch(
          `/api/public/tenant-branding?subdomain=${encodeURIComponent(subdomain)}`
        );
        const data: TenantBrandingResponse = await response.json();

        if (!data.found || !data.branding) {
          setState({
            branding: null,
            isLoading: false,
            error: data.error || 'Organization not found',
            isDefault: false,
          });
          return;
        }

        // Merge with defaults for any missing values
        const branding: TenantBranding = {
          ...data.branding,
          primaryColor: data.branding.primaryColor || DEFAULT_TENANT_BRANDING.primaryColor!,
          welcomeTitle: data.branding.welcomeTitle || DEFAULT_TENANT_BRANDING.welcomeTitle!,
          welcomeSubtitle:
            data.branding.welcomeSubtitle || DEFAULT_TENANT_BRANDING.welcomeSubtitle!,
        };

        setState({
          branding,
          isLoading: false,
          error: null,
          isDefault: false,
        });
      } catch (err) {
        console.error('Error fetching tenant branding:', err);
        setState({
          branding: null,
          isLoading: false,
          error: 'Failed to load organization branding',
          isDefault: false,
        });
      }
    };

    fetchBranding();
  }, [subdomain]);

  return state;
}
