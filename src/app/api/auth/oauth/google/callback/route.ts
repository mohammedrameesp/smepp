import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/core/prisma';
import {
  decrypt,
  decryptState,
  upsertOAuthUser,
  createSessionToken,
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
      where: { id: orgId || '' },
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
    const result = await upsertOAuthUser(
      {
        email: googleUser.email,
        name: googleUser.name,
        image: googleUser.picture,
        emailVerified: googleUser.verified_email,
      },
      org.id
    );

    // Create session token
    const sessionToken = result.type === 'teamMember'
      ? await createTeamMemberSessionToken(result.id)
      : await createSessionToken(result.id, org.id);

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
