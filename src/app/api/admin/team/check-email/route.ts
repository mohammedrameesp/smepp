import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';

/**
 * GET /api/admin/team/check-email?email=user@example.com
 *
 * Check if an email is available for adding a new team member
 * Checks both TeamMember (org-specific) and pending invitations
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can check
    if (session.user.orgRole !== 'OWNER' && session.user.orgRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json(
        { error: 'Email parameter is required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({
        available: false,
        valid: false,
        reason: 'invalid_format',
        message: 'Please enter a valid email address',
      });
    }

    const normalizedEmail = email.toLowerCase();

    // Check if email already exists in this organization's TeamMembers
    const existingMember = await prisma.teamMember.findFirst({
      where: {
        tenantId: session.user.organizationId,
        email: normalizedEmail,
        isDeleted: false,
      },
      select: { id: true, name: true },
    });

    if (existingMember) {
      return NextResponse.json({
        available: false,
        valid: true,
        reason: 'already_member',
        message: `${existingMember.name || 'This person'} is already a member of this organization`,
      });
    }

    // Check if there's a pending invitation for this email
    const pendingInvite = await prisma.organizationInvitation.findFirst({
      where: {
        organizationId: session.user.organizationId,
        email: normalizedEmail,
        acceptedAt: null,
      },
      select: { id: true, expiresAt: true },
    });

    if (pendingInvite) {
      const isExpired = new Date(pendingInvite.expiresAt) < new Date();
      return NextResponse.json({
        available: false,
        valid: true,
        reason: 'pending_invitation',
        message: isExpired
          ? 'An expired invitation exists for this email. You can still add them.'
          : 'A pending invitation already exists for this email',
        canProceed: isExpired, // Allow proceeding if invitation is expired
      });
    }

    return NextResponse.json({
      email: normalizedEmail,
      available: true,
      valid: true,
    });
  } catch (error) {
    console.error('Check email error:', error);
    return NextResponse.json(
      { error: 'Failed to check email' },
      { status: 500 }
    );
  }
}

// Force dynamic rendering - no caching
export const dynamic = 'force-dynamic';
