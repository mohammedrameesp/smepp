import { NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import { withErrorHandler } from '@/lib/http/handler';
import { notFoundResponse } from '@/lib/http/errors';

// Force dynamic rendering - no caching
export const dynamic = 'force-dynamic';

/**
 * GET /api/organization/settings
 * Returns public organization settings for any authenticated user
 * This is a simpler endpoint than /api/admin/organization for fetching
 * settings that all users need (like weekend days for leave calculations)
 */
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
