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
            slug: true,
            logoUrl: true,
            // Auth config for SSO on signup
            customGoogleClientId: true,
            customGoogleClientSecret: true,
            customAzureClientId: true,
            customAzureClientSecret: true,
            allowedAuthMethods: true,
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

    // Check if OAuth is properly configured (both client ID and secret exist)
    const hasCustomGoogleOAuth = !!(
      invitation.organization.customGoogleClientId &&
      invitation.organization.customGoogleClientSecret
    );
    const hasCustomAzureOAuth = !!(
      invitation.organization.customAzureClientId &&
      invitation.organization.customAzureClientSecret
    );

    // Check if auth methods are allowed (empty array = all allowed)
    const allowedMethods = invitation.organization.allowedAuthMethods || [];
    const isGoogleAllowed = allowedMethods.length === 0 || allowedMethods.includes('google');
    const isAzureAllowed = allowedMethods.length === 0 || allowedMethods.includes('azure-ad');

    return NextResponse.json({
      invitation: {
        id: invitation.id,
        email: invitation.email,
        name: invitation.name,
        role: invitation.role,
        organization: {
          id: invitation.organization.id,
          name: invitation.organization.name,
          slug: invitation.organization.slug,
          logoUrl: invitation.organization.logoUrl,
        },
        expiresAt: invitation.expiresAt,
        // Auth config for signup page (don't expose secrets)
        authConfig: {
          hasCustomGoogleOAuth: hasCustomGoogleOAuth && isGoogleAllowed,
          hasCustomAzureOAuth: hasCustomAzureOAuth && isAzureAllowed,
        },
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

    // Use a transaction with all validation and creation inside to prevent race conditions
    // This ensures atomic check-and-create behavior
    const result = await prisma.$transaction(async (tx) => {
      // Find and lock the invitation row to prevent concurrent acceptance
      const invitation = await tx.organizationInvitation.findUnique({
        where: { token },
        include: {
          organization: true,
        },
      });

      if (!invitation) {
        return { error: 'Invitation not found', status: 404 };
      }

      if (invitation.acceptedAt) {
        return { error: 'This invitation has already been used', status: 410 };
      }

      if (invitation.expiresAt < new Date()) {
        return { error: 'Invitation has expired', status: 410 };
      }

      // Check if user email matches invitation
      if (invitation.email.toLowerCase() !== session.user.email?.toLowerCase()) {
        return { error: 'This invitation was sent to a different email address', status: 403 };
      }

      // Verify user still exists in database
      const userExists = await tx.user.findUnique({
        where: { id: session.user.id },
        select: { id: true },
      });

      if (!userExists) {
        return { error: 'Your session is invalid. Please sign out and sign in again.', status: 401 };
      }

      // Check if user is already a member
      const existingMembership = await tx.organizationUser.findUnique({
        where: {
          organizationId_userId: {
            organizationId: invitation.organizationId,
            userId: session.user.id,
          },
        },
      });

      if (existingMembership) {
        // Mark invitation as accepted since user is already a member
        await tx.organizationInvitation.update({
          where: { id: invitation.id },
          data: { acceptedAt: new Date() },
        });

        return {
          success: true,
          alreadyMember: true,
          message: 'You are already a member of this organization',
          organization: {
            id: invitation.organization.id,
            name: invitation.organization.name,
            slug: invitation.organization.slug,
          },
        };
      }

      // Accept invitation: create membership and mark as accepted
      const isOwner = invitation.role === 'OWNER';

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

      return {
        success: true,
        message: 'Successfully joined organization',
        organization: {
          id: invitation.organization.id,
          name: invitation.organization.name,
          slug: invitation.organization.slug,
        },
      };
    }, {
      // Use serializable isolation level to prevent race conditions
      isolationLevel: 'Serializable',
    });

    // Handle error responses from transaction
    if ('error' in result) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Accept invitation error:', error);

    // Handle unique constraint violations (concurrent acceptance)
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { error: 'This invitation has already been accepted' },
        { status: 410 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to accept invitation' },
      { status: 500 }
    );
  }
}
