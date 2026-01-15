import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import { encryptState } from '@/lib/oauth/utils';
import { buildAzureAuthUrl } from '@/lib/oauth/azure';
import logger from '@/lib/core/log';

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/auth/oauth/azure
// Initiate Azure AD OAuth flow with org-specific or platform credentials
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
        customAzureClientId: true,
        customAzureClientSecret: true,
        customAzureTenantId: true,
        allowedAuthMethods: true,
        allowedEmailDomains: true,
        enforceDomainRestriction: true,
        customDomain: true,
        customDomainVerified: true,
      },
    });

    // Check if organization exists
    if (!org) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Check if Azure auth is allowed for this organization
    const azureAllowed =
      org.allowedAuthMethods.length === 0 ||
      org.allowedAuthMethods.includes('azure-ad');

    if (!azureAllowed) {
      return NextResponse.json(
        { error: 'Microsoft authentication is not allowed for this organization' },
        { status: 403 }
      );
    }

    // Determine which credentials to use
    const hasCustomCredentials =
      org.customAzureClientId && org.customAzureClientSecret;

    const clientId = hasCustomCredentials
      ? org.customAzureClientId!
      : process.env.AZURE_AD_CLIENT_ID;

    const tenantId = hasCustomCredentials
      ? org.customAzureTenantId || 'common'
      : process.env.AZURE_AD_TENANT_ID || 'common';

    if (!clientId) {
      return NextResponse.json(
        { error: 'Microsoft OAuth is not configured' },
        { status: 500 }
      );
    }

    // Determine the correct origin for redirect URI
    // Priority: 1) Verified custom domain, 2) Request host header
    const protocol = request.headers.get('x-forwarded-proto') || 'https';
    let origin: string;

    if (org.customDomain && org.customDomainVerified) {
      // Use the verified custom domain
      origin = `${protocol}://${org.customDomain}`;
    } else {
      // Fall back to request host header
      const host = request.headers.get('host') || '';
      origin = `${protocol}://${host}`;
    }

    const redirectUri = `${origin}/api/auth/oauth/azure/callback`;

    // Create encrypted state for CSRF protection
    // Include invite token if present (for invite signup flow)
    const state = encryptState({
      subdomain: org.slug,
      orgId: org.id,
      provider: 'azure',
      inviteToken: inviteToken || undefined,
      redirectUri, // Store for callback to use
    });

    // Build the Azure OAuth URL
    const authUrl = buildAzureAuthUrl(clientId, state, tenantId, redirectUri);

    // Redirect to Azure
    return NextResponse.redirect(authUrl);
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Azure OAuth initiation error');
    return NextResponse.json(
      { error: 'Failed to initiate Microsoft OAuth' },
      { status: 500 }
    );
  }
}
