import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { z } from 'zod';
import { TeamMemberStatus } from '@prisma/client';
import logger from '@/lib/core/log';

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH /api/admin/team/[memberId] - Update member permissions
// ═══════════════════════════════════════════════════════════════════════════════

const updateMemberSchema = z.object({
  // New boolean-based permission system
  isAdmin: z.boolean().optional(),
  hasOperationsAccess: z.boolean().optional(),
  hasHRAccess: z.boolean().optional(),
  hasFinanceAccess: z.boolean().optional(),
  canApprove: z.boolean().optional(),
  // Legacy role field for backwards compatibility
  role: z.enum(['ADMIN', 'MEMBER']).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Only owners can change roles
    if (!session.user.isOwner) {
      return NextResponse.json({ error: 'Owner access required' }, { status: 403 });
    }

    const { memberId } = await params;
    const body = await request.json();
    const result = updateMemberSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    // Check member exists and belongs to org
    const member = await prisma.teamMember.findUnique({
      where: { id: memberId },
    });

    if (!member || member.tenantId !== session.user.organizationId) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Can't change own permissions
    if (member.id === session.user.id) {
      return NextResponse.json(
        { error: 'Cannot change your own permissions' },
        { status: 400 }
      );
    }

    // Build update data from new boolean fields or legacy role
    const updateData: {
      isAdmin?: boolean;
      hasOperationsAccess?: boolean;
      hasHRAccess?: boolean;
      hasFinanceAccess?: boolean;
      canApprove?: boolean;
      permissionsUpdatedAt?: Date;
    } = {};

    // If legacy role is provided, map to isAdmin
    if (result.data.role !== undefined) {
      updateData.isAdmin = result.data.role === 'ADMIN';
    }
    // Otherwise, use the new boolean fields if provided
    if (result.data.isAdmin !== undefined) updateData.isAdmin = result.data.isAdmin;
    if (result.data.hasOperationsAccess !== undefined) updateData.hasOperationsAccess = result.data.hasOperationsAccess;
    if (result.data.hasHRAccess !== undefined) updateData.hasHRAccess = result.data.hasHRAccess;
    if (result.data.hasFinanceAccess !== undefined) updateData.hasFinanceAccess = result.data.hasFinanceAccess;
    if (result.data.canApprove !== undefined) updateData.canApprove = result.data.canApprove;

    // Set permissionsUpdatedAt if any permission field is being updated
    if (Object.keys(updateData).length > 0) {
      updateData.permissionsUpdatedAt = new Date();
    }

    // Update permissions
    const updated = await prisma.teamMember.update({
      where: { id: memberId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        isAdmin: true,
        hasOperationsAccess: true,
        hasHRAccess: true,
        hasFinanceAccess: true,
        canApprove: true,
        isOwner: true,
      },
    });

    return NextResponse.json({
      member: {
        ...updated,
        // Legacy role field for backwards compatibility
        role: updated.isAdmin ? 'ADMIN' : 'MEMBER',
      },
    });
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Failed to update member');
    return NextResponse.json(
      { error: 'Failed to update member' },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// DELETE /api/admin/team/[memberId] - Remove member from organization
// ═══════════════════════════════════════════════════════════════════════════════

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Only admins/owners can remove members
    if (!session.user.isOwner && !session.user.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { memberId } = await params;

    // Check member exists and belongs to org
    const member = await prisma.teamMember.findUnique({
      where: { id: memberId },
      select: {
        id: true,
        name: true,
        email: true,
        tenantId: true,
        isAdmin: true,
        isOwner: true,
      },
    });

    if (!member || member.tenantId !== session.user.organizationId) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Can't remove yourself
    if (member.id === session.user.id) {
      return NextResponse.json(
        { error: 'Cannot remove yourself from the organization' },
        { status: 400 }
      );
    }

    // Can't remove the owner
    if (member.isOwner) {
      return NextResponse.json(
        { error: 'Cannot remove the organization owner' },
        { status: 400 }
      );
    }

    // Admins can't remove other admins (only owners can)
    if (!session.user.isOwner && member.isAdmin) {
      return NextResponse.json(
        { error: 'Only owners can remove admins' },
        { status: 403 }
      );
    }

    // Soft delete member (mark as terminated)
    await prisma.teamMember.update({
      where: { id: memberId },
      data: {
        status: TeamMemberStatus.TERMINATED,
        isDeleted: true,
        deletedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Failed to remove member');
    return NextResponse.json(
      { error: 'Failed to remove member' },
      { status: 500 }
    );
  }
}
