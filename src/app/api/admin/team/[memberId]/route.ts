import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { z } from 'zod';
import { TeamMemberRole, TeamMemberStatus } from '@prisma/client';
import logger from '@/lib/core/log';

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH /api/admin/team/[memberId] - Update member role
// ═══════════════════════════════════════════════════════════════════════════════

const updateMemberSchema = z.object({
  role: z.enum(['ADMIN', 'MEMBER']),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only owners can change roles
    if (session.user.orgRole !== 'OWNER') {
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

    // Can't change own role
    if (member.id === session.user.id) {
      return NextResponse.json(
        { error: 'Cannot change your own role' },
        { status: 400 }
      );
    }

    // Update role
    const updated = await prisma.teamMember.update({
      where: { id: memberId },
      data: { role: result.data.role as TeamMemberRole },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isOwner: true,
      },
    });

    return NextResponse.json({ member: updated });
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins/owners can remove members
    if (session.user.orgRole !== 'OWNER' && session.user.orgRole !== 'ADMIN') {
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
        role: true,
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
    if (session.user.orgRole === 'ADMIN' && member.role === 'ADMIN') {
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
