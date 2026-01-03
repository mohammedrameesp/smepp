/**
 * @file branding.ts
 * @description Tenant branding settings - fetches and caches organization branding
 *              (logo, colors, company name, timezone) for UI customization
 * @module lib/core
 */

import { prisma } from '@/lib/core/prisma';

export interface BrandingSettings {
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string | null;
  companyName: string;
  timezone: string;
}

const DEFAULT_BRANDING: BrandingSettings = {
  logoUrl: null,
  primaryColor: '#0f172a',
  secondaryColor: null,
  companyName: 'Durj',
  timezone: 'Asia/Qatar',
};

// Tenant-aware cache using Map with tenantId as key
const brandingCache = new Map<string, { settings: BrandingSettings; expiry: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get branding settings for a specific tenant (organization).
 * Uses a per-tenant cache with 5-minute TTL.
 */
export async function getBrandingSettings(tenantId: string): Promise<BrandingSettings> {
  if (!tenantId) {
    console.warn('getBrandingSettings called without tenantId - returning defaults');
    return DEFAULT_BRANDING;
  }

  // Check cache
  const cached = brandingCache.get(tenantId);
  if (cached && Date.now() < cached.expiry) {
    return cached.settings;
  }

  try {
    const org = await prisma.organization.findUnique({
      where: { id: tenantId },
      select: {
        name: true,
        logoUrl: true,
        primaryColor: true,
        secondaryColor: true,
        timezone: true,
      },
    });

    if (!org) {
      console.warn(`Organization not found for tenantId: ${tenantId}`);
      return DEFAULT_BRANDING;
    }

    const settings: BrandingSettings = {
      logoUrl: org.logoUrl || DEFAULT_BRANDING.logoUrl,
      primaryColor: org.primaryColor || DEFAULT_BRANDING.primaryColor,
      secondaryColor: org.secondaryColor || DEFAULT_BRANDING.secondaryColor,
      companyName: org.name || DEFAULT_BRANDING.companyName,
      timezone: org.timezone || DEFAULT_BRANDING.timezone,
    };

    // Cache the result
    brandingCache.set(tenantId, {
      settings,
      expiry: Date.now() + CACHE_TTL,
    });

    return settings;

  } catch (error) {
    console.error('Failed to fetch branding settings:', error);
    return DEFAULT_BRANDING;
  }
}

/**
 * Clear branding cache for a specific tenant.
 * Call this after branding settings are updated.
 */
export function clearBrandingCache(tenantId?: string): void {
  if (tenantId) {
    brandingCache.delete(tenantId);
  } else {
    brandingCache.clear();
  }
}

/**
 * Get default branding settings (for unauthenticated pages).
 */
export function getDefaultBranding(): BrandingSettings {
  return { ...DEFAULT_BRANDING };
}
