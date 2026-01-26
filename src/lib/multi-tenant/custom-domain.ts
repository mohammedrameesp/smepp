/**
 * @file custom-domain.ts
 * @description Custom domain validation, DNS verification, and resolution utilities
 * @module multi-tenant
 *
 * @security CUSTOM DOMAIN SECURITY CONSIDERATIONS:
 * - Domain ownership MUST be verified via DNS TXT record before activation
 * - Blocked domains prevent abuse of common infrastructure domains
 * - Domain lookups are normalized and parameterized (no injection)
 * - Cache has TTL and size limits to prevent memory DoS
 * - Consider rate limiting DNS verification attempts in production
 */

import { prisma } from '@/lib/core/prisma';
import dns from 'dns/promises';
import crypto from 'crypto';
import { logAction, ActivityActions } from '@/lib/core/activity';
import logger from '@/lib/core/log';

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

/** Prefix for TXT verification records */
export const TXT_RECORD_PREFIX = 'durj-verify=';

/** Maximum entries in the domain cache (memory protection) */
const DOMAIN_CACHE_MAX_SIZE = 1000;

// ═══════════════════════════════════════════════════════════════════════════════
// RATE LIMITING FOR DNS VERIFICATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Rate limiter for DNS verification attempts per organization.
 * Prevents abuse by limiting verification requests.
 *
 * @security Prevents attackers from using our DNS resolver as a scanning tool
 */
const verificationAttempts = new Map<string, { count: number; resetAt: number }>();

/** Maximum verification attempts per organization within the rate window */
const VERIFICATION_RATE_LIMIT = 10;

/** Rate limit window duration in milliseconds (1 hour) */
const VERIFICATION_RATE_WINDOW_MS = 60 * 60 * 1000;

/** Maximum entries in rate limit map before cleanup */
const VERIFICATION_RATE_MAP_MAX_SIZE = 5000;

/**
 * Check and update verification rate limit for an organization.
 *
 * @param organizationId - The organization attempting verification
 * @returns Object with allowed status and retryAfter seconds if blocked
 */
function checkVerificationRateLimit(organizationId: string): { allowed: boolean; retryAfter: number; remaining: number } {
  const now = Date.now();
  const key = `verify:${organizationId}`;
  const record = verificationAttempts.get(key);

  // Memory protection: Clean up expired entries when map gets large
  if (verificationAttempts.size > VERIFICATION_RATE_MAP_MAX_SIZE) {
    for (const [k, v] of verificationAttempts.entries()) {
      if (v.resetAt < now) {
        verificationAttempts.delete(k);
      }
    }
  }

  // First attempt or window expired - allow and start new window
  if (!record || record.resetAt < now) {
    verificationAttempts.set(key, { count: 1, resetAt: now + VERIFICATION_RATE_WINDOW_MS });
    return { allowed: true, retryAfter: 0, remaining: VERIFICATION_RATE_LIMIT - 1 };
  }

  // Check if rate limit exceeded
  if (record.count >= VERIFICATION_RATE_LIMIT) {
    const retryAfterSeconds = Math.ceil((record.resetAt - now) / 1000);
    return { allowed: false, retryAfter: retryAfterSeconds, remaining: 0 };
  }

  // Allow and increment counter
  record.count++;
  return { allowed: true, retryAfter: 0, remaining: VERIFICATION_RATE_LIMIT - record.count };
}

/**
 * Domains that cannot be used as custom domains.
 * Includes platform domains, common hosting providers, and major tech companies.
 *
 * @security Prevents domain confusion attacks and abuse
 */
