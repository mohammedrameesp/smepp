import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { z } from 'zod';
import { updateSetupProgressBulk } from '@/lib/domains/system/setup';

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/admin/organization - Get current organization details
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
        // Branding
        primaryColor: true,
        secondaryColor: true,
        // Currency settings
        additionalCurrencies: true,
        // Module settings
        enabledModules: true,
        _count: {
          select: {
            members: true,
            assets: true,
          },
        },
      },
    });

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    return NextResponse.json({ organization });
  } catch (error) {
    console.error('Get organization error:', error);
    return NextResponse.json(
      { error: 'Failed to get organization' },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH /api/admin/organization - Update organization details
// ═══════════════════════════════════════════════════════════════════════════════

const updateOrgSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100).optional(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format').optional(),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format').optional().nullable(),
  additionalCurrencies: z.array(z.string()).optional(),
  enabledModules: z.array(z.string()).optional(),
});

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

    const { name, primaryColor, secondaryColor, additionalCurrencies, enabledModules } = result.data;

    const updated = await prisma.organization.update({
      where: { id: session.user.organizationId },
      data: {
        ...(name && { name }),
        ...(primaryColor !== undefined && { primaryColor }),
        ...(secondaryColor !== undefined && { secondaryColor }),
        ...(additionalCurrencies !== undefined && { additionalCurrencies }),
        ...(enabledModules !== undefined && { enabledModules }),
      },
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        primaryColor: true,
        secondaryColor: true,
        additionalCurrencies: true,
        enabledModules: true,
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
    console.error('Update organization error:', error);
    return NextResponse.json(
      { error: 'Failed to update organization' },
      { status: 500 }
    );
  }
}
