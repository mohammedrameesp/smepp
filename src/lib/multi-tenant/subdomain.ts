/**
 * Subdomain Utilities for Multi-Tenant Routing
 *
 * Handles subdomain extraction, validation, and tenant resolution.
 * Supports both subdomain-based routing (acme.smepp.com) and
 * future custom domain support.
 */

import { prisma } from '@/lib/prisma';

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

// The main app domain (without subdomain)
// In production: smepp.com
// In development: localhost:3000 or smepp.local:3000
export const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || 'localhost:3000';

// Reserved subdomains that cannot be used by organizations
export const RESERVED_SUBDOMAINS = [
  'www',
  'app',
  'api',
  'admin',
  'dashboard',
  'help',
  'support',
  'docs',
  'blog',
  'status',
  'mail',
  'email',
  'smtp',
  'ftp',
  'cdn',
  'assets',
  'static',
  'media',
  'images',
  'files',
  'dev',
  'staging',
  'test',
  'demo',
  'sandbox',
  'beta',
  'alpha',
  'preview',
  'internal',
  'private',
  'secure',
  'login',
  'signup',
  'auth',
  'oauth',
  'sso',
  'account',
  'accounts',
  'billing',
  'payment',
  'payments',
  'subscribe',
  'pricing',
  'enterprise',
  'team',
  'teams',
  'org',
  'organization',
  'organizations',
  'workspace',
  'workspaces',
  'about',
  'contact',
  'legal',
  'privacy',
  'terms',
  'tos',
];

// ═══════════════════════════════════════════════════════════════════════════════
// SUBDOMAIN EXTRACTION
// ═══════════════════════════════════════════════════════════════════════════════

export interface SubdomainInfo {
  subdomain: string | null;
  isMainDomain: boolean;
  isReserved: boolean;
  fullHost: string;
}

/**
 * Extract subdomain from a hostname
 *
 * Examples:
 * - acme.smepp.com → { subdomain: 'acme', isMainDomain: false }
 * - smepp.com → { subdomain: null, isMainDomain: true }
 * - www.smepp.com → { subdomain: 'www', isMainDomain: false, isReserved: true }
 * - acme.localhost:3000 → { subdomain: 'acme', isMainDomain: false }
 */
export function extractSubdomain(host: string): SubdomainInfo {
  // Remove port for comparison
  const hostWithoutPort = host.split(':')[0];
  const appDomainWithoutPort = APP_DOMAIN.split(':')[0];

  // Check if this is the main domain (no subdomain)
  if (hostWithoutPort === appDomainWithoutPort || host === APP_DOMAIN) {
    return {
      subdomain: null,
      isMainDomain: true,
      isReserved: false,
      fullHost: host,
    };
  }

  // Check if host ends with the app domain
  const suffix = `.${appDomainWithoutPort}`;
  if (hostWithoutPort.endsWith(suffix)) {
    const subdomain = hostWithoutPort.slice(0, -suffix.length);

    // Handle nested subdomains (only take the first part)
    const firstSubdomain = subdomain.split('.')[0];

    return {
      subdomain: firstSubdomain,
      isMainDomain: false,
      isReserved: RESERVED_SUBDOMAINS.includes(firstSubdomain.toLowerCase()),
      fullHost: host,
    };
  }

  // For localhost development: handle acme.localhost format
  if (hostWithoutPort.endsWith('.localhost')) {
    const subdomain = hostWithoutPort.replace('.localhost', '');
    return {
      subdomain,
      isMainDomain: false,
      isReserved: RESERVED_SUBDOMAINS.includes(subdomain.toLowerCase()),
      fullHost: host,
    };
  }

  // Unknown domain - treat as main domain
  return {
    subdomain: null,
    isMainDomain: true,
    isReserved: false,
    fullHost: host,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TENANT RESOLUTION
// ═══════════════════════════════════════════════════════════════════════════════

export interface TenantInfo {
  id: string;
  slug: string;
  name: string;
  subscriptionTier: string;
}

/**
 * Resolve tenant from subdomain
 * Returns null if subdomain is not found or is reserved
 */
export async function resolveTenantFromSubdomain(
  subdomain: string
): Promise<TenantInfo | null> {
  if (!subdomain || RESERVED_SUBDOMAINS.includes(subdomain.toLowerCase())) {
    return null;
  }

  try {
    const org = await prisma.organization.findUnique({
      where: { slug: subdomain.toLowerCase() },
      select: {
        id: true,
        slug: true,
        name: true,
        subscriptionTier: true,
      },
    });

    if (!org) {
      return null;
    }

    return {
      id: org.id,
      slug: org.slug,
      name: org.name,
      subscriptionTier: org.subscriptionTier,
    };
  } catch (error) {
    console.error('Error resolving tenant from subdomain:', error);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLUG VALIDATION & GENERATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate a URL-friendly slug from organization name
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
    .slice(0, 63); // Max subdomain length
}

/**
 * Validate a slug for use as subdomain
 */
export function validateSlug(slug: string): {
  valid: boolean;
  error?: string;
} {
  if (!slug) {
    return { valid: false, error: 'Slug is required' };
  }

  if (slug.length < 3) {
    return { valid: false, error: 'Slug must be at least 3 characters' };
  }

  if (slug.length > 63) {
    return { valid: false, error: 'Slug must be 63 characters or less' };
  }

  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(slug)) {
    return {
      valid: false,
      error: 'Slug must start and end with a letter or number, and contain only lowercase letters, numbers, and hyphens',
    };
  }

  if (RESERVED_SUBDOMAINS.includes(slug.toLowerCase())) {
    return { valid: false, error: 'This subdomain is reserved' };
  }

  return { valid: true };
}

/**
 * Check if a slug is available (not taken by another org)
 */
export async function isSlugAvailable(slug: string): Promise<boolean> {
  const validation = validateSlug(slug);
  if (!validation.valid) {
    return false;
  }

  const existing = await prisma.organization.findUnique({
    where: { slug: slug.toLowerCase() },
    select: { id: true },
  });

  return !existing;
}

/**
 * Generate a unique slug, appending numbers if necessary
 */
export async function generateUniqueSlug(name: string): Promise<string> {
  const baseSlug = generateSlug(name);
  let slug = baseSlug;
  let counter = 1;

  while (!(await isSlugAvailable(slug))) {
    slug = `${baseSlug}-${counter}`;
    counter++;

    // Safety limit
    if (counter > 100) {
      slug = `${baseSlug}-${Date.now()}`;
      break;
    }
  }

  return slug;
}

// ═══════════════════════════════════════════════════════════════════════════════
// URL HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get the full URL for an organization's subdomain
 */
export function getOrganizationUrl(slug: string): string {
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
  return `${protocol}://${slug}.${APP_DOMAIN}`;
}

/**
 * Get the main app URL (without subdomain)
 */
export function getMainAppUrl(): string {
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
  return `${protocol}://${APP_DOMAIN}`;
}
