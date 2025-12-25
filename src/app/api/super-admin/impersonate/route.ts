import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'fallback-secret';
const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || 'localhost:3000';

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/super-admin/impersonate - Start impersonating an organization
// ═══════════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { organizationId } = body;

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      );
    }

    // Get the organization details
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        subscriptionTier: true,
        enabledModules: true,
      },
    });

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Create an impersonation token that will be verified by the middleware
    // This token contains the super admin's original ID and the target org
    const impersonationToken = jwt.sign(
      {
        superAdminId: session.user.id,
        superAdminEmail: session.user.email,
        organizationId: organization.id,
        organizationSlug: organization.slug,
        organizationName: organization.name,
        purpose: 'impersonation',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (4 * 60 * 60), // 4 hours
      },
      JWT_SECRET
    );

    // Build the redirect URL to the organization's subdomain
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    const portalUrl = `${protocol}://${organization.slug}.${APP_DOMAIN}/admin?impersonate=${impersonationToken}`;

    return NextResponse.json({
      success: true,
      portalUrl,
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
      },
    });
  } catch (error) {
    console.error('Impersonation error:', error);
    return NextResponse.json(
      { error: 'Failed to start impersonation' },
      { status: 500 }
    );
  }
}
