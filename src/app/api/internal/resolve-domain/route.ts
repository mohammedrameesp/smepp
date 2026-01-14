/**
 * @file route.ts
 * @description Internal API for resolving custom domains (called from middleware)
 * @module api/internal/resolve-domain
 *
 * This endpoint is called by the Edge middleware to resolve custom domains
 * to their tenant organizations. It uses aggressive caching to minimize
 * database lookups.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';

// In-memory cache for domain lookups
const domainCache = new Map<string, {
  tenant: { id: string; slug: string; name: string } | null;
  expiry: number
}>();
const CACHE_TTL_MS = 60 * 1000; // 1 minute cache

export async function GET(request: NextRequest) {
  const domain = request.nextUrl.searchParams.get('domain');

  if (!domain) {
    return NextResponse.json({ error: 'Domain parameter required' }, { status: 400 });
  }

  const normalizedDomain = domain.toLowerCase();

  // Check cache first
  const cached = domainCache.get(normalizedDomain);
  if (cached && cached.expiry > Date.now()) {
    return NextResponse.json({
      tenant: cached.tenant,
      cached: true
    });
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
    select: {
      id: true,
      slug: true,
      name: true,
      subscriptionTier: true,
      enabledModules: true,
    },
  });

  const tenant = org ? {
    id: org.id,
    slug: org.slug,
    name: org.name,
    subscriptionTier: org.subscriptionTier,
    enabledModules: org.enabledModules,
  } : null;

  // Cache the result (even null results to avoid repeated DB lookups for invalid domains)
  domainCache.set(normalizedDomain, {
    tenant,
    expiry: Date.now() + CACHE_TTL_MS,
  });

  return NextResponse.json({
    tenant,
    cached: false
  });
}

// Clear cache endpoint (called when domains are updated)
export async function DELETE(request: NextRequest) {
  const domain = request.nextUrl.searchParams.get('domain');

  if (domain) {
    domainCache.delete(domain.toLowerCase());
  } else {
    domainCache.clear();
  }

  return NextResponse.json({ success: true });
}
