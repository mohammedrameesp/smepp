import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { z } from 'zod';

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

    const { name } = result.data;

    const updated = await prisma.organization.update({
      where: { id: session.user.organizationId },
      data: {
        ...(name && { name }),
      },
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
      },
    });

    return NextResponse.json({ organization: updated });
  } catch (error) {
    console.error('Update organization error:', error);
    return NextResponse.json(
      { error: 'Failed to update organization' },
      { status: 500 }
    );
  }
}
