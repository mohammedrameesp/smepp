/**
 * @module api/organization/settings
 * @description API endpoint for retrieving public organization settings.
 * This is a simplified read-only endpoint accessible to all authenticated users,
 * providing settings needed for client-side functionality like leave calculations.
 *
 * @endpoints
 * - GET /api/organization/settings - Get public organization settings
 *
 * @returns
 * - weekendDays: Array of weekend day numbers (0-6, Sunday=0)
 * - enabledModules: Array of enabled module IDs
 * - hasMultipleLocations: Boolean flag for location management
 *
 * @note This is distinct from /api/organizations/settings which provides
 * admin-level settings management. This endpoint is for read-only access.
 *
 * @requires Authentication
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import { withErrorHandler } from '@/lib/http/handler';
import { notFoundResponse } from '@/lib/http/errors';

// Force dynamic rendering - no caching
export const dynamic = 'force-dynamic';
export const GET = withErrorHandler(async (_request, { tenant }) => {
  const tenantId = tenant!.tenantId;

  const organization = await prisma.organization.findUnique({
    where: { id: tenantId },
    select: {
      id: true,
      name: true,
      weekendDays: true,
      enabledModules: true,
      hasMultipleLocations: true,
    },
  });

  if (!organization) {
    return notFoundResponse('Organization not found');
  }

  return NextResponse.json({
    settings: {
      weekendDays: organization.weekendDays,
      enabledModules: organization.enabledModules,
      hasMultipleLocations: organization.hasMultipleLocations,
    },
  }, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });
}, { requireAuth: true });

/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * CODE REVIEW SUMMARY
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * OVERVIEW:
 * Lightweight read-only endpoint for fetching organization settings needed by
 * all authenticated users. Distinct from admin settings endpoint.
 *
 * SECURITY:
 * [+] Requires authentication
 * [+] Returns only public/non-sensitive settings
 * [+] Tenant ID from context, not user input
 *
 * PATTERNS:
 * [+] Force dynamic rendering to ensure fresh data
 * [+] Aggressive cache-control headers to prevent stale data
 * [+] Minimal data exposure (only needed fields)
 * [+] Uses notFoundResponse helper for consistent error format
 *
 * POTENTIAL IMPROVEMENTS:
 * [-] Consider short-term caching (e.g., 60s) for performance
 * [-] Could add ETag support for conditional requests
 * [-] Missing TypeScript return type annotation
 * [-] Consider merging with /api/organizations/settings GET to reduce endpoints
 *
 * NOTES:
 * - This endpoint exists separately from /api/organizations/settings to provide
 *   a lightweight option for non-admin users who only need basic settings
 * - weekendDays used for leave calculations on the client side
 *
 * LAST REVIEWED: 2026-02-01
 * ═══════════════════════════════════════════════════════════════════════════════
 */
