/**
 * @file route.ts
 * @description Leave balance CRUD operations - list and initialize leave balances
 * @module hr/leave
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import { leaveBalanceQuerySchema, initializeLeaveBalanceSchema } from '@/lib/validations/leave';
import { logAction, ActivityActions } from '@/lib/activity';
import { getCurrentYear } from '@/lib/leave-utils';
import { withErrorHandler, APIContext } from '@/lib/http/handler';

async function getLeaveBalancesHandler(request: NextRequest, context: APIContext) {
    const { tenant } = context;
    const tenantId = tenant!.tenantId;

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
    const isAdmin = tenant!.userRole === 'ADMIN';
    const effectiveUserId = isAdmin ? userId : tenant!.userId;

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
}

export const GET = withErrorHandler(getLeaveBalancesHandler, { requireAuth: true, requireModule: 'leave' });

async function createLeaveBalanceHandler(request: NextRequest, context: APIContext) {
    const { tenant } = context;
    const tenantId = tenant!.tenantId;
    const currentUserId = tenant!.userId;

    const body = await request.json();
    const validation = initializeLeaveBalanceSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid request body',
        details: validation.error.issues,
      }, { status: 400 });
    }

    const { userId, leaveTypeId, year, entitlement, carriedForward } = validation.data;

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
        tenantId_userId_leaveTypeId_year: {
          tenantId,
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
      tenantId,
      currentUserId,
      ActivityActions.LEAVE_BALANCE_CREATED,
      'LeaveBalance',
      balance.id,
      { userId, leaveTypeId, year, entitlement: balance.entitlement }
    );

    return NextResponse.json(balance, { status: 201 });
}

export const POST = withErrorHandler(createLeaveBalanceHandler, { requireAdmin: true, requireModule: 'leave' });
