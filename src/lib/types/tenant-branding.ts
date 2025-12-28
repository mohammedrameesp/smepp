/**
 * Tenant Branding Types
 *
 * Types for organization-specific branding on login pages.
 */

export type AuthMethod = 'credentials' | 'google' | 'azure-ad';

export interface TenantBranding {
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string | null;
  loginBackgroundUrl: string | null;
  welcomeTitle: string | null;
  welcomeSubtitle: string | null;
  // Authentication configuration
  allowedAuthMethods: AuthMethod[];
  allowedEmailDomains: string[];
  enforceDomainRestriction: boolean;
  // OAuth configuration status (true only if properly configured with ID + secret)
  hasCustomGoogleOAuth?: boolean;
  hasCustomAzureOAuth?: boolean;
}

export interface TenantBrandingResponse {
  found: boolean;
  branding?: TenantBranding;
  error?: string;
}

/**
 * Default branding values used when organization has no custom branding
 */
export const DEFAULT_TENANT_BRANDING: Partial<TenantBranding> = {
  primaryColor: '#1E40AF', // Deep Blue - brand primary
  secondaryColor: '#3B82F6', // Blue - brand accent
  welcomeTitle: 'Welcome back',
  welcomeSubtitle: 'Sign in to your account',
  allowedAuthMethods: [], // Empty = all methods allowed
  allowedEmailDomains: [], // Empty = all domains allowed
  enforceDomainRestriction: false,
};
