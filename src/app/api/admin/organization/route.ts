import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { z } from 'zod';
import { updateSetupProgressBulk } from '@/features/onboarding/lib';
import logger from '@/lib/core/log';

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/admin/organization - Get current organization details
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const organization = await prisma.organization.findUnique({
      where: { id: session.user.organizationId },
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        subscriptionTier: true,
        maxUsers: true,
        maxAssets: true,
        createdAt: true,
        codePrefix: true,
        codeFormats: true,
        // Branding
        primaryColor: true,
        secondaryColor: true,
        website: true,
        // Currency settings
        additionalCurrencies: true,
        // Module settings
        enabledModules: true,
        // Location settings
        hasMultipleLocations: true,
        // Auth settings
        allowedAuthMethods: true,
        customGoogleClientId: true,
        customGoogleClientSecret: true,
        customAzureClientId: true,
        customAzureClientSecret: true,
        _count: {
          select: {
            teamMembers: true,
            assets: true,
          },
        },
      },
    });

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Compute auth config (don't expose actual secrets)
    const allowedMethods = organization.allowedAuthMethods || [];
    const hasCustomGoogleOAuth = !!(organization.customGoogleClientId && organization.customGoogleClientSecret);
    const hasCustomAzureOAuth = !!(organization.customAzureClientId && organization.customAzureClientSecret);
    const hasSSO = hasCustomGoogleOAuth || hasCustomAzureOAuth;
    const hasCredentials = allowedMethods.length === 0 || allowedMethods.includes('credentials');

    // Remove sensitive fields before returning
    const { customGoogleClientId: _customGoogleClientId, customGoogleClientSecret: _customGoogleClientSecret, customAzureClientId: _customAzureClientId, customAzureClientSecret: _customAzureClientSecret, ...orgData } = organization;

    return NextResponse.json({
      organization: orgData,
      authConfig: {
        allowedMethods,
        hasCredentials,
        hasSSO,
        hasCustomGoogleOAuth,
        hasCustomAzureOAuth,
      },
    });
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Get organization error');
    return NextResponse.json(
      { error: 'Failed to get organization' },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH /api/admin/organization - Update organization details
// ═══════════════════════════════════════════════════════════════════════════════

// Color validation: allow null, empty string, or valid hex color
const colorSchema = z.preprocess(
  (val) => (val === '' || val === null || val === undefined) ? null : val,
  z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format').nullable()
).optional();

const updateOrgSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100).optional(),
  codePrefix: z.string().length(3, 'Code prefix must be exactly 3 characters').regex(/^[A-Z0-9]+$/, 'Only uppercase letters and numbers allowed').optional(),
  primaryColor: colorSchema,
  secondaryColor: colorSchema,
  website: z.string().url('Invalid URL format').nullable().optional().or(z.literal('')),
  additionalCurrencies: z.array(z.string()).optional(),
  enabledModules: z.array(z.string()).optional(),
  hasMultipleLocations: z.boolean().optional(),
});

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Only owners/admins can update org
    if (session.user.orgRole !== 'OWNER' && session.user.orgRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const result = updateOrgSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, codePrefix, primaryColor, secondaryColor, website, additionalCurrencies, enabledModules, hasMultipleLocations } = result.data;

    // Normalize colors: empty/null resets to default for primaryColor, null for secondaryColor
    const DEFAULT_PRIMARY_COLOR = '#0f172a';
    const normalizedPrimaryColor = (!primaryColor || primaryColor === '') ? DEFAULT_PRIMARY_COLOR : primaryColor;
    const normalizedSecondaryColor = (!secondaryColor || secondaryColor === '') ? null : secondaryColor;

    // Normalize website: empty string becomes null
    const normalizedWebsite = (!website || website === '') ? null : website;

    const updated = await prisma.organization.update({
      where: { id: session.user.organizationId },
      data: {
        ...(name && { name }),
        ...(codePrefix && { codePrefix }),
        ...(primaryColor !== undefined && { primaryColor: normalizedPrimaryColor }),
        ...(secondaryColor !== undefined && { secondaryColor: normalizedSecondaryColor }),
        ...(website !== undefined && { website: normalizedWebsite }),
        ...(additionalCurrencies !== undefined && { additionalCurrencies }),
        ...(enabledModules !== undefined && { enabledModules }),
        ...(hasMultipleLocations !== undefined && { hasMultipleLocations }),
      },
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        codePrefix: true,
        primaryColor: true,
        secondaryColor: true,
        website: true,
        additionalCurrencies: true,
        enabledModules: true,
        hasMultipleLocations: true,
      },
    });

    // Update setup progress (non-blocking)
    const progressUpdates: Record<string, boolean> = {};
    if (name) progressUpdates.profileComplete = true;
    if (primaryColor) progressUpdates.brandingConfigured = true;
    if (Object.keys(progressUpdates).length > 0) {
      updateSetupProgressBulk(session.user.organizationId, progressUpdates).catch(() => {});
    }

    return NextResponse.json({ organization: updated });
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Update organization error');
    return NextResponse.json(
      { error: 'Failed to update organization' },
      { status: 500 }
    );
  }
}
