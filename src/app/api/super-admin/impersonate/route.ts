/**
 * @file route.ts
 * @description Impersonate an organization for support and debugging purposes
 * @module system/super-admin
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import jwt from 'jsonwebtoken';
import { requireRecent2FA } from '@/lib/two-factor';
import { generateJti } from '@/lib/security/impersonation';

const JWT_SECRET = process.env.NEXTAUTH_SECRET!;
const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || 'localhost:3000';
const IMPERSONATION_EXPIRY_SECONDS = 15 * 60;

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // SECURITY: Require recent 2FA verification for impersonation
    // This prevents session hijacking attacks from accessing tenant data
    const require2FAResult = await requireRecent2FA(session.user.id);
    if (require2FAResult) return require2FAResult;

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

    // AUDIT: Log impersonation event for security tracking
    const clientIp = request.headers.get('x-forwarded-for') ||
                     request.headers.get('x-real-ip') ||
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    console.log('[AUDIT] Impersonation started:', JSON.stringify({
      event: 'IMPERSONATION_START',
      timestamp: new Date().toISOString(),
      superAdmin: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
      },
      targetOrganization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
      },
      clientIp,
      userAgent,
      expiresIn: `${IMPERSONATION_EXPIRY_SECONDS / 60} minutes`,
    }));

    // Create an impersonation token that will be verified by the middleware
    // This token contains the super admin's original ID and the target org with all context
    // JTI (JWT ID) allows individual token revocation
    const jti = generateJti();
    const iat = Math.floor(Date.now() / 1000);
    const exp = iat + IMPERSONATION_EXPIRY_SECONDS;

    const impersonationToken = jwt.sign(
      {
        jti, // Unique token ID for revocation
        superAdminId: session.user.id,
        superAdminEmail: session.user.email,
        superAdminName: session.user.name,
        organizationId: organization.id,
        organizationSlug: organization.slug,
        organizationName: organization.name,
        subscriptionTier: organization.subscriptionTier || 'FREE',
        enabledModules: organization.enabledModules || ['assets', 'subscriptions', 'suppliers'],
        purpose: 'impersonation',
        iat,
        exp,
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
