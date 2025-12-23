import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// ═══════════════════════════════════════════════════════════════════════════════
// DELETE /api/organizations/[id]/members/[memberId] - Remove member from org
// ═══════════════════════════════════════════════════════════════════════════════

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: organizationId, memberId } = await params;

    // Verify current user is an admin or owner
    const currentMembership = await prisma.organizationUser.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId: session.user.id,
        },
      },
    });

    if (!currentMembership) {
      return NextResponse.json({ error: 'Not a member of this organization' }, { status: 403 });
    }

    if (!currentMembership.isOwner && currentMembership.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only admins can remove members' }, { status: 403 });
    }

    // Get the member to be removed
    const targetMembership = await prisma.organizationUser.findUnique({
      where: { id: memberId },
      include: {
        user: {
          select: { email: true },
        },
      },
    });

    if (!targetMembership || targetMembership.organizationId !== organizationId) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Cannot remove the owner
    if (targetMembership.isOwner) {
      return NextResponse.json({ error: 'Cannot remove the organization owner' }, { status: 400 });
    }

    // Cannot remove yourself (use leave organization instead)
    if (targetMembership.userId === session.user.id) {
      return NextResponse.json({ error: 'Cannot remove yourself. Use leave organization instead.' }, { status: 400 });
    }

    // Non-owners can only remove members with lower roles
    if (!currentMembership.isOwner) {
      const roleHierarchy = ['MEMBER', 'MANAGER', 'ADMIN', 'OWNER'];
      const currentRoleIndex = roleHierarchy.indexOf(currentMembership.role);
      const targetRoleIndex = roleHierarchy.indexOf(targetMembership.role);

      if (targetRoleIndex >= currentRoleIndex) {
        return NextResponse.json(
          { error: 'Cannot remove members with equal or higher role' },
          { status: 403 }
        );
      }
    }

    // Remove the member
    await prisma.organizationUser.delete({
      where: { id: memberId },
    });

    return NextResponse.json({
      success: true,
      message: `Removed ${targetMembership.user.email} from organization`,
    });
  } catch (error) {
    console.error('Remove member error:', error);
    return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 });
  }
}
