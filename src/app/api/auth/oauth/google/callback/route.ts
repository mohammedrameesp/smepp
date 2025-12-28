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
  exchangeGoogleCodeForTokens,
  getGoogleUserInfo,
  validateEmailDomain,
} from '@/lib/oauth/google';

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
      console.error('Google OAuth error:', error);
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

    const { subdomain, orgId } = state;

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

    // Exchange code for tokens
    const tokens = await exchangeGoogleCodeForTokens(code, clientId, clientSecret);

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

    // Create or update user
    const user = await upsertOAuthUser(
      {
        email: googleUser.email,
        name: googleUser.name,
        image: googleUser.picture,
        emailVerified: googleUser.verified_email,
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
    console.error('Google OAuth callback error:', error);

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
