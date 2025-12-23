import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { randomBytes } from 'crypto';
import { z } from 'zod';

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/super-admin/organizations/[id]/invitations - Get org's invitations
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    const invitations = await prisma.organizationInvitation.findMany({
      where: {
        organizationId: id,
        acceptedAt: null, // Only pending
      },
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();
    const invitationsWithStatus = invitations.map((inv) => ({
      id: inv.id,
      email: inv.email,
      role: inv.role,
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

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/super-admin/organizations/[id]/invitations - Create new invitation
// ═══════════════════════════════════════════════════════════════════════════════

const createInviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['OWNER', 'ADMIN', 'MANAGER', 'MEMBER']).default('MEMBER'),
});

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
    const body = await request.json();
    const result = createInviteSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { email, role } = result.data;

    // Check if org exists
    const org = await prisma.organization.findUnique({
      where: { id },
    });

    if (!org) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Check if user is already a member
    const existingMember = await prisma.organizationUser.findFirst({
      where: {
        organizationId: id,
        user: { email: email.toLowerCase() },
      },
    });

    if (existingMember) {
      return NextResponse.json(
        { error: 'User is already a member of this organization' },
        { status: 409 }
      );
    }

    // Check for existing pending invitation
    const existingInvite = await prisma.organizationInvitation.findFirst({
      where: {
        organizationId: id,
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
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const invitation = await prisma.organizationInvitation.create({
      data: {
        organizationId: id,
        email: email.toLowerCase(),
        role,
        token,
        expiresAt,
        invitedById: session.user.id,
      },
    });

    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invite/${token}`;

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
