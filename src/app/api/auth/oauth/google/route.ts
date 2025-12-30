import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import { decrypt, encryptState } from '@/lib/oauth/utils';
import { buildGoogleAuthUrl } from '@/lib/oauth/google';

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/auth/oauth/google
// Initiate Google OAuth flow with org-specific or platform credentials
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  try {
    const subdomain = request.nextUrl.searchParams.get('subdomain');
    const inviteToken = request.nextUrl.searchParams.get('invite');

    if (!subdomain) {
      return NextResponse.json(
        { error: 'Subdomain is required' },
        { status: 400 }
      );
    }

    // Get organization and its OAuth credentials
    const org = await prisma.organization.findUnique({
      where: { slug: subdomain.toLowerCase() },
      select: {
        id: true,
        slug: true,
        customGoogleClientId: true,
        customGoogleClientSecret: true,
        allowedAuthMethods: true,
        allowedEmailDomains: true,
        enforceDomainRestriction: true,
      },
    });

    // Check if organization exists
    if (!org) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Check if Google auth is allowed for this organization
    const googleAllowed =
      org.allowedAuthMethods.length === 0 ||
      org.allowedAuthMethods.includes('google');

    if (!googleAllowed) {
      return NextResponse.json(
        { error: 'Google authentication is not allowed for this organization' },
        { status: 403 }
      );
    }

    // Determine which credentials to use
    const hasCustomCredentials =
      org.customGoogleClientId && org.customGoogleClientSecret;

    const clientId = hasCustomCredentials
      ? org.customGoogleClientId!
      : process.env.GOOGLE_CLIENT_ID;

    if (!clientId) {
      return NextResponse.json(
        { error: 'Google OAuth is not configured' },
        { status: 500 }
      );
    }

    // Create encrypted state for CSRF protection
    // Include invite token if present (for invite signup flow)
    const state = encryptState({
      subdomain: org.slug,
      orgId: org.id,
      provider: 'google',
      inviteToken: inviteToken || undefined,
    });

    // Build the Google OAuth URL
    const authUrl = buildGoogleAuthUrl(clientId, state);

    // Redirect to Google
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Google OAuth initiation error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate Google OAuth' },
      { status: 500 }
    );
  }
}
