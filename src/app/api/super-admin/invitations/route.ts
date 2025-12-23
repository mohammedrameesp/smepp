import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/super-admin/invitations - List all pending invitations
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const invitations = await prisma.organizationInvitation.findMany({
      where: {
        acceptedAt: null, // Only pending invitations
      },
      orderBy: { createdAt: 'desc' },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    // Add status (pending/expired)
    const now = new Date();
    const invitationsWithStatus = invitations.map((inv) => ({
      id: inv.id,
      email: inv.email,
      role: inv.role,
      organization: inv.organization,
      expiresAt: inv.expiresAt,
      createdAt: inv.createdAt,
      isExpired: inv.expiresAt < now,
    }));

    return NextResponse.json({ invitations: invitationsWithStatus });
  } catch (error) {
    console.error('Get invitations error:', error);
    return NextResponse.json(
      { error: 'Failed to get invitations' },
      { status: 500 }
    );
  }
}
