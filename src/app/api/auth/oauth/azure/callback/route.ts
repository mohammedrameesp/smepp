/**
 * @module api/auth/oauth/azure/callback
 * @description Azure AD OAuth callback handler for custom OAuth flows.
 *
 * This route handles the OAuth callback from Azure AD when organizations use
 * custom Azure AD credentials instead of the platform's default OAuth app.
 * It supports tenant-specific Azure configurations with optional domain restrictions.
 *
 * @route GET /api/auth/oauth/azure/callback
 *
 * @security
 * - Validates encrypted OAuth state parameter to prevent CSRF
 * - Supports custom Azure AD tenant IDs for enterprise SSO
 * - Enforces email domain restrictions when configured
 * - Validates user security status (isDeleted, canLogin, lockout)
 * - Creates httpOnly session cookies with proper domain scoping
 *
 * @flow
 * 1. Validates OAuth callback parameters (code, state)
 * 2. Decrypts state to get organization context
 * 3. Exchanges authorization code for access tokens
 * 4. Fetches user profile from Microsoft Graph API
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
  exchangeAzureCodeForTokens,
  getAzureUserInfo,
  getAzureUserEmail,
  validateEmailDomain,
} from '@/lib/oauth/azure';
import logger from '@/lib/core/log';
import { handleSystemError } from '@/lib/core/error-logger';

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/auth/oauth/azure/callback
// Handle Azure AD OAuth callback
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get('code');
    const stateParam = request.nextUrl.searchParams.get('state');
    const error = request.nextUrl.searchParams.get('error');
    const errorDescription = request.nextUrl.searchParams.get('error_description');

    // Handle OAuth errors from Azure
    if (error) {
      logger.error({ error, errorDescription: errorDescription ?? undefined }, 'Azure OAuth error');
      return NextResponse.redirect(
        `${getTenantUrl('www', '/login')}?error=OAuthError&message=${encodeURIComponent(errorDescription || error)}`
      );
    }

    if (!code || !stateParam) {
      return NextResponse.redirect(
        `${getTenantUrl('www', '/login')}?error=MissingParams`
      );
    }

    // Decrypt and validate state
    const state = decryptState(stateParam);
    if (!state || state.provider !== 'azure') {
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
        customAzureClientId: true,
        customAzureClientSecret: true,
        customAzureTenantId: true,
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
      org.customAzureClientId && org.customAzureClientSecret;

    const clientId = hasCustomCredentials
      ? org.customAzureClientId!
      : process.env.AZURE_AD_CLIENT_ID!;

    const clientSecret = hasCustomCredentials
      ? decrypt(org.customAzureClientSecret!)
      : process.env.AZURE_AD_CLIENT_SECRET!;

    const tenantId = hasCustomCredentials
      ? org.customAzureTenantId || 'common'
      : process.env.AZURE_AD_TENANT_ID || 'common';

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(
        `${getTenantUrl(subdomain, '/login')}?error=OAuthNotConfigured`
      );
    }

    // Exchange code for tokens - must use same redirectUri from authorization request
    const tokens = await exchangeAzureCodeForTokens(
      code,
      clientId,
      clientSecret,
      tenantId,
      redirectUri
    );

    // Get user info from Microsoft Graph
    const azureUser = await getAzureUserInfo(tokens.access_token);
    const email = getAzureUserEmail(azureUser);

    // Validate email domain if restriction is enabled
    if (!validateEmailDomain(
      email,
      org.allowedEmailDomains,
      org.enforceDomainRestriction
    )) {
      return NextResponse.redirect(
        `${getTenantUrl(subdomain, '/login')}?error=DomainNotAllowed`
      );
    }

    // SECURITY: Validate OAuth security checks (mirrors NextAuth signIn callback)
    // This checks: isDeleted, canLogin, account lockout, and auth method restrictions
    const securityCheck = await validateOAuthSecurity(email, org.id, 'azure-ad');
    if (!securityCheck.allowed) {
      logger.warn({ reason: securityCheck.error, orgId: org.id }, 'Azure OAuth security check failed');
      return NextResponse.redirect(
        `${getTenantUrl(subdomain, '/login')}?error=${securityCheck.error}`
      );
    }

    // Create or update user
    const teamMember = await upsertOAuthUser(
      {
        email,
        name: azureUser.displayName,
        image: null, // Microsoft Graph doesn't return photo in basic call
        emailVerified: true, // Azure AD accounts are always verified
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
    logger.error({ error: errorMessage }, 'Azure OAuth callback error');

    handleSystemError({
      type: 'API_ERROR',
      source: 'auth',
      action: 'azure-oauth-callback',
      method: 'GET',
      path: '/api/auth/oauth/azure/callback',
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
 * Azure AD OAuth callback handler for custom per-organization OAuth credentials.
 * Implements complete OAuth 2.0 authorization code flow with Azure AD.
 *
 * SECURITY ASSESSMENT: GOOD
 * - Encrypted state parameter prevents CSRF attacks
 * - Email domain restrictions configurable per organization
 * - OAuth security validation (isDeleted, canLogin, lockout) applied
 * - Custom Azure credentials decrypted securely
 * - Session cookies use httpOnly, secure, and proper domain scoping
 * - Error handling logs to system error dashboard
 *
 * POTENTIAL IMPROVEMENTS:
 * 1. Consider adding PKCE flow for enhanced security
 * 2. Token refresh/revocation endpoint support
 * 3. Azure AD group-to-role mapping capability
 *
 * DEPENDENCIES:
 * - @/lib/oauth/utils: State encryption, user upsert, session creation
 * - @/lib/oauth/azure: Azure-specific OAuth helpers
 * - @/lib/core/prisma: Database access
 *
 * LAST REVIEWED: 2026-02-01
 * ============================================================================= */
