/**
 * @file route.ts
 * @description End current impersonation session
 * @module super-admin/impersonation
 *
 * This endpoint allows a super admin to cleanly end their impersonation session.
 * It revokes the token and clears the cookie.
 */

import { NextRequest, NextResponse } from 'next/server';
import * as jose from 'jose';
import { revokeToken } from '@/lib/security/impersonation';
import logger from '@/lib/core/log';

const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || 'localhost:3000';

export async function POST(request: NextRequest) {
  try {
    const impersonationCookie = request.cookies.get('durj-impersonation');

    if (!impersonationCookie?.value) {
      // No impersonation session - just redirect
      const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
      const response = NextResponse.json({
        success: true,
        message: 'No active impersonation session',
        redirectUrl: `${protocol}://${APP_DOMAIN}/super-admin`,
      });
      return response;
    }

    try {
      const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);
      const { payload } = await jose.jwtVerify(impersonationCookie.value, secret);

      // Revoke the token if it has a JTI
      if (payload.jti && payload.purpose === 'impersonation') {
        await revokeToken({
          jti: payload.jti as string,
          revokedBy: payload.superAdminId as string,
          reason: 'Session ended by user',
          superAdminId: payload.superAdminId as string,
          organizationId: payload.organizationId as string,
          organizationSlug: payload.organizationSlug as string,
          issuedAt: new Date((payload.iat as number) * 1000),
          expiresAt: new Date((payload.exp as number) * 1000),
        });

        logger.info({
          event: 'IMPERSONATION_ENDED',
          superAdminId: payload.superAdminId as string,
          organizationId: payload.organizationId as string,
          organizationSlug: payload.organizationSlug as string,
        }, 'Impersonation ended');
      }
    } catch {
      // Token expired or invalid - still clear the cookie
      logger.debug('Expired/invalid impersonation token cleared');
    }

    // Clear the cookie and redirect to super admin dashboard
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    const response = NextResponse.json({
      success: true,
      message: 'Impersonation ended',
      redirectUrl: `${protocol}://${APP_DOMAIN}/super-admin`,
    });

    response.cookies.set('durj-impersonation', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 0,
    });

    return response;
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : 'Unknown error', stack: error instanceof Error ? error.stack : undefined }, 'End impersonation error');
    return NextResponse.json(
      { error: 'Failed to end impersonation' },
      { status: 500 }
    );
  }
}

/* CODE REVIEW SUMMARY
 * Date: 2026-02-01
 * Reviewer: Claude
 * Status: Reviewed
 * Changes: Added review summary
 * Issues: None identified
 */
