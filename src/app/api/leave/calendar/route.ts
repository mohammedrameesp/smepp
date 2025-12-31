/**
 * @file route.ts
 * @description Team leave calendar API - returns leave requests as calendar events
 * @module hr/leave
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import { teamCalendarQuerySchema } from '@/lib/validations/leave';
import { withErrorHandler, APIContext } from '@/lib/http/handler';

async function getCalendarHandler(request: NextRequest, context: APIContext) {
    const { tenant } = context;
    const tenantId = tenant!.tenantId;

    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());

    const validation = teamCalendarQuerySchema.safeParse(queryParams);
    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid query parameters',
        details: validation.error.issues,
      }, { status: 400 });
    }

    const { startDate, endDate, status, leaveTypeId } = validation.data;

    // Build where clause with tenant filter
    const where: Record<string, unknown> = {
      tenantId,
      OR: [
        {
          // Request starts within date range
          startDate: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
        },
        {
          // Request ends within date range
          endDate: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
        },
        {
          // Request spans the entire date range
          AND: [
            { startDate: { lte: new Date(startDate) } },
            { endDate: { gte: new Date(endDate) } },
          ],
        },
      ],
    };

    // Filter by status - default to approved and pending
    if (status) {
      where.status = status;
    } else {
      where.status = { in: ['APPROVED', 'PENDING'] };
    }

    if (leaveTypeId) {
      where.leaveTypeId = leaveTypeId;
    }

    const leaveRequests = await prisma.leaveRequest.findMany({
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
          },
        },
      },
      orderBy: { startDate: 'asc' },
    });

    // Transform to calendar events format
    const events = leaveRequests.map((request) => ({
      id: request.id,
      title: `${request.user.name} - ${request.leaveType.name}`,
      start: request.startDate.toISOString(),
      end: request.endDate.toISOString(),
      allDay: true,
      backgroundColor: request.leaveType.color,
      borderColor: request.leaveType.color,
      extendedProps: {
        requestNumber: request.requestNumber,
        userId: request.userId,
        userName: request.user.name,
        userEmail: request.user.email,
        leaveTypeId: request.leaveTypeId,
        leaveTypeName: request.leaveType.name,
        status: request.status,
        totalDays: Number(request.totalDays),
        requestType: request.requestType,
        reason: request.reason,
      },
    }));

    return NextResponse.json({ events });
}

export const GET = withErrorHandler(getCalendarHandler, { requireAuth: true, requireModule: 'leave' });
