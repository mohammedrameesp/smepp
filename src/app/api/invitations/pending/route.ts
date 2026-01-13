import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import logger from '@/lib/core/log';

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/invitations/pending - Get pending invitations for current user
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find all pending invitations for this email
    const invitations = await prisma.organizationInvitation.findMany({
      where: {
        email: session.user.email.toLowerCase(),
        acceptedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({
      invitations: invitations.map((inv) => ({
        id: inv.id,
        token: inv.token,
        email: inv.email,
        role: inv.role,
        organization: inv.organization,
        expiresAt: inv.expiresAt,
        createdAt: inv.createdAt,
      })),
    });
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Failed to get pending invitations');
    return NextResponse.json(
      { error: 'Failed to get pending invitations' },
      { status: 500 }
    );
  }
}
