/**
 * @file route.ts
 * @description Leave balance CRUD operations - list and initialize leave balances
 * @module hr/leave
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import { leaveBalanceQuerySchema, initializeLeaveBalanceSchema } from '@/lib/validations/leave';
import { logAction, ActivityActions } from '@/lib/core/activity';
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

    const { memberId, leaveTypeId, year, p, ps } = validation.data;

    // Non-admin users can only see their own balances
    const isAdmin = tenant!.orgRole === 'OWNER' || tenant!.orgRole === 'ADMIN';

    // For non-admin users, we need to look up their TeamMember ID
    let effectiveMemberId = memberId;
    if (!isAdmin) {
      const currentMember = await prisma.teamMember.findFirst({
        where: { id: tenant!.userId, tenantId },
        select: { id: true },
      });
      effectiveMemberId = currentMember?.id;
    }

    // Build where clause with tenant filter
    const where: Record<string, unknown> = { tenantId };

    if (effectiveMemberId) {
      where.memberId = effectiveMemberId;
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
          member: {
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
          { member: { name: 'asc' } },
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

    const { memberId, leaveTypeId, year, entitlement, carriedForward } = validation.data;

    // Check if team member exists and belongs to this tenant
    const teamMember = await prisma.teamMember.findFirst({
      where: {
        id: memberId,
        tenantId,
      },
    });

    if (!teamMember) {
      return NextResponse.json({ error: 'Team member not found' }, { status: 404 });
    }

    // Check if leave type exists and belongs to this tenant
    const leaveType = await prisma.leaveType.findFirst({
      where: { id: leaveTypeId, tenantId },
    });

    if (!leaveType) {
      return NextResponse.json({ error: 'Leave type not found' }, { status: 404 });
    }

    // Check if balance already exists for this member/type/year
    const existing = await prisma.leaveBalance.findUnique({
      where: {
        tenantId_memberId_leaveTypeId_year: {
          tenantId,
          memberId,
          leaveTypeId,
          year,
        },
      },
    });

    if (existing) {
      return NextResponse.json({
        error: 'Balance already exists for this member, leave type, and year',
      }, { status: 400 });
    }

    const balance = await prisma.leaveBalance.create({
      data: {
        memberId,
        leaveTypeId,
        year,
        entitlement: entitlement ?? leaveType.defaultDays,
        carriedForward: carriedForward ?? 0,
        tenantId,
      },
      include: {
        member: {
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
      { memberId, leaveTypeId, year, entitlement: balance.entitlement }
    );

    return NextResponse.json(balance, { status: 201 });
}

export const POST = withErrorHandler(createLeaveBalanceHandler, { requireAdmin: true, requireModule: 'leave' });
