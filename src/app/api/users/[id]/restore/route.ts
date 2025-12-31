/**
 * @file route.ts
 * @description Restore soft-deleted user endpoint
 * @module system/users
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/core/prisma';
import { logAction, ActivityActions } from '@/lib/activity';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication and authorization
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Require organization context for tenant isolation
    if (!session.user.organizationId) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 403 });
    }

    const tenantId = session.user.organizationId;
    const { id } = await params;

    // Verify target user belongs to the same organization
    const membership = await prisma.organizationUser.findUnique({
      where: {
        organizationId_userId: {
          organizationId: tenantId,
          userId: id,
        },
      },
    });

    if (!membership) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get user details
    const user = await prisma.user.findUnique({
      where: { id },
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
    await prisma.user.update({
      where: { id },
      data: {
        isDeleted: false,
        deletedAt: null,
        scheduledDeletionAt: null,
        deletedByUserId: null,
        canLogin: true, // Re-enable login
      },
    });

    // Clear termination date on HR profile (resumes calculations from original dateOfJoining - NO gap)
    await prisma.hRProfile.updateMany({
      where: { userId: id },
      data: {
        terminationDate: null,
        terminationReason: null,
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
