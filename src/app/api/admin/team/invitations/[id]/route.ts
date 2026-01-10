import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { randomBytes } from 'crypto';
import logger from '@/lib/core/log';

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/admin/team/invitations/[id] - Resend invitation (regenerate token)
// ═══════════════════════════════════════════════════════════════════════════════

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.orgRole !== 'OWNER' && session.user.orgRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { id } = await params;

    // Find invitation
    const invitation = await prisma.organizationInvitation.findUnique({
      where: { id },
    });

    if (!invitation || invitation.organizationId !== session.user.organizationId) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    if (invitation.acceptedAt) {
      return NextResponse.json(
        { error: 'This invitation has already been accepted' },
        { status: 400 }
      );
    }

    // Regenerate token and extend expiry
    const newToken = randomBytes(32).toString('hex');
    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Get org for subdomain-based URL
    const org = await prisma.organization.findUnique({
      where: { id: session.user.organizationId },
      select: { slug: true },
    });

    const updated = await prisma.organizationInvitation.update({
      where: { id },
      data: {
        token: newToken,
        expiresAt: newExpiresAt,
      },
    });

    // Build organization-specific invite URL using subdomain (same as create)
    const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN || 'localhost:3000';
    const protocol = appDomain.includes('localhost') ? 'http' : 'https';
    const inviteUrl = `${protocol}://${org?.slug}.${appDomain}/invite/${newToken}`;

    return NextResponse.json({
      success: true,
      invitation: {
        id: updated.id,
        email: updated.email,
        role: updated.role,
        inviteUrl,
        expiresAt: newExpiresAt.toISOString(),
      },
    });
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Failed to resend invitation');
    return NextResponse.json(
      { error: 'Failed to resend invitation' },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// DELETE /api/admin/team/invitations/[id] - Cancel invitation
// ═══════════════════════════════════════════════════════════════════════════════

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.orgRole !== 'OWNER' && session.user.orgRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { id } = await params;

    // Find invitation
    const invitation = await prisma.organizationInvitation.findUnique({
      where: { id },
    });

    if (!invitation || invitation.organizationId !== session.user.organizationId) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    if (invitation.acceptedAt) {
      return NextResponse.json(
        { error: 'Cannot cancel an accepted invitation' },
        { status: 400 }
      );
    }

    // Delete invitation
    await prisma.organizationInvitation.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Failed to cancel invitation');
    return NextResponse.json(
      { error: 'Failed to cancel invitation' },
      { status: 500 }
    );
  }
}
