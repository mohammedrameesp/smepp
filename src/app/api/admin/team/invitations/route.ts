import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { randomBytes } from 'crypto';
import { z } from 'zod';

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/admin/team/invitations - Get pending invitations
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins/owners can view invitations
    if (session.user.orgRole !== 'OWNER' && session.user.orgRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const invitations = await prisma.organizationInvitation.findMany({
      where: {
        organizationId: session.user.organizationId,
        acceptedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();
    return NextResponse.json({
      invitations: invitations.map((inv) => ({
        id: inv.id,
        email: inv.email,
        role: inv.role,
        expiresAt: inv.expiresAt,
        createdAt: inv.createdAt,
        isExpired: inv.expiresAt < now,
      })),
    });
  } catch (error) {
    console.error('Get invitations error:', error);
    return NextResponse.json(
      { error: 'Failed to get invitations' },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/admin/team/invitations - Create new invitation
// ═══════════════════════════════════════════════════════════════════════════════

const createInviteSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['ADMIN', 'MANAGER', 'MEMBER']).default('MEMBER'),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins/owners can invite
    if (session.user.orgRole !== 'OWNER' && session.user.orgRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const result = createInviteSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { email, role } = result.data;

    // Check org limits
    const org = await prisma.organization.findUnique({
      where: { id: session.user.organizationId },
      include: {
        _count: { select: { members: true } },
      },
    });

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Count pending invitations too
    const pendingCount = await prisma.organizationInvitation.count({
      where: {
        organizationId: session.user.organizationId,
        acceptedAt: null,
      },
    });

    if (org._count.members + pendingCount >= org.maxUsers) {
      return NextResponse.json(
        { error: `User limit reached (${org.maxUsers}). Upgrade your plan to add more users.` },
        { status: 403 }
      );
    }

    // Check if user is already a member
    const existingMember = await prisma.organizationUser.findFirst({
      where: {
        organizationId: session.user.organizationId,
        user: { email: email.toLowerCase() },
      },
    });

    if (existingMember) {
      return NextResponse.json(
        { error: 'This user is already a member of your organization' },
        { status: 409 }
      );
    }

    // Check for existing pending invitation
    const existingInvite = await prisma.organizationInvitation.findFirst({
      where: {
        organizationId: session.user.organizationId,
        email: email.toLowerCase(),
        acceptedAt: null,
      },
    });

    if (existingInvite) {
      return NextResponse.json(
        { error: 'An invitation for this email already exists' },
        { status: 409 }
      );
    }

    // Create invitation
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invitation = await prisma.organizationInvitation.create({
      data: {
        organizationId: session.user.organizationId,
        email: email.toLowerCase(),
        role,
        token,
        expiresAt,
        invitedById: session.user.id,
      },
    });

    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invite/${token}`;

    // TODO: Send invitation email (inviteUrl is returned to client for sharing)

    return NextResponse.json(
      {
        success: true,
        invitation: {
          id: invitation.id,
          email: invitation.email,
          role: invitation.role,
          inviteUrl,
          expiresAt: expiresAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create invitation error:', error);
    return NextResponse.json(
      { error: 'Failed to create invitation' },
      { status: 500 }
    );
  }
}
