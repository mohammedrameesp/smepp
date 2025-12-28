import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/core/prisma';
import {
  decrypt,
  decryptState,
  upsertOAuthUser,
  createSessionToken,
  getTenantUrl,
} from '@/lib/oauth/utils';
import {
  exchangeAzureCodeForTokens,
  getAzureUserInfo,
  getAzureUserEmail,
  validateEmailDomain,
} from '@/lib/oauth/azure';

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
      console.error('Azure OAuth error:', error, errorDescription);
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

    const { subdomain, orgId } = state;

    // Get organization and its credentials
    const org = await prisma.organization.findUnique({
      where: { id: orgId || '' },
      select: {
        id: true,
        slug: true,
        customAzureClientId: true,
        customAzureClientSecret: true,
        customAzureTenantId: true,
        allowedEmailDomains: true,
        enforceDomainRestriction: true,
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

    // Exchange code for tokens
    const tokens = await exchangeAzureCodeForTokens(
      code,
      clientId,
      clientSecret,
      tenantId
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

    // Create or update user
    const user = await upsertOAuthUser(
      {
        email,
        name: azureUser.displayName,
        image: null, // Microsoft Graph doesn't return photo in basic call
        emailVerified: true, // Azure AD accounts are always verified
      },
      org.id
    );

    // Create session token
    const sessionToken = await createSessionToken(user.id, org.id);

    // Set the session cookie
    const cookieStore = await cookies();
    const isSecure = process.env.NODE_ENV === 'production';
    const cookieName = isSecure
      ? '__Secure-next-auth.session-token'
      : 'next-auth.session-token';

    cookieStore.set(cookieName, sessionToken, {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      domain: isSecure ? `.${process.env.NEXT_PUBLIC_APP_DOMAIN}` : undefined,
    });

    // Redirect to the organization's admin dashboard
    return NextResponse.redirect(getTenantUrl(subdomain, '/admin'));
  } catch (error) {
    console.error('Azure OAuth callback error:', error);

    // Try to get subdomain from state for error redirect
    const stateParam = request.nextUrl.searchParams.get('state');
    let subdomain = 'www';
    if (stateParam) {
      const state = decryptState(stateParam);
      if (state) subdomain = state.subdomain;
    }

    return NextResponse.redirect(
      `${getTenantUrl(subdomain, '/login')}?error=OAuthFailed`
    );
  }
}
