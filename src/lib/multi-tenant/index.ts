/**
 * @file index.ts
 * @description Multi-tenant module barrel export - provides core utilities for
 *              multi-tenant SaaS functionality including subdomain routing,
 *              custom domains, feature flags, and usage limits.
 * @module multi-tenant
 */

// Subdomain utilities
export {
  APP_DOMAIN,
  SUBDOMAIN_REGEX,
  RESERVED_SUBDOMAINS,
  extractSubdomain,
  resolveTenantFromSubdomain,
  generateSlug,
  validateSlug,
  isSlugAvailable,
  generateUniqueSlug,
  getOrganizationUrl,
  getMainAppUrl,
  type SubdomainInfo,
  type TenantInfo,
} from './subdomain';

// Custom domain utilities
export {
  TXT_RECORD_PREFIX,
  BLOCKED_DOMAINS,
  validateCustomDomain,
  generateTxtVerificationValue,
  verifyCustomDomain,
  verifyCustomDomainWithAudit,
  resolveTenantFromCustomDomain,
  clearDomainCache,
  isDomainAvailable,
  getCustomDomainInfo,
  type DomainValidationResult,
  type VerificationResult,
  type VerificationResultWithRateLimit,
  type TenantFromDomain,
} from './custom-domain';

// Feature flags
export * from './feature-flags';

// Usage limits
export * from './limits';

// Tenant branding
export * from './tenant-branding';

