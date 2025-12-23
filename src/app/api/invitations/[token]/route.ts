import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/invitations/[token] - Get invitation details
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const invitation = await prisma.organizationInvitation.findUnique({
      where: { token },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
          },
        },
      },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      );
    }

    if (invitation.acceptedAt) {
      return NextResponse.json(
        { error: 'This invitation has already been used' },
        { status: 410 }
      );
    }

    if (invitation.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Invitation has expired' },
        { status: 410 }
      );
    }

    return NextResponse.json({
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        organization: invitation.organization,
        expiresAt: invitation.expiresAt,
      },
    });
  } catch (error) {
    console.error('Get invitation error:', error);
    return NextResponse.json(
      { error: 'Failed to get invitation' },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/invitations/[token] - Accept invitation
// ═══════════════════════════════════════════════════════════════════════════════

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { token } = await params;

    const invitation = await prisma.organizationInvitation.findUnique({
      where: { token },
      include: {
        organization: true,
      },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      );
    }

    if (invitation.acceptedAt) {
      return NextResponse.json(
        { error: 'This invitation has already been used' },
        { status: 410 }
      );
    }

    if (invitation.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Invitation has expired' },
        { status: 410 }
      );
    }

    // Check if user email matches invitation
    if (invitation.email.toLowerCase() !== session.user.email?.toLowerCase()) {
      return NextResponse.json(
        { error: 'This invitation was sent to a different email address' },
        { status: 403 }
      );
    }

    // Check if user is already a member
    const existingMembership = await prisma.organizationUser.findUnique({
      where: {
        organizationId_userId: {
          organizationId: invitation.organizationId,
          userId: session.user.id,
        },
      },
    });

    if (existingMembership) {
      // Delete the invitation since user is already a member
      await prisma.organizationInvitation.delete({
        where: { id: invitation.id },
      });

      return NextResponse.json({
        success: true,
        message: 'You are already a member of this organization',
        organization: {
          id: invitation.organization.id,
          name: invitation.organization.name,
          slug: invitation.organization.slug,
        },
      });
    }

    // Accept invitation: create membership and delete invitation
    // If role is OWNER, set isOwner=true (first admin of org)
    const isOwner = invitation.role === 'OWNER';

    await prisma.$transaction(async (tx) => {
      await tx.organizationUser.create({
        data: {
          organizationId: invitation.organizationId,
          userId: session.user.id,
          role: invitation.role,
          isOwner,
        },
      });

      await tx.organizationInvitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date() },
      });
    });

    return NextResponse.json({
      success: true,
      message: 'Successfully joined organization',
      organization: {
        id: invitation.organization.id,
        name: invitation.organization.name,
        slug: invitation.organization.slug,
      },
    });
  } catch (error) {
    console.error('Accept invitation error:', error);
    return NextResponse.json(
      { error: 'Failed to accept invitation' },
      { status: 500 }
    );
  }
}