export const BLOCKED_DOMAINS = [
  // Platform domains
  'durj.com',
  'durj.app',
  'quriosityhub.com',
  'localhost',
  // Hosting platforms
  'vercel.app',
  'vercel.com',
  'now.sh',
  'netlify.app',
  'netlify.com',
  'herokuapp.com',
  'render.com',
  'railway.app',
  'fly.io',
  // Cloud providers
  'amazonaws.com',
  'azurewebsites.net',
  'cloudflare.com',
  'cloudfront.net',
  // Tech giants (prevent phishing)
  'google.com',
  'microsoft.com',
  'github.com',
  'apple.com',
  'amazon.com',
  'facebook.com',
  'meta.com',
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

/**
 * Extended verification result with rate limit info
 */
export interface VerificationResultWithRateLimit extends VerificationResult {
  /** Whether the request was rate limited */
  rateLimited?: boolean;
  /** Seconds until rate limit resets (if rate limited) */
  retryAfter?: number;
  /** Remaining verification attempts in current window */
  remainingAttempts?: number;
}

/**
 * Verify a custom domain with rate limiting and audit logging.
 *
 * This is the recommended function to use for domain verification as it includes:
 * - Per-organization rate limiting (10 attempts per hour)
 * - Audit logging for compliance
 * - Memory-protected rate limit storage
 *
 * @param domain - The domain to verify
 * @param expectedTxtValue - The expected TXT record value
 * @param organizationId - The organization attempting verification
 * @param userId - The user performing the verification (for audit log)
 * @returns Verification result with rate limit info
 *
 * @security Rate limits prevent abuse of DNS verification as a scanning tool
 */
export async function verifyCustomDomainWithAudit(
  domain: string,
  expectedTxtValue: string,
  organizationId: string,
  userId: string | null
): Promise<VerificationResultWithRateLimit> {
  // Check rate limit first
  const rateLimit = checkVerificationRateLimit(organizationId);

  if (!rateLimit.allowed) {
    logger.warn(
      { organizationId, domain, retryAfter: rateLimit.retryAfter },
      'Domain verification rate limited'
    );

    return {
      verified: false,
      error: `Too many verification attempts. Try again in ${Math.ceil(rateLimit.retryAfter / 60)} minutes.`,
      rateLimited: true,
      retryAfter: rateLimit.retryAfter,
      remainingAttempts: 0,
    };
  }

  // Perform verification
  const result = await verifyCustomDomain(domain, expectedTxtValue);

  // Audit log the attempt (fire and forget)
  const action = result.verified
    ? ActivityActions.CUSTOM_DOMAIN_VERIFIED
    : ActivityActions.CUSTOM_DOMAIN_VERIFICATION_FAILED;

  logAction(
    organizationId,
    userId,
    action,
    'ORGANIZATION',
    organizationId,
    {
      domain,
      verified: result.verified,
      error: result.error,
      txtRecordsFound: result.txtRecordsFound?.length ?? 0,
    }
  ).catch((err) => {
    logger.warn(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      'Failed to log domain verification action'
    );
  });

  return {
    ...result,
    rateLimited: false,
    remainingAttempts: rateLimit.remaining,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// DOMAIN RESOLUTION (for middleware)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * In-memory cache for domain lookups (simple TTL cache).
 *
 * @security CACHE CONSIDERATIONS:
 * - Instance-local: Each server instance has its own cache
 * - Size-limited to DOMAIN_CACHE_MAX_SIZE to prevent memory DoS
 * - TTL-based expiry ensures updates propagate within 1 minute
 * - For production with multiple instances, consider Redis-based caching
 */
const domainCache = new Map<string, { tenant: TenantFromDomain | null; expiry: number }>();
const CACHE_TTL_MS = 60 * 1000; // 1 minute cache

/**
 * Clean up expired cache entries when cache exceeds size limit.
 * Called during cache writes to prevent unbounded growth.
 */
function cleanupDomainCache(): void {
  if (domainCache.size <= DOMAIN_CACHE_MAX_SIZE) return;

  const now = Date.now();
  for (const [key, value] of domainCache.entries()) {
    if (value.expiry < now) {
      domainCache.delete(key);
    }
  }

  // If still over limit after cleanup, delete oldest entries
  if (domainCache.size > DOMAIN_CACHE_MAX_SIZE) {
    const entriesToDelete = domainCache.size - DOMAIN_CACHE_MAX_SIZE;
    const keys = Array.from(domainCache.keys());
    for (let i = 0; i < entriesToDelete && i < keys.length; i++) {
      domainCache.delete(keys[i]);
    }
  }
}

/**
 * Resolve a custom domain to tenant info (cached).
 * Returns null if domain is not registered or not verified.
 *
 * @security Only returns tenant info for verified domains or those with
 * bypass verification flag (for internal/testing purposes).
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

  // Cleanup cache if needed before adding new entry
  cleanupDomainCache();

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