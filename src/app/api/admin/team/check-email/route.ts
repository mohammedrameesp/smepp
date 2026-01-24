import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import { VALIDATION_PATTERNS } from '@/lib/validations/patterns';
import { withErrorHandler } from '@/lib/http/handler';
import { badRequestResponse } from '@/lib/http/errors';

/**
 * GET /api/admin/team/check-email?email=user@example.com
 *
 * Check if an email is available for adding a new team member
 * Checks both TeamMember (org-specific) and pending invitations
 */
export const GET = withErrorHandler(async (request: NextRequest, { tenant }) => {
  const tenantId = tenant!.tenantId;

  const searchParams = request.nextUrl.searchParams;
  const email = searchParams.get('email');

  if (!email) {
    return badRequestResponse('Email parameter is required');
  }

  // Validate email format
  if (!VALIDATION_PATTERNS.email.test(email)) {
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
      tenantId,
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
      organizationId: tenantId,
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
}, { requireAuth: true, requireAdmin: true });

// Force dynamic rendering - no caching
export const dynamic = 'force-dynamic';
