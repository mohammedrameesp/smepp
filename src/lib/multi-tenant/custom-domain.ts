/**
 * @file custom-domain.ts
 * @description Custom domain validation, DNS verification, and resolution utilities
 * @module multi-tenant
 */

import { prisma } from '@/lib/core/prisma';
import dns from 'dns/promises';
import crypto from 'crypto';

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

// Prefix for TXT verification records
export const TXT_RECORD_PREFIX = 'durj-verify=';

// Domains that cannot be used as custom domains
export const BLOCKED_DOMAINS = [
  'durj.com',
  'quriosityhub.com',
  'localhost',
  'vercel.app',
  'vercel.com',
  'now.sh',
  'google.com',
  'microsoft.com',
  'github.com',
  'netlify.app',
];

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface DomainValidationResult {
  valid: boolean;
  error?: string;
  normalizedDomain?: string;
}

export interface VerificationResult {
  verified: boolean;
  error?: string;
  txtRecordsFound?: string[];
}

export interface TenantFromDomain {
  id: string;
  slug: string;
  name: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Validate and normalize a custom domain
 */
export function validateCustomDomain(domain: string): DomainValidationResult {
  if (!domain) {
    return { valid: false, error: 'Domain is required' };
  }

  // Normalize: lowercase, trim, remove protocol and trailing slashes
  let normalized = domain
    .toLowerCase()
    .trim()
    .replace(/^https?:\/\//, '')
    .replace(/\/+$/, '')
    .replace(/^www\./, ''); // Remove www prefix

  // Basic format validation
  const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/;
  if (!domainRegex.test(normalized)) {
    return { valid: false, error: 'Invalid domain format' };
  }

  // Check blocked domains
  if (BLOCKED_DOMAINS.some(blocked => normalized === blocked || normalized.endsWith(`.${blocked}`))) {
    return { valid: false, error: 'This domain cannot be used' };
  }

  // Minimum length check
  if (normalized.length < 4) {
    return { valid: false, error: 'Domain is too short' };
  }

  // Maximum length check (DNS limit)
  if (normalized.length > 253) {
    return { valid: false, error: 'Domain is too long' };
  }

  return { valid: true, normalizedDomain: normalized };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TXT RECORD GENERATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate a unique TXT verification value for an organization
 */
export function generateTxtVerificationValue(organizationId: string): string {
  const hash = crypto
    .createHash('sha256')
    .update(`${organizationId}-${Date.now()}-${crypto.randomBytes(8).toString('hex')}`)
    .digest('hex')
    .substring(0, 32);

  return `${TXT_RECORD_PREFIX}${hash}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DNS VERIFICATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Verify a custom domain by checking for the TXT record
 *
 * The organization must add a TXT record like:
 * _durj-verification.app.acme.com TXT "durj-verify=abc123..."
 *
 * Or at the root:
 * app.acme.com TXT "durj-verify=abc123..."
 */
export async function verifyCustomDomain(
  domain: string,
  expectedTxtValue: string
): Promise<VerificationResult> {
  try {
    // Try both the domain itself and the _durj-verification subdomain
    const recordsToCheck = [
      domain,
      `_durj-verification.${domain}`,
    ];

    const allTxtRecords: string[] = [];

    for (const recordName of recordsToCheck) {
      try {
        const records = await dns.resolveTxt(recordName);
        // dns.resolveTxt returns string[][] - flatten it
        const flatRecords = records.flat();
        allTxtRecords.push(...flatRecords);
      } catch {
        // Record doesn't exist, continue checking other options
      }
    }

    // Check if expected value is present
    const verified = allTxtRecords.some(record =>
      record.trim() === expectedTxtValue.trim()
    );

    if (verified) {
      return { verified: true, txtRecordsFound: allTxtRecords };
    }

    return {
      verified: false,
      error: allTxtRecords.length > 0
        ? 'TXT record found but value does not match'
        : 'No TXT verification record found',
      txtRecordsFound: allTxtRecords,
    };
  } catch (error) {
    return {
      verified: false,
      error: error instanceof Error ? error.message : 'DNS lookup failed',
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// DOMAIN RESOLUTION (for middleware)
// ═══════════════════════════════════════════════════════════════════════════════

// In-memory cache for domain lookups (simple TTL cache)
const domainCache = new Map<string, { tenant: TenantFromDomain | null; expiry: number }>();
const CACHE_TTL_MS = 60 * 1000; // 1 minute cache

/**
 * Resolve a custom domain to tenant info (cached)
 * Returns null if domain is not registered or not verified
 */
export async function resolveTenantFromCustomDomain(
  domain: string
): Promise<TenantFromDomain | null> {
  const normalizedDomain = domain.toLowerCase();

  // Check cache first
  const cached = domainCache.get(normalizedDomain);
  if (cached && cached.expiry > Date.now()) {
    return cached.tenant;
  }

  // Lookup in database
  const org = await prisma.organization.findFirst({
    where: {
      customDomain: normalizedDomain,
      OR: [
        { customDomainVerified: true },
        { customDomainBypassVerification: true },
      ],
    },
    select: { id: true, slug: true, name: true },
  });

  const tenant = org ? { id: org.id, slug: org.slug, name: org.name } : null;

  // Cache the result (even null results to avoid repeated DB lookups)
  domainCache.set(normalizedDomain, {
    tenant,
    expiry: Date.now() + CACHE_TTL_MS,
  });

  return tenant;
}

/**
 * Clear cache for a specific domain (call when domain is updated)
 */
export function clearDomainCache(domain?: string): void {
  if (domain) {
    domainCache.delete(domain.toLowerCase());
  } else {
    domainCache.clear();
  }
}

/**
 * Check if a custom domain is already in use by another organization
 */
export async function isDomainAvailable(
  domain: string,
  excludeOrgId?: string
): Promise<boolean> {
  const normalized = domain.toLowerCase();

  const existing = await prisma.organization.findFirst({
    where: {
      customDomain: normalized,
      ...(excludeOrgId ? { id: { not: excludeOrgId } } : {}),
    },
    select: { id: true },
  });

  return !existing;
}

/**
 * Get custom domain info for an organization
 */
export async function getCustomDomainInfo(organizationId: string) {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      customDomain: true,
      customDomainVerified: true,
      customDomainVerifiedAt: true,
      customDomainTxtValue: true,
      customDomainBypassVerification: true,
    },
  });

  if (!org) return null;

  return {
    domain: org.customDomain,
    verified: org.customDomainVerified,
    verifiedAt: org.customDomainVerifiedAt,
    txtValue: org.customDomainTxtValue,
    bypassVerification: org.customDomainBypassVerification,
    isActive: org.customDomain && (org.customDomainVerified || org.customDomainBypassVerification),
  };
}
