import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { logAction, ActivityActions } from '@/lib/activity';

/**
 * POST /api/admin/cleanup-leave-balances
 *
 * Cleans up incorrectly created leave balances:
 * - PARENTAL category balances where gender doesn't match
 * - PARENTAL/RELIGIOUS balances that were auto-created (unused)
 *
 * Query params:
 * - dryRun=true: Preview changes without deleting
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const dryRun = searchParams.get('dryRun') === 'true';

    // Get all PARENTAL and RELIGIOUS leave types
    const specialLeaveTypes = await prisma.leaveType.findMany({
      where: {
        category: { in: ['PARENTAL', 'RELIGIOUS'] },
      },
      select: {
        id: true,
        name: true,
        category: true,
        genderRestriction: true,
      },
    });

    if (specialLeaveTypes.length === 0) {
      return NextResponse.json({
        message: 'No special leave types found',
        deleted: 0,
        kept: 0,
        details: [],
      });
    }

    // Get all balances for these special leave types
    const balancesToCheck = await prisma.leaveBalance.findMany({
      where: {
        leaveTypeId: { in: specialLeaveTypes.map(lt => lt.id) },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            hrProfile: {
              select: { gender: true },
            },
          },
        },
        leaveType: {
          select: {
            id: true,
            name: true,
            category: true,
            genderRestriction: true,
          },
        },
      },
    });

    const balancesToDelete: string[] = [];
    const details: { user: string; leaveType: string; reason: string; action: string }[] = [];

    for (const balance of balancesToCheck) {
      const leaveType = balance.leaveType;
      const userGender = balance.user.hrProfile?.gender?.toUpperCase();

      let shouldDelete = false;
      let reason = '';

      // Check gender restriction
      if (leaveType.genderRestriction) {
        if (!userGender) {
          shouldDelete = true;
          reason = 'User has no gender set in HR profile';
        } else if (userGender !== leaveType.genderRestriction) {
          shouldDelete = true;
          reason = `Gender mismatch: ${leaveType.name} is for ${leaveType.genderRestriction}, user is ${userGender}`;
        }
      }

      // For unused balances, delete them (likely auto-created)
      const used = Number(balance.used);
      const pending = Number(balance.pending);

      if (!shouldDelete && used === 0 && pending === 0) {
        shouldDelete = true;
        reason = 'Unused balance (likely auto-created, not admin-assigned)';
      }

      if (shouldDelete) {
        balancesToDelete.push(balance.id);
        details.push({
          user: balance.user.name || balance.user.email,
          leaveType: leaveType.name,
          reason,
          action: 'DELETE',
        });
      } else {
        details.push({
          user: balance.user.name || balance.user.email,
          leaveType: leaveType.name,
          reason: `Has ${used} used, ${pending} pending days`,
          action: 'KEEP',
        });
      }
    }

    let deletedCount = 0;
    if (!dryRun && balancesToDelete.length > 0) {
      const result = await prisma.leaveBalance.deleteMany({
        where: {
          id: { in: balancesToDelete },
        },
      });
      deletedCount = result.count;

      // Log the cleanup action
      await logAction(
        session.user.id,
        ActivityActions.LEAVE_TYPE_UPDATED,
        'LeaveBalance',
        'cleanup',
        {
          action: 'cleanup_special_leave_balances',
          deletedCount,
          balanceIds: balancesToDelete,
        }
      );
    }

    return NextResponse.json({
      dryRun,
      message: dryRun
        ? `Found ${balancesToDelete.length} balances to delete. Run without dryRun to apply.`
        : `Deleted ${deletedCount} incorrect balances.`,
      deleted: dryRun ? balancesToDelete.length : deletedCount,
      kept: balancesToCheck.length - balancesToDelete.length,
      details,
    });
  } catch (error) {
    console.error('Cleanup leave balances error:', error);
    return NextResponse.json(
      { error: 'Failed to cleanup leave balances' },
      { status: 500 }
    );
  }
}
