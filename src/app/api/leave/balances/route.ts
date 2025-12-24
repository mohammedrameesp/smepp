import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/core/prisma';
import { leaveBalanceQuerySchema, initializeLeaveBalanceSchema } from '@/lib/validations/leave';
import { logAction, ActivityActions } from '@/lib/activity';
import { getCurrentYear } from '@/lib/leave-utils';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Require organization context for tenant isolation
    if (!session.user.organizationId) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 403 });
    }

    const tenantId = session.user.organizationId;

    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());

    const validation = leaveBalanceQuerySchema.safeParse(queryParams);
    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid query parameters',
        details: validation.error.issues,
      }, { status: 400 });
    }

    const { userId, leaveTypeId, year, p, ps } = validation.data;

    // Non-admin users can only see their own balances
    const isAdmin = session.user.role === Role.ADMIN;
    const effectiveUserId = isAdmin ? userId : session.user.id;

    // Build where clause with tenant filter
    const where: Record<string, unknown> = { tenantId };

    if (effectiveUserId) {
      where.userId = effectiveUserId;
    }
    if (leaveTypeId) {
      where.leaveTypeId = leaveTypeId;
    }
    if (year) {
      where.year = year;
    } else {
      // Default to current year
      where.year = getCurrentYear();
    }

    const skip = (p - 1) * ps;

    const [balances, total] = await Promise.all([
      prisma.leaveBalance.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          leaveType: {
            select: {
              id: true,
              name: true,
              color: true,
              isPaid: true,
              accrualBased: true,
            },
          },
        },
        orderBy: [
          { user: { name: 'asc' } },
          { leaveType: { name: 'asc' } },
        ],
        take: ps,
        skip,
      }),
      prisma.leaveBalance.count({ where }),
    ]);

    return NextResponse.json({
      balances,
      pagination: {
        page: p,
        pageSize: ps,
        total,
        totalPages: Math.ceil(total / ps),
        hasMore: skip + ps < total,
      },
    });
  } catch (error) {
    console.error('Leave balances GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leave balances' },
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

    if (!session.user.organizationId) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 403 });
    }

    const body = await request.json();
    const validation = initializeLeaveBalanceSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid request body',
        details: validation.error.issues,
      }, { status: 400 });
    }

    const { userId, leaveTypeId, year, entitlement, carriedForward } = validation.data;
    const tenantId = session.user.organizationId;

    // Check if user exists and belongs to this tenant
    const userMembership = await prisma.organizationUser.findUnique({
      where: {
        organizationId_userId: {
          organizationId: tenantId,
          userId,
        },
      },
    });

    if (!userMembership) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if leave type exists and belongs to this tenant
    const leaveType = await prisma.leaveType.findFirst({
      where: { id: leaveTypeId, tenantId },
    });

    if (!leaveType) {
      return NextResponse.json({ error: 'Leave type not found' }, { status: 404 });
    }

    // Check if balance already exists for this user/type/year
    const existing = await prisma.leaveBalance.findUnique({
      where: {
        userId_leaveTypeId_year: {
          userId,
          leaveTypeId,
          year,
        },
      },
    });

    if (existing) {
      return NextResponse.json({
        error: 'Balance already exists for this user, leave type, and year',
      }, { status: 400 });
    }

    const balance = await prisma.leaveBalance.create({
      data: {
        userId,
        leaveTypeId,
        year,
        entitlement: entitlement ?? leaveType.defaultDays,
        carriedForward: carriedForward ?? 0,
        tenantId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        leaveType: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
      },
    });

    await logAction(
      session.user.id,
      ActivityActions.LEAVE_BALANCE_CREATED,
      'LeaveBalance',
      balance.id,
      { userId, leaveTypeId, year, entitlement: balance.entitlement }
    );

    return NextResponse.json(balance, { status: 201 });
  } catch (error) {
    console.error('Leave balances POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create leave balance' },
      { status: 500 }
    );
  }
}
