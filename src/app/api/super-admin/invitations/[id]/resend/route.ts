import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { randomBytes } from 'crypto';

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/super-admin/invitations/[id]/resend - Resend/regenerate invitation
// ═══════════════════════════════════════════════════════════════════════════════

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    // Find the invitation
    const invitation = await prisma.organizationInvitation.findUnique({
      where: { id },
      include: {
        organization: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      );
    }

    // Check if invitation was already accepted
    if (invitation.acceptedAt) {
      return NextResponse.json(
        { error: 'This invitation has already been accepted' },
        { status: 400 }
      );
    }

    // Generate new token and extend expiry
    const newToken = randomBytes(32).toString('hex');
    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Update the invitation
    const updatedInvitation = await prisma.organizationInvitation.update({
      where: { id },
      data: {
        token: newToken,
        expiresAt: newExpiresAt,
      },
    });

    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invite/${newToken}`;

    return NextResponse.json({
      success: true,
      invitation: {
        id: updatedInvitation.id,
        email: updatedInvitation.email,
        inviteUrl,
        expiresAt: newExpiresAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Resend invitation error:', error);
    return NextResponse.json(
      { error: 'Failed to resend invitation' },
      { status: 500 }
    );
  }
}
