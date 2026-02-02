/**
 * @module api/auth/oauth/google/callback
 * @description Google OAuth callback handler for custom OAuth flows.
 *
 * This route handles the OAuth callback from Google when organizations use
 * custom Google OAuth credentials instead of the platform's default OAuth app.
 * It supports tenant-specific Google configurations with optional domain restrictions.
 *
 * @route GET /api/auth/oauth/google/callback
 *
 * @security
 * - Validates encrypted OAuth state parameter to prevent CSRF
 * - Enforces email domain restrictions when configured
 * - Validates user security status (isDeleted, canLogin, lockout)
 * - Creates httpOnly session cookies with proper domain scoping
 *
 * @flow
 * 1. Validates OAuth callback parameters (code, state)
 * 2. Decrypts state to get organization context
 * 3. Exchanges authorization code for access tokens
 * 4. Fetches user profile from Google userinfo API
 * 5. Validates email domain against org restrictions
 * 6. Creates/updates user and team member records
 * 7. Sets session cookie and redirects to dashboard
 */
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/core/prisma';
import {
  decrypt,
  decryptState,
  upsertOAuthUser,
  createTeamMemberSessionToken,
  getTenantUrl,
  validateOAuthSecurity,
} from '@/lib/oauth/utils';
import {
  exchangeGoogleCodeForTokens,
  getGoogleUserInfo,
  validateEmailDomain,
} from '@/lib/oauth/google';
import logger from '@/lib/core/log';
import { handleSystemError } from '@/lib/core/error-logger';

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/auth/oauth/google/callback
// Handle Google OAuth callback
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get('code');
    const stateParam = request.nextUrl.searchParams.get('state');
    const error = request.nextUrl.searchParams.get('error');

    // Handle OAuth errors from Google
    if (error) {
      logger.error({ error }, 'Google OAuth error');
      return NextResponse.redirect(
        `${getTenantUrl('www', '/login')}?error=OAuthError&message=${encodeURIComponent(error)}`
      );
    }

    if (!code || !stateParam) {
      return NextResponse.redirect(
        `${getTenantUrl('www', '/login')}?error=MissingParams`
      );
    }

    // Decrypt and validate state
    const state = decryptState(stateParam);
    if (!state || state.provider !== 'google') {
      return NextResponse.redirect(
        `${getTenantUrl('www', '/login')}?error=InvalidState`
      );
    }

    const { subdomain, orgId, inviteToken, redirectUri } = state;

    // Get organization and its credentials
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: {
        id: true,
        slug: true,
        customGoogleClientId: true,
        customGoogleClientSecret: true,
        allowedEmailDomains: true,
        enforceDomainRestriction: true,
        customDomain: true,
        customDomainVerified: true,
      },
    });

    if (!org) {
      return NextResponse.redirect(
        `${getTenantUrl(subdomain, '/login')}?error=OrganizationNotFound`
      );
    }

    // Determine which credentials to use
    const hasCustomCredentials =
      org.customGoogleClientId && org.customGoogleClientSecret;

    const clientId = hasCustomCredentials
      ? org.customGoogleClientId!
      : process.env.GOOGLE_CLIENT_ID!;

    const clientSecret = hasCustomCredentials
      ? decrypt(org.customGoogleClientSecret!)
      : process.env.GOOGLE_CLIENT_SECRET!;

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(
        `${getTenantUrl(subdomain, '/login')}?error=OAuthNotConfigured`
      );
    }

    // Exchange code for tokens (use same redirectUri from state)
    const tokens = await exchangeGoogleCodeForTokens(code, clientId, clientSecret, redirectUri);

    // Get user info from Google
    const googleUser = await getGoogleUserInfo(tokens.access_token);

    // Validate email domain if restriction is enabled
    if (!validateEmailDomain(
      googleUser.email,
      org.allowedEmailDomains,
      org.enforceDomainRestriction
    )) {
      return NextResponse.redirect(
        `${getTenantUrl(subdomain, '/login')}?error=DomainNotAllowed`
      );
    }

    // SECURITY: Validate OAuth security checks (mirrors NextAuth signIn callback)
    // This checks: isDeleted, canLogin, account lockout, and auth method restrictions
    const securityCheck = await validateOAuthSecurity(googleUser.email, org.id, 'google');
    if (!securityCheck.allowed) {
      logger.warn({ reason: securityCheck.error, orgId: org.id }, 'Google OAuth security check failed');
      return NextResponse.redirect(
        `${getTenantUrl(subdomain, '/login')}?error=${securityCheck.error}`
      );
    }

    // Create or update user
    const teamMember = await upsertOAuthUser(
      {
        email: googleUser.email,
        name: googleUser.name,
        image: googleUser.picture,
        emailVerified: googleUser.verified_email,
      },
      org.id
    );

    // Create session token
    const sessionToken = await createTeamMemberSessionToken(teamMember.id);

    // Set the session cookie
    const cookieStore = await cookies();
    const isSecure = process.env.NODE_ENV === 'production';
    const cookieName = isSecure
      ? '__Secure-next-auth.session-token'
      : 'next-auth.session-token';

    // Determine if using custom domain (check if redirectUri contains custom domain)
    const hasVerifiedCustomDomain = org.customDomain && org.customDomainVerified;
    const isUsingCustomDomain = hasVerifiedCustomDomain && redirectUri?.includes(org.customDomain!);

    // For custom domains, don't set domain (cookie will be scoped to current host)
    // For platform subdomains, use the platform domain for cross-subdomain sharing
    cookieStore.set(cookieName, sessionToken, {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      domain: isUsingCustomDomain ? undefined : (isSecure ? `.${process.env.NEXT_PUBLIC_APP_DOMAIN}` : undefined),
    });

    // Redirect based on flow
    // If invite token is present, redirect to invite page to complete invitation acceptance
    // Otherwise, redirect to admin dashboard
    const redirectPath = inviteToken ? `/invite/${inviteToken}` : '/admin';

    // Use custom domain for redirect if available and verified
    if (isUsingCustomDomain) {
      return NextResponse.redirect(`https://${org.customDomain}${redirectPath}`);
    }
    return NextResponse.redirect(getTenantUrl(subdomain, redirectPath));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error({ error: errorMessage }, 'Google OAuth callback error');

    handleSystemError({
      type: 'API_ERROR',
      source: 'auth',
      action: 'google-oauth-callback',
      method: 'GET',
      path: '/api/auth/oauth/google/callback',
      message: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      statusCode: 500,
      severity: 'error',
    });

    // Try to get subdomain from state for error redirect
    // Use consumeOnSuccess=false since we're only reading for error redirect
    const stateParam = request.nextUrl.searchParams.get('state');
    let subdomain = 'www';
    if (stateParam) {
      const state = decryptState(stateParam, false);
      if (state) subdomain = state.subdomain;
    }

    return NextResponse.redirect(
      `${getTenantUrl(subdomain, '/login')}?error=OAuthFailed`
    );
  }
}

/* =============================================================================
 * CODE REVIEW SUMMARY
 * =============================================================================
 *
 * OVERVIEW:
 * Google OAuth callback handler for custom per-organization OAuth credentials.
 * Implements complete OAuth 2.0 authorization code flow with Google.
 *
 * SECURITY ASSESSMENT: GOOD
 * - Encrypted state parameter prevents CSRF attacks
 * - Email domain restrictions configurable per organization
 * - OAuth security validation (isDeleted, canLogin, lockout) applied
 * - Custom Google credentials decrypted securely
 * - Session cookies use httpOnly, secure, and proper domain scoping
 * - Error handling logs to system error dashboard
 *
 * POTENTIAL IMPROVEMENTS:
 * 1. Consider adding PKCE flow for enhanced security
 * 2. Token refresh/revocation support for long-lived sessions
 * 3. Google Workspace domain verification
 *
 * DEPENDENCIES:
 * - @/lib/oauth/utils: State encryption, user upsert, session creation
 * - @/lib/oauth/google: Google-specific OAuth helpers
 * - @/lib/core/prisma: Database access
 *
 * LAST REVIEWED: 2026-02-01
 * ============================================================================= */
