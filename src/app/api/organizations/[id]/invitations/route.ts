import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import logger from '@/lib/core/log';
import { z } from 'zod';
import crypto from 'crypto';
import { sendEmail } from '@/lib/core/email';

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

const inviteSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['ADMIN', 'MANAGER', 'MEMBER']).default('MEMBER'),
  isEmployee: z.boolean(), // Required - admin must specify if user is employee or system account
  isOnWps: z.boolean().optional(), // Only relevant if isEmployee = true
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/organizations/[id]/invitations - List pending invitations
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id: organizationId } = await params;

    // Check if user is admin/owner of the organization
    const membership = await prisma.teamMember.findFirst({
      where: {
        tenantId: organizationId,
        id: session.user.id,
        isDeleted: false,
      },
    });

    if (!membership || (!membership.isOwner && !membership.isAdmin)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const invitations = await prisma.organizationInvitation.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ invitations });
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Get invitations error');
    return NextResponse.json(
      { error: 'Failed to get invitations' },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/organizations/[id]/invitations - Send invitation
// ═══════════════════════════════════════════════════════════════════════════════

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id: organizationId } = await params;

    // Check if user is admin/owner of the organization
    const membership = await prisma.teamMember.findFirst({
      where: {
        tenantId: organizationId,
        id: session.user.id,
        isDeleted: false,
      },
      include: {
        tenant: true,
      },
    });

    if (!membership || (!membership.isOwner && !membership.isAdmin)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const result = inviteSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { email, role, isEmployee, isOnWps } = result.data;
    const normalizedEmail = email.toLowerCase().trim();

    // Check if user is already a member
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      const existingMembership = await prisma.teamMember.findFirst({
        where: {
          tenantId: organizationId,
          id: existingUser.id,
          isDeleted: false,
        },
      });

      if (existingMembership) {
        return NextResponse.json(
          { error: 'User is already a member of this organization' },
          { status: 409 }
        );
      }
    }

    // Check if there's already a pending invitation
    const existingInvitation = await prisma.organizationInvitation.findFirst({
      where: {
        organizationId,
        email: normalizedEmail,
        expiresAt: { gt: new Date() },
      },
    });

    if (existingInvitation) {
      return NextResponse.json(
        { error: 'An invitation has already been sent to this email' },
        { status: 409 }
      );
    }

    // Check organization user limit
    const currentMemberCount = await prisma.teamMember.count({
      where: { tenantId: organizationId, isDeleted: false },
    });

    if (currentMemberCount >= membership.tenant.maxUsers) {
      return NextResponse.json(
        { error: 'Organization has reached maximum user limit. Upgrade to add more users.' },
        { status: 403 }
      );
    }

    // Create invitation
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    const invitation = await prisma.organizationInvitation.create({
      data: {
        organizationId,
        email: normalizedEmail,
        role,
        token,
        expiresAt,
        invitedById: session.user.id,
        isEmployee, // Admin must specify
        isOnWps: isEmployee ? (isOnWps ?? false) : false, // Only relevant if isEmployee
      },
    });

    // Build organization-specific invite URL using subdomain
    const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN || 'localhost:3000';
    const protocol = appDomain.includes('localhost') ? 'http' : 'https';
    const inviteUrl = `${protocol}://${membership.tenant.slug}.${appDomain}/invite/${token}`;

    // Send invitation email
    const brandColor = membership.tenant.primaryColor || '#0f172a';
    const emailResult = await sendEmail({
      to: normalizedEmail,
      subject: `You're invited to join ${membership.tenant.name} on Durj`,
      html: `
        <h2>You've been invited!</h2>
        <p>You've been invited to join <strong>${membership.tenant.name}</strong> on Durj.</p>
        <p><a href="${inviteUrl}" style="display: inline-block; padding: 12px 24px; background-color: ${brandColor}; color: white; text-decoration: none; border-radius: 6px;">Accept Invitation</a></p>
        <p>Or copy this link: ${inviteUrl}</p>
        <p>This invitation expires in 7 days.</p>
      `,
      text: `You've been invited to join ${membership.tenant.name} on Durj. Accept here: ${inviteUrl}`,
    });

    return NextResponse.json(
      {
        success: true,
        emailSent: emailResult.success,
        invitation: {
          id: invitation.id,
          email: invitation.email,
          role: invitation.role,
          expiresAt: invitation.expiresAt,
          inviteUrl,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Send invitation error');
    return NextResponse.json(
      { error: 'Failed to send invitation' },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// DELETE /api/organizations/[id]/invitations - Cancel invitation
// ═══════════════════════════════════════════════════════════════════════════════

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id: organizationId } = await params;

    // Check if user is admin/owner of the organization
    const membership = await prisma.teamMember.findFirst({
      where: {
        tenantId: organizationId,
        id: session.user.id,
        isDeleted: false,
      },
    });

    if (!membership || (!membership.isOwner && !membership.isAdmin)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const invitationId = searchParams.get('invitationId');

    if (!invitationId) {
      return NextResponse.json(
        { error: 'Invitation ID is required' },
        { status: 400 }
      );
    }

    // Verify invitation belongs to this organization
    const invitation = await prisma.organizationInvitation.findFirst({
      where: {
        id: invitationId,
        organizationId,
      },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      );
    }

    await prisma.organizationInvitation.delete({
      where: { id: invitationId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Cancel invitation error');
    return NextResponse.json(
      { error: 'Failed to cancel invitation' },
      { status: 500 }
    );
  }
}
