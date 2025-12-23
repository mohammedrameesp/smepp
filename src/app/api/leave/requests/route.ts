import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/core/prisma';
import { createLeaveRequestSchema, leaveRequestQuerySchema } from '@/lib/validations/leave';
import { logAction, ActivityActions } from '@/lib/activity';
import { createBulkNotifications, createNotification, NotificationTemplates } from '@/lib/domains/system/notifications';
import { findApplicablePolicy, initializeApprovalChain } from '@/lib/domains/system/approvals';
import {
  calculateWorkingDays,
  meetsNoticeDaysRequirement,
  exceedsMaxConsecutiveDays,
  calculateAvailableBalance,
  meetsServiceRequirement,
  getServiceBasedEntitlement,
  formatServiceDuration,
  ServiceBasedEntitlement,
  getAnnualLeaveDetails,
} from '@/lib/leave-utils';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());

    const validation = leaveRequestQuerySchema.safeParse(queryParams);
    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid query parameters',
        details: validation.error.issues,
      }, { status: 400 });
    }

    const { q, status, userId, leaveTypeId, year, startDate, endDate, p, ps, sort, order } = validation.data;

    // Non-admin users can only see their own requests
    const isAdmin = session.user.role === Role.ADMIN;
    const effectiveUserId = isAdmin ? userId : session.user.id;

    // Build where clause
    const where: Record<string, unknown> = {};

    if (effectiveUserId) {
      where.userId = effectiveUserId;
    }
    if (status) {
      where.status = status;
    }
    if (leaveTypeId) {
      where.leaveTypeId = leaveTypeId;
    }
    if (year) {
      where.startDate = {
        gte: new Date(`${year}-01-01`),
        lt: new Date(`${year + 1}-01-01`),
      };
    }
    if (startDate) {
      where.startDate = {
        ...(where.startDate as object || {}),
        gte: new Date(startDate),
      };
    }
    if (endDate) {
      where.endDate = {
        lte: new Date(endDate),
      };
    }
    if (q) {
      where.OR = [
        { requestNumber: { contains: q, mode: 'insensitive' } },
        { user: { name: { contains: q, mode: 'insensitive' } } },
        { user: { email: { contains: q, mode: 'insensitive' } } },
        { reason: { contains: q, mode: 'insensitive' } },
      ];
    }

    const skip = (p - 1) * ps;

    const [requests, total] = await Promise.all([
      prisma.leaveRequest.findMany({
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
              accrualBased: true,
            },
          },
          approver: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { [sort]: order },
        take: ps,
        skip,
      }),
      prisma.leaveRequest.count({ where }),
    ]);

    return NextResponse.json({
      requests,
      pagination: {
        page: p,
        pageSize: ps,
        total,
        totalPages: Math.ceil(total / ps),
        hasMore: skip + ps < total,
      },
    });
  } catch (error) {
    console.error('Leave requests GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leave requests' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validation = createLeaveRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid request body',
        details: validation.error.issues,
      }, { status: 400 });
    }

    const data = validation.data;
    const userId = session.user.id;

    // Parse dates
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);

    // Validate leave type exists and is active
    const leaveType = await prisma.leaveType.findUnique({
      where: { id: data.leaveTypeId },
    });

    if (!leaveType) {
      return NextResponse.json({ error: 'Leave type not found' }, { status: 404 });
    }

    if (!leaveType.isActive) {
      return NextResponse.json({ error: 'This leave type is not active' }, { status: 400 });
    }

    // Get user's HR profile for service duration and gender checks
    const hrProfile = await prisma.hRProfile.findUnique({
      where: { userId },
      select: {
        dateOfJoining: true,
        hajjLeaveTaken: true,
        gender: true,
        bypassNoticeRequirement: true,
      },
    });

    // Check if this leave type requires admin assignment (PARENTAL or RELIGIOUS categories)
    if (leaveType.category === 'PARENTAL' || leaveType.category === 'RELIGIOUS') {
      // Check if user already has a balance for this leave type (admin-assigned)
      const existingBalance = await prisma.leaveBalance.findUnique({
        where: {
          userId_leaveTypeId_year: {
            userId,
            leaveTypeId: data.leaveTypeId,
            year: startDate.getFullYear(),
          },
        },
      });

      if (!existingBalance) {
        return NextResponse.json({
          error: `${leaveType.name} must be assigned by an administrator. Please contact HR to request this leave type.`,
        }, { status: 400 });
      }
    }

    // Validate gender restriction for parental leave
    if (leaveType.genderRestriction) {
      if (!hrProfile?.gender) {
        return NextResponse.json({
          error: 'Your gender is not recorded in your HR profile. Please contact HR to update your profile.',
        }, { status: 400 });
      }

      if (hrProfile.gender.toUpperCase() !== leaveType.genderRestriction) {
        return NextResponse.json({
          error: `${leaveType.name} is only available for ${leaveType.genderRestriction.toLowerCase()} employees.`,
        }, { status: 400 });
      }
    }

    // Check minimum service requirement (Qatar Labor Law)
    if (leaveType.minimumServiceMonths > 0) {
      if (!hrProfile?.dateOfJoining) {
        return NextResponse.json({
          error: 'Your date of joining is not recorded. Please contact HR to update your profile.',
        }, { status: 400 });
      }

      if (!meetsServiceRequirement(hrProfile.dateOfJoining, leaveType.minimumServiceMonths, startDate)) {
        const requiredMonths = leaveType.minimumServiceMonths;
        const requiredYears = Math.floor(requiredMonths / 12);
        const remainingMonths = requiredMonths % 12;

        let requirement = '';
        if (requiredYears > 0 && remainingMonths > 0) {
          requirement = `${requiredYears} year(s) and ${remainingMonths} month(s)`;
        } else if (requiredYears > 0) {
          requirement = `${requiredYears} year(s)`;
        } else {
          requirement = `${remainingMonths} month(s)`;
        }

        return NextResponse.json({
          error: `You must complete ${requirement} of service to be eligible for ${leaveType.name}. Your current service: ${formatServiceDuration(hrProfile.dateOfJoining)}`,
        }, { status: 400 });
      }
    }

    // Check if this is a "once in employment" leave type (e.g., Hajj leave)
    if (leaveType.isOnceInEmployment) {
      // Check if user has already taken this type of leave (using flag, not name)
      if (hrProfile?.hajjLeaveTaken) {
        return NextResponse.json({
          error: `${leaveType.name} can only be taken once during your employment. You have already used this leave.`,
        }, { status: 400 });
      }

      // Also check for any existing approved Hajj leave requests (as backup check)
      const existingOnceLeave = await prisma.leaveRequest.findFirst({
        where: {
          userId,
          leaveTypeId: leaveType.id,
          status: { in: ['PENDING', 'APPROVED'] },
        },
      });

      if (existingOnceLeave) {
        return NextResponse.json({
          error: `${leaveType.name} can only be taken once during your employment. You already have a ${existingOnceLeave.status.toLowerCase()} request.`,
        }, { status: 400 });
      }
    }

    // Calculate days - Accrual-based leave (Annual Leave) includes weekends, others exclude weekends
    const includeWeekends = leaveType.accrualBased === true;
    const isAdmin = session.user.role === Role.ADMIN;
    const totalDays = calculateWorkingDays(startDate, endDate, data.requestType, includeWeekends);

    if (totalDays === 0) {
      return NextResponse.json({
        error: 'No working days in the selected date range',
      }, { status: 400 });
    }

    // Check minimum notice days (skip if: admin override OR user has bypass flag set by admin)
    const skipNoticeCheck = (isAdmin && data.adminOverrideNotice === true) || hrProfile?.bypassNoticeRequirement === true;
    if (!skipNoticeCheck && !meetsNoticeDaysRequirement(startDate, leaveType.minNoticeDays)) {
      return NextResponse.json({
        error: `This leave type requires at least ${leaveType.minNoticeDays} days advance notice`,
      }, { status: 400 });
    }

    // Check max consecutive days
    if (exceedsMaxConsecutiveDays(totalDays, leaveType.maxConsecutiveDays)) {
      return NextResponse.json({
        error: `This leave type allows a maximum of ${leaveType.maxConsecutiveDays} consecutive days`,
      }, { status: 400 });
    }

    // Check for document requirement
    if (leaveType.requiresDocument && !data.documentUrl) {
      return NextResponse.json({
        error: 'This leave type requires a supporting document',
      }, { status: 400 });
    }

    // Check for overlapping requests (pre-check before transaction)
    const overlappingRequests = await prisma.leaveRequest.findMany({
      where: {
        userId,
        status: { in: ['PENDING', 'APPROVED'] },
        OR: [
          {
            AND: [
              { startDate: { lte: endDate } },
              { endDate: { gte: startDate } },
            ],
          },
        ],
      },
    });

    if (overlappingRequests.length > 0) {
      return NextResponse.json({
        error: 'You already have a pending or approved leave request that overlaps with these dates',
      }, { status: 400 });
    }

    const year = startDate.getFullYear();

    // Create leave request in a transaction (includes balance check to prevent race conditions)
    const leaveRequest = await prisma.$transaction(async (tx) => {
      // Get or create leave balance inside transaction to prevent race conditions
      let balance = await tx.leaveBalance.findUnique({
        where: {
          userId_leaveTypeId_year: {
            userId,
            leaveTypeId: data.leaveTypeId,
            year,
          },
        },
      });

      // If no balance exists, create one with appropriate entitlement
      if (!balance) {
        let entitlement = leaveType.defaultDays;

        // For accrual-based leave types (like Annual Leave), calculate accrued entitlement
        if (leaveType.accrualBased && hrProfile?.dateOfJoining) {
          const annualLeaveDetails = getAnnualLeaveDetails(hrProfile.dateOfJoining, year, startDate);
          entitlement = annualLeaveDetails.accrued;
        } else if (leaveType.serviceBasedEntitlement && hrProfile?.dateOfJoining) {
          // For non-accrual but service-based leave types
          const serviceEntitlement = getServiceBasedEntitlement(
            hrProfile.dateOfJoining,
            leaveType.serviceBasedEntitlement as ServiceBasedEntitlement,
            startDate
          );
          if (serviceEntitlement > 0) {
            entitlement = serviceEntitlement;
          }
        }

        balance = await tx.leaveBalance.create({
          data: {
            userId,
            leaveTypeId: data.leaveTypeId,
            year,
            entitlement,
          },
        });
      }

      // Check sufficient balance (for paid leave types) inside transaction
      if (leaveType.isPaid) {
        const available = calculateAvailableBalance(
          balance.entitlement,
          balance.used,
          balance.carriedForward,
          balance.adjustment
        );

        if (totalDays > available) {
          throw new Error(`INSUFFICIENT_BALANCE:${available}`);
        }
      }

      // Generate unique request number using timestamp + random to prevent duplicates
      const timestamp = Date.now().toString(36).toUpperCase();
      const random = Math.random().toString(36).substring(2, 5).toUpperCase();
      const requestNumber = `LR-${timestamp}-${random}`;

      // Create the request
      const request = await tx.leaveRequest.create({
        data: {
          requestNumber,
          userId,
          leaveTypeId: data.leaveTypeId,
          startDate,
          endDate,
          requestType: data.requestType,
          totalDays,
          reason: data.reason,
          documentUrl: data.documentUrl,
          emergencyContact: data.emergencyContact,
          emergencyPhone: data.emergencyPhone,
          status: 'PENDING',
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

      // Update balance pending days
      await tx.leaveBalance.update({
        where: {
          userId_leaveTypeId_year: {
            userId,
            leaveTypeId: data.leaveTypeId,
            year,
          },
        },
        data: {
          pending: {
            increment: totalDays,
          },
        },
      });

      // Create history entry
      await tx.leaveRequestHistory.create({
        data: {
          leaveRequestId: request.id,
          action: 'CREATED',
          newStatus: 'PENDING',
          performedById: userId,
        },
      });

      return request;
    });

    await logAction(
      userId,
      ActivityActions.LEAVE_REQUEST_CREATED,
      'LeaveRequest',
      leaveRequest.id,
      {
        requestNumber: leaveRequest.requestNumber,
        leaveType: leaveType.name,
        totalDays,
        startDate: data.startDate,
        endDate: data.endDate,
      }
    );

    // Check for multi-level approval policy
    try {
      const approvalPolicy = await findApplicablePolicy('LEAVE_REQUEST', { days: totalDays });

      if (approvalPolicy && approvalPolicy.levels.length > 0) {
        // Initialize approval chain
        const steps = await initializeApprovalChain('LEAVE_REQUEST', leaveRequest.id, approvalPolicy);

        // Notify users with the first level's required role
        const firstStep = steps[0];
        if (firstStep) {
          const approvers = await prisma.user.findMany({
            where: { role: firstStep.requiredRole },
            select: { id: true },
          });

          for (const approver of approvers) {
            await createNotification({
              recipientId: approver.id,
              type: 'APPROVAL_PENDING',
              title: 'Leave Request Approval Required',
              message: `${session.user.name || session.user.email || 'Employee'} submitted a ${leaveType.name} request (${leaveRequest.requestNumber}) for ${totalDays} day${totalDays === 1 ? '' : 's'}. Your approval is required.`,
              link: `/admin/leave/requests/${leaveRequest.id}`,
              entityType: 'LeaveRequest',
              entityId: leaveRequest.id,
            });
          }
        }
      } else {
        // No policy - fall back to notifying all admins
        const admins = await prisma.user.findMany({
          where: { role: Role.ADMIN },
          select: { id: true },
        });

        if (admins.length > 0) {
          const notifications = admins.map(admin =>
            NotificationTemplates.leaveSubmitted(
              admin.id,
              session.user.name || session.user.email || 'Employee',
              leaveRequest.requestNumber,
              leaveType.name,
              totalDays,
              leaveRequest.id
            )
          );
          await createBulkNotifications(notifications);
        }
      }
    } catch (notifyError) {
      console.error('Failed to send leave request notifications:', notifyError);
    }

    return NextResponse.json(leaveRequest, { status: 201 });
  } catch (error) {
    // Handle insufficient balance error thrown from transaction
    if (error instanceof Error && error.message.startsWith('INSUFFICIENT_BALANCE:')) {
      const available = error.message.split(':')[1];
      return NextResponse.json({
        error: `Insufficient leave balance. Available: ${available} days`,
      }, { status: 400 });
    }

    console.error('Leave requests POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create leave request' },
      { status: 500 }
    );
  }
}
