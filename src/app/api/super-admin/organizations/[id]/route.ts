import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { z } from 'zod';

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/super-admin/organizations/[id] - Get single organization
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    const organization = await prisma.organization.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            members: true,
            assets: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: [
            { isOwner: 'desc' },
            { joinedAt: 'asc' },
          ],
        },
      },
    });

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
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
// PATCH /api/super-admin/organizations/[id] - Update organization
// ═══════════════════════════════════════════════════════════════════════════════

const updateOrgSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  maxUsers: z.number().min(1).optional(),
  maxAssets: z.number().min(1).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const result = updateOrgSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    // Check if organization exists
    const existing = await prisma.organization.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    const { name, maxUsers, maxAssets } = result.data;

    const organization = await prisma.organization.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(maxUsers && { maxUsers }),
        ...(maxAssets && { maxAssets }),
      },
    });

    return NextResponse.json({ organization });
  } catch (error) {
    console.error('Update organization error:', error);
    return NextResponse.json(
      { error: 'Failed to update organization' },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// DELETE /api/super-admin/organizations/[id] - Delete organization
// ═══════════════════════════════════════════════════════════════════════════════

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    // Check if organization exists
    const organization = await prisma.organization.findUnique({
      where: { id },
      include: {
        _count: {
          select: { members: true, assets: true },
        },
      },
    });

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Delete organization (cascade will handle related records)
    await prisma.organization.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete organization error:', error);
    return NextResponse.json(
      { error: 'Failed to delete organization' },
      { status: 500 }
    );
  }
}
