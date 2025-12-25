import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/core/prisma';

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'fallback-secret';

// Cookie name for impersonation session
export const IMPERSONATION_COOKIE = 'smepp-impersonation';

interface ImpersonationPayload {
  superAdminId: string;
  superAdminEmail: string;
  organizationId: string;
  organizationSlug: string;
  organizationName: string;
  purpose: string;
  iat: number;
  exp: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/impersonate/verify - Verify impersonation token and set cookie
// ═══════════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

    // Verify the token
    let payload: ImpersonationPayload;
    try {
      payload = jwt.verify(token, JWT_SECRET) as ImpersonationPayload;
    } catch (err) {
      return NextResponse.json(
        { error: 'Invalid or expired impersonation token' },
        { status: 401 }
      );
    }

    // Validate the token purpose
    if (payload.purpose !== 'impersonation') {
      return NextResponse.json(
        { error: 'Invalid token purpose' },
        { status: 401 }
      );
    }

    // Verify the super admin still exists and is still a super admin
    const superAdmin = await prisma.user.findUnique({
      where: { id: payload.superAdminId },
      select: { id: true, email: true, name: true, isSuperAdmin: true },
    });

    if (!superAdmin || !superAdmin.isSuperAdmin) {
      return NextResponse.json(
        { error: 'Super admin not found or no longer authorized' },
        { status: 403 }
      );
    }

    // Verify the organization still exists
    const organization = await prisma.organization.findUnique({
      where: { id: payload.organizationId },
      select: {
        id: true,
        name: true,
        slug: true,
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

    // Create an impersonation session cookie
    // This contains all the info needed to act as an admin of this org
    const impersonationData = {
      superAdminId: superAdmin.id,
      superAdminEmail: superAdmin.email,
      superAdminName: superAdmin.name,
      organizationId: organization.id,
      organizationSlug: organization.slug,
      organizationName: organization.name,
      subscriptionTier: organization.subscriptionTier,
      enabledModules: organization.enabledModules,
      startedAt: new Date().toISOString(),
      expiresAt: new Date(payload.exp * 1000).toISOString(),
    };

    const impersonationCookie = jwt.sign(impersonationData, JWT_SECRET, {
      expiresIn: '4h', // Match the original token expiry
    });

    // Create the response with the impersonation cookie
    const response = NextResponse.json({
      success: true,
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
      },
      superAdmin: {
        email: superAdmin.email,
        name: superAdmin.name,
      },
    });

    // Set the impersonation cookie
    response.cookies.set(IMPERSONATION_COOKIE, impersonationCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 4 * 60 * 60, // 4 hours
      // Set domain to allow subdomain access
      domain: process.env.NEXTAUTH_COOKIE_DOMAIN || undefined,
    });

    return response;
  } catch (error) {
    console.error('Impersonation verify error:', error);
    return NextResponse.json(
      { error: 'Failed to verify impersonation token' },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// DELETE /api/impersonate/verify - End impersonation session
// ═══════════════════════════════════════════════════════════════════════════════

export async function DELETE() {
  const response = NextResponse.json({ success: true });

  // Clear the impersonation cookie
  response.cookies.set(IMPERSONATION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0, // Delete the cookie
    domain: process.env.NEXTAUTH_COOKIE_DOMAIN || undefined,
  });

  return response;
}

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/impersonate/verify - Check current impersonation status
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  const cookie = request.cookies.get(IMPERSONATION_COOKIE);

  if (!cookie?.value) {
    return NextResponse.json({ isImpersonating: false });
  }

  try {
    const payload = jwt.verify(cookie.value, JWT_SECRET) as {
      superAdminId: string;
      superAdminEmail: string;
      superAdminName: string | null;
      organizationId: string;
      organizationSlug: string;
      organizationName: string;
      startedAt: string;
      expiresAt: string;
    };

    return NextResponse.json({
      isImpersonating: true,
      superAdmin: {
        id: payload.superAdminId,
        email: payload.superAdminEmail,
        name: payload.superAdminName,
      },
      organization: {
        id: payload.organizationId,
        slug: payload.organizationSlug,
        name: payload.organizationName,
      },
      startedAt: payload.startedAt,
      expiresAt: payload.expiresAt,
    });
  } catch (err) {
    // Invalid or expired cookie
    return NextResponse.json({ isImpersonating: false });
  }
}
