/**
 * @module api/organizations/[id]/members/[memberId]
 * @description Manages individual organization member operations including removal.
 *
 * Implements soft-delete with 7-day recovery period for member removal.
 * Enforces role hierarchy: owners can remove anyone, admins can only remove non-admins.
 *
 * @authentication Required - Session-based
 * @authorization Admin or Owner only
 *
 * @example
 * DELETE /api/organizations/abc123/members/member456
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import logger from '@/lib/core/log';

// ═══════════════════════════════════════════════════════════════════════════════
// DELETE /api/organizations/[id]/members/[memberId] - Remove member from org
// ═══════════════════════════════════════════════════════════════════════════════

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id: organizationId, memberId } = await params;

    // Verify current user is an admin or owner
    const currentMembership = await prisma.teamMember.findFirst({
      where: {
        tenantId: organizationId,
        id: session.user.id,
        isDeleted: false,
      },
    });

    if (!currentMembership) {
      return NextResponse.json({ error: 'Not a member of this organization' }, { status: 403 });
    }

    if (!currentMembership.isOwner && !currentMembership.isAdmin) {
      return NextResponse.json({ error: 'Only admins can remove members' }, { status: 403 });
    }

    // Get the member to be removed
    const targetMember = await prisma.teamMember.findFirst({
      where: {
        id: memberId,
        tenantId: organizationId,
        isDeleted: false,
      },
    });

    if (!targetMember) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Cannot remove the owner
    if (targetMember.isOwner) {
      return NextResponse.json({ error: 'Cannot remove the organization owner' }, { status: 400 });
    }

    // Cannot remove yourself (use leave organization instead)
    if (targetMember.id === session.user.id) {
      return NextResponse.json({ error: 'Cannot remove yourself. Use leave organization instead.' }, { status: 400 });
    }

    // Non-owners can only remove members with lower roles
    // With isAdmin boolean: admins can remove non-admins, but not other admins
    if (!currentMembership.isOwner) {
      // If target is an admin and current user is also admin (but not owner), deny
      if (targetMember.isAdmin) {
        return NextResponse.json(
          { error: 'Cannot remove members with equal or higher role' },
          { status: 403 }
        );
      }
    }

    // Soft-delete the member (7-day recovery period)
    const now = new Date();
    await prisma.teamMember.update({
      where: { id: memberId },
      data: {
        isDeleted: true,
        deletedAt: now,
        scheduledDeletionAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        canLogin: false,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Member removed from organization',
    });
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Remove member error');
    return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 });
  }
}

/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * CODE REVIEW SUMMARY
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * STRENGTHS:
 * - Comprehensive role hierarchy enforcement
 * - Soft-delete with 7-day recovery window (good for accidental removals)
 * - Cannot remove owner or self (prevents lockout)
 * - Disables login immediately upon removal
 * - Clear error messages for different failure scenarios
 *
 * CONCERNS:
 * - Uses raw getServerSession instead of withErrorHandler pattern
 * - No notification sent to removed member
 * - No audit log of who removed whom
 * - Missing GET/PATCH methods for member details/updates
 *
 * RECOMMENDATIONS:
 * - Migrate to withErrorHandler for consistency
 * - Add audit logging for member removal
 * - Consider sending email notification to removed member
 * - Add endpoint for member recovery within 7-day window
 * - Add PATCH method for updating member roles
 *
 * SECURITY NOTES:
 * - Proper tenant isolation via membership check
 * - Role hierarchy prevents privilege escalation
 * - canLogin = false ensures immediate access revocation
 */
