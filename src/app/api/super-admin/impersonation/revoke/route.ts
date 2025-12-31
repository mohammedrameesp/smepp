/**
 * @file route.ts
 * @description Revoke an impersonation token
 * @module super-admin/impersonation
 *
 * Security:
 * - Requires super admin authentication
 * - Requires recent 2FA verification
 * - Adds token JTI to revocation database
 * - Clears impersonation cookie if provided
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { requireRecent2FA } from '@/lib/two-factor';
import { revokeToken } from '@/lib/security/impersonation';
import * as jose from 'jose';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Require recent 2FA for token revocation
    const require2FAResult = await requireRecent2FA(session.user.id);
    if (require2FAResult) return require2FAResult;

    const body = await request.json();
    const { jti, reason } = body;

    // Option 1: Revoke by JTI directly
    if (jti) {
      // We need the token metadata - try to get from current cookie or require it in body
      const { superAdminId, organizationId, organizationSlug, issuedAt, expiresAt } = body;

      if (!superAdminId || !organizationId || !organizationSlug || !issuedAt || !expiresAt) {
        return NextResponse.json(
          { error: 'Token metadata required: superAdminId, organizationId, organizationSlug, issuedAt, expiresAt' },
          { status: 400 }
        );
      }

      await revokeToken({
        jti,
        revokedBy: session.user.id,
        reason,
        superAdminId,
        organizationId,
        organizationSlug,
        issuedAt: new Date(issuedAt),
        expiresAt: new Date(expiresAt),
      });

      console.log('[AUDIT] Impersonation token revoked:', {
        event: 'IMPERSONATION_REVOKED',
        timestamp: new Date().toISOString(),
        revokedBy: session.user.email,
        jti,
        organizationId,
        organizationSlug,
        reason,
      });

      return NextResponse.json({ success: true, message: 'Token revoked' });
    }

    // Option 2: Revoke current impersonation session (from cookie)
    const impersonationCookie = request.cookies.get('durj-impersonation');
    if (impersonationCookie?.value) {
      try {
        const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);
        const { payload } = await jose.jwtVerify(impersonationCookie.value, secret);

        if (payload.jti && payload.purpose === 'impersonation') {
          await revokeToken({
            jti: payload.jti as string,
            revokedBy: session.user.id,
            reason: reason || 'Session ended by super admin',
            superAdminId: payload.superAdminId as string,
            organizationId: payload.organizationId as string,
            organizationSlug: payload.organizationSlug as string,
            issuedAt: new Date((payload.iat as number) * 1000),
            expiresAt: new Date((payload.exp as number) * 1000),
          });

          console.log('[AUDIT] Current impersonation session revoked:', {
            event: 'IMPERSONATION_REVOKED',
            timestamp: new Date().toISOString(),
            revokedBy: session.user.email,
            jti: payload.jti,
            organizationId: payload.organizationId,
            organizationSlug: payload.organizationSlug,
            reason: reason || 'Session ended by super admin',
          });

          // Clear the cookie
          const response = NextResponse.json({ success: true, message: 'Current session revoked' });
          response.cookies.set('durj-impersonation', '', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            path: '/',
            maxAge: 0,
          });

          return response;
        }
      } catch {
        // Invalid or expired token - nothing to revoke
        return NextResponse.json(
          { error: 'No valid impersonation session found' },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Either jti or active impersonation cookie required' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Token revocation error:', error);
    return NextResponse.json(
      { error: 'Failed to revoke token' },
      { status: 500 }
    );
  }
}

/**
 * GET: Check if a token is revoked
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const jti = request.nextUrl.searchParams.get('jti');

    if (!jti) {
      return NextResponse.json({ error: 'JTI required' }, { status: 400 });
    }

    const { isTokenRevoked } = await import('@/lib/security/impersonation');
    const revoked = await isTokenRevoked(jti);

    return NextResponse.json({ jti, revoked });
  } catch (error) {
    console.error('Token check error:', error);
    return NextResponse.json(
      { error: 'Failed to check token status' },
      { status: 500 }
    );
  }
}
