import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';

// Force dynamic rendering - no caching
export const dynamic = 'force-dynamic';

/**
 * GET /api/organization/settings
 * Returns public organization settings for any authenticated user
 * This is a simpler endpoint than /api/admin/organization for fetching
 * settings that all users need (like weekend days for leave calculations)
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const organization = await prisma.organization.findUnique({
      where: { id: session.user.organizationId },
      select: {
        id: true,
        name: true,
        weekendDays: true,
        enabledModules: true,
        hasMultipleLocations: true,
      },
    });

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Debug log
    console.log('[API /organization/settings] UserID:', session.user.id, 'OrgID:', session.user.organizationId, 'weekendDays:', organization.weekendDays);

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
  } catch (error) {
    console.error('Get organization settings error:', error);
    return NextResponse.json(
      { error: 'Failed to get organization settings' },
      { status: 500 }
    );
  }
}
