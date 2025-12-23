import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/admin/team - Get organization members
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only org admins/owners can view team
    if (session.user.orgRole !== 'OWNER' && session.user.orgRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const members = await prisma.organizationUser.findMany({
      where: { organizationId: session.user.organizationId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            createdAt: true,
          },
        },
      },
      orderBy: [
        { isOwner: 'desc' },
        { role: 'asc' },
        { joinedAt: 'asc' },
      ],
    });

    // Get org limits
    const org = await prisma.organization.findUnique({
      where: { id: session.user.organizationId },
      select: { maxUsers: true },
    });

    return NextResponse.json({
      members: members.map((m) => ({
        id: m.id,
        role: m.role,
        isOwner: m.isOwner,
        joinedAt: m.joinedAt,
        user: m.user,
      })),
      limits: {
        maxUsers: org?.maxUsers || 5,
        currentUsers: members.length,
      },
    });
  } catch (error) {
    console.error('Get team error:', error);
    return NextResponse.json(
      { error: 'Failed to get team members' },
      { status: 500 }
    );
  }
}
