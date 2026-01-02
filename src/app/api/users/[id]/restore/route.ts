/**
 * @file route.ts
 * @description Restore soft-deleted user endpoint
 * @module system/users
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { logAction, ActivityActions } from '@/lib/activity';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication and authorization
    const session = await getServerSession(authOptions);
    if (!session || session.user.teamMemberRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Require organization context for tenant isolation
    if (!session.user.organizationId) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 403 });
    }

    const tenantId = session.user.organizationId;
    const { id } = await params;

    // Verify target user belongs to the same organization
    const membership = await prisma.teamMember.findFirst({
      where: {
        tenantId,
        id,
        isDeleted: false,
      },
      select: {
        id: true,
        email: true,
      },
    });

    if (!membership) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get user details - SECURITY: Use email from validated TeamMember for tenant isolation
    const user = await prisma.user.findFirst({
      where: {
        email: membership.email.toLowerCase(),
      },
      select: {
        id: true,
        name: true,
        email: true,
        isDeleted: true,
        deletedAt: true,
        scheduledDeletionAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user is actually soft-deleted
    if (!user.isDeleted) {
      return NextResponse.json(
        { error: 'User is not deleted and does not need to be restored' },
        { status: 400 }
      );
    }

    // Restore user - clear all soft-delete fields
    // SECURITY: Use user.id from validated lookup, not raw param
    await prisma.user.update({
      where: { id: user.id },
      data: {
        isDeleted: false,
        deletedAt: null,
        scheduledDeletionAt: null,
        deletedByUserId: null,
        // Note: canLogin is now on TeamMember, not User
      },
    });

    // Clear termination date on TeamMember and re-enable login
    // (resumes calculations from original dateOfJoining - NO gap)
    await prisma.teamMember.updateMany({
      where: { email: user.email.toLowerCase(), tenantId },
      data: {
        isDeleted: false,
        deletedAt: null,
        status: 'ACTIVE',
        canLogin: true, // Re-enable login
        // Note: terminationDate/terminationReason are now handled via status field
      },
    });

    // Log activity
    await logAction(
      tenantId,
      session.user.id,
      ActivityActions.USER_UPDATED,
      'User',
      user.id,
      {
        userName: user.name,
        userEmail: user.email,
        action: 'restored',
        restoredFrom: {
          deletedAt: user.deletedAt?.toISOString(),
          scheduledDeletionAt: user.scheduledDeletionAt?.toISOString(),
        },
      }
    );

    return NextResponse.json({
      message: 'Employee restored successfully',
      details: 'The employee has been reactivated. All calculations (gratuity, service days) will continue from their original joining date with no gap.',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });

  } catch (error) {
    console.error('User RESTORE error:', error);
    return NextResponse.json(
      { error: 'Failed to restore user' },
      { status: 500 }
    );
  }
}
