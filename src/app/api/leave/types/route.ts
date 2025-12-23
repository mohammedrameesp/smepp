import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { createLeaveTypeSchema, leaveTypeQuerySchema } from '@/lib/validations/leave';
import { logAction, ActivityActions } from '@/lib/activity';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());

    const validation = leaveTypeQuerySchema.safeParse(queryParams);
    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid query parameters',
        details: validation.error.issues,
      }, { status: 400 });
    }

    const { isActive, includeInactive } = validation.data;
    const isAdmin = session.user.role === Role.ADMIN;

    // Build where clause
    const where: Record<string, unknown> = {};

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    } else if (includeInactive !== 'true') {
      // By default, only return active leave types
      where.isActive = true;
    }

    let leaveTypes = await prisma.leaveType.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    // For non-admin users, filter out PARENTAL and RELIGIOUS leave types
    // unless they have an assigned balance for them
    if (!isAdmin) {
      const userId = session.user.id;
      const currentYear = new Date().getFullYear();

      // Get user's assigned balances for special leave types
      const assignedSpecialBalances = await prisma.leaveBalance.findMany({
        where: {
          userId,
          year: currentYear,
          leaveType: {
            category: { in: ['PARENTAL', 'RELIGIOUS'] },
          },
        },
        select: { leaveTypeId: true },
      });

      const assignedSpecialLeaveTypeIds = new Set(assignedSpecialBalances.map(b => b.leaveTypeId));

      // Get user's gender from HR profile for additional filtering
      const hrProfile = await prisma.hRProfile.findUnique({
        where: { userId },
        select: { gender: true },
      });
      const userGender = hrProfile?.gender?.toUpperCase();

      // Filter leave types for employees
      leaveTypes = leaveTypes.filter(lt => {
        // Always show STANDARD and MEDICAL category leave types
        if (lt.category === 'STANDARD' || lt.category === 'MEDICAL') {
          return true;
        }

        // For PARENTAL and RELIGIOUS categories, only show if admin has assigned a balance
        if (lt.category === 'PARENTAL' || lt.category === 'RELIGIOUS') {
          // Must have an assigned balance
          if (!assignedSpecialLeaveTypeIds.has(lt.id)) {
            return false;
          }

          // Additionally check gender restriction matches
          if (lt.genderRestriction && userGender !== lt.genderRestriction) {
            return false;
          }

          return true;
        }

        return true;
      });
    }

    return NextResponse.json({ leaveTypes });
  } catch (error) {
    console.error('Leave types GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leave types' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validation = createLeaveTypeSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid request body',
        details: validation.error.issues,
      }, { status: 400 });
    }

    const data = validation.data;

    // Check if leave type with same name already exists
    const existing = await prisma.leaveType.findUnique({
      where: { name: data.name },
    });

    if (existing) {
      return NextResponse.json({
        error: 'A leave type with this name already exists',
      }, { status: 400 });
    }

    // Handle JSON fields properly - convert null to undefined for Prisma
    const createData = {
      ...data,
      serviceBasedEntitlement: data.serviceBasedEntitlement ?? undefined,
      payTiers: data.payTiers ?? undefined,
    };

    const leaveType = await prisma.leaveType.create({
      data: createData,
    });

    await logAction(
      session.user.id,
      ActivityActions.LEAVE_TYPE_CREATED,
      'LeaveType',
      leaveType.id,
      { name: leaveType.name }
    );

    return NextResponse.json(leaveType, { status: 201 });
  } catch (error) {
    console.error('Leave types POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create leave type' },
      { status: 500 }
    );
  }
}
