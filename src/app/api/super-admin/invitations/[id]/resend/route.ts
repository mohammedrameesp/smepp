import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { randomBytes } from 'crypto';
import { sendEmail } from '@/lib/core/email';

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

    // Send invitation email
    const emailResult = await sendEmail({
      to: invitation.email,
      subject: `You're invited to join ${invitation.organization.name} on SME++`,
      html: `
        <h2>You've been invited!</h2>
        <p>You've been invited to join <strong>${invitation.organization.name}</strong> on SME++.</p>
        <p><a href="${inviteUrl}" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px;">Accept Invitation</a></p>
        <p>Or copy this link: ${inviteUrl}</p>
        <p>This invitation expires in 7 days.</p>
      `,
      text: `You've been invited to join ${invitation.organization.name} on SME++. Accept here: ${inviteUrl}`,
    });

    return NextResponse.json({
      success: true,
      emailSent: emailResult.success,
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
