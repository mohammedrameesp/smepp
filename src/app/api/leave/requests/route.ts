/**
 * @file route.ts
 * @description Leave request CRUD operations - list and create leave requests
 * @module hr/leave
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import { TenantPrismaClient } from '@/lib/core/prisma-tenant';
import { createLeaveRequestSchema, leaveRequestQuerySchema } from '@/features/leave/validations/leave';
import { logAction, ActivityActions } from '@/lib/core/activity';
import { createBulkNotifications, createNotification, NotificationTemplates } from '@/features/notifications/lib';
import { findApplicablePolicy, initializeApprovalChain } from '@/features/approvals/lib';
import { notifyApproversViaWhatsApp } from '@/lib/whatsapp';
import {
  getServiceBasedEntitlement,
  ServiceBasedEntitlement,
  getAnnualLeaveDetails,
  calculateAvailableBalance,
} from '@/features/leave/lib/leave-utils';
import {
  validateLeaveTypeEligibility,
  validateOnceInEmploymentLeave,
  validateLeaveRequestDates,
  validateNoOverlap,
  validateDocumentRequirement,
} from '@/features/leave/lib/leave-request-validation';
import { getOrganizationCodePrefix } from '@/lib/utils/code-prefix';
import { withErrorHandler, APIContext } from '@/lib/http/handler';
import logger from '@/lib/core/log';

async function getLeaveRequestsHandler(request: NextRequest, context: APIContext) {
    const { tenant, prisma: tenantPrisma } = context;
    if (!tenant?.tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
    }
    const db = tenantPrisma as TenantPrismaClient;

    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());

    const validation = leaveRequestQuerySchema.safeParse(queryParams);
    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid query parameters',
        details: validation.error.issues,
      }, { status: 400 });
    }

    const { q, status, userId, memberId, leaveTypeId, year, startDate, endDate, p, ps, sort, order } = validation.data;

    // Non-admin users can only see their own requests
    // Note: orgRole contains ADMIN/MEMBER based on TeamMemberRole, NOT the approval role
    const isAdmin = tenant.orgRole === 'OWNER' || tenant.orgRole === 'ADMIN';
    // Support both memberId and legacy userId parameter
    const filterMemberId = memberId || userId;
    const effectiveMemberId = isAdmin ? filterMemberId : tenant.userId;

    // Build where clause (tenant filtering is automatic via db)
    const where: Record<string, unknown> = {};

    if (effectiveMemberId) {
      where.memberId = effectiveMemberId;
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
        { member: { name: { contains: q, mode: 'insensitive' } } },
        { member: { email: { contains: q, mode: 'insensitive' } } },
        { reason: { contains: q, mode: 'insensitive' } },
      ];
    }

    const skip = (p - 1) * ps;

    const [requests, total] = await Promise.all([
      db.leaveRequest.findMany({
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
      db.leaveRequest.count({ where }),
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
}

export const GET = withErrorHandler(getLeaveRequestsHandler, { requireAuth: true, requireModule: 'leave' });

async function createLeaveRequestHandler(request: NextRequest, context: APIContext) {
    const { tenant, prisma: tenantPrisma } = context;
    if (!tenant?.tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
    }
    const db = tenantPrisma as TenantPrismaClient;
    const tenantId = tenant.tenantId;
    const sessionMemberId = tenant.userId; // Now refers to TeamMember.id
    const isAdmin = tenant.orgRole === 'OWNER' || tenant.orgRole === 'ADMIN';

    const body = await request.json();
    const validation = createLeaveRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid request body',
        details: validation.error.issues,
      }, { status: 400 });
    }

    const data = validation.data;

    // Handle on-behalf-of requests (admin creating request for another employee)
    let targetMemberId = sessionMemberId;
    let createdById: string | null = null;

    if (data.employeeId && data.employeeId !== sessionMemberId) {
      // Only admins can create requests on behalf of others
      if (!isAdmin) {
        return NextResponse.json(
          { error: 'Only administrators can create leave requests on behalf of other employees' },
          { status: 403 }
        );
      }

      // Verify the target employee exists and belongs to this tenant
      const targetEmployee = await db.teamMember.findFirst({
        where: {
          id: data.employeeId,
          isEmployee: true,
        },
      });

      if (!targetEmployee) {
        return NextResponse.json(
          { error: 'Employee not found in this organization' },
          { status: 404 }
        );
      }

      targetMemberId = data.employeeId;
      createdById = sessionMemberId; // Track who submitted on behalf
    }

    // Use targetMemberId for all subsequent operations
    const memberId = targetMemberId;

    // Parse dates
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);

    // Validate leave type exists, is active, and belongs to this tenant
    const leaveType = await db.leaveType.findFirst({
      where: { id: data.leaveTypeId },
    });

    if (!leaveType) {
      return NextResponse.json({ error: 'Leave type not found' }, { status: 404 });
    }

    if (!leaveType.isActive) {
      return NextResponse.json({ error: 'This leave type is not active' }, { status: 400 });
    }

    // Get target member's data for service duration and gender checks
    // TeamMember now contains all HR profile data
    const memberData = await db.teamMember.findUnique({
      where: { id: memberId },
      select: {
        dateOfJoining: true,
        hajjLeaveTaken: true,
        gender: true,
        bypassNoticeRequirement: true,
      },
    });

    // Use memberData as hrProfile for compatibility with existing validation functions
    const hrProfile = memberData;

    // Check if member has existing balance for admin-assigned leave types
    const existingBalance = await db.leaveBalance.findFirst({
      where: {
        memberId,
        leaveTypeId: data.leaveTypeId,
        year: startDate.getFullYear(),
      },
    });

    // Validate leave type eligibility (admin assignment, gender, service requirement)
    const eligibilityResult = validateLeaveTypeEligibility({
      leaveType,
      hrProfile,
      startDate,
      hasExistingBalance: !!existingBalance,
    });
    if (!eligibilityResult.valid) {
      return NextResponse.json({ error: eligibilityResult.error }, { status: 400 });
    }

    // Check if this is a "once in employment" leave type (e.g., Hajj leave)
    if (leaveType.isOnceInEmployment) {
      const existingOnceLeave = await db.leaveRequest.findFirst({
        where: {
          memberId,
          leaveTypeId: leaveType.id,
          status: { in: ['PENDING', 'APPROVED'] },
        },
      });

      const onceResult = validateOnceInEmploymentLeave(leaveType, hrProfile, existingOnceLeave);
      if (!onceResult.valid) {
        return NextResponse.json({ error: onceResult.error }, { status: 400 });
      }
    }

    // Validate dates, notice period, and consecutive days limit
    const dateValidation = validateLeaveRequestDates({
      startDate,
      endDate,
      requestType: data.requestType,
      leaveType,
      isAdmin,
      adminOverrideNotice: data.adminOverrideNotice,
      bypassNoticeRequirement: hrProfile?.bypassNoticeRequirement,
    });

    if (dateValidation.error) {
      return NextResponse.json({ error: dateValidation.error }, { status: 400 });
    }

    const totalDays = dateValidation.totalDays;

    // Check for document requirement
    const docResult = validateDocumentRequirement(leaveType, data.documentUrl, totalDays);
    if (!docResult.valid) {
      return NextResponse.json({ error: docResult.error }, { status: 400 });
    }

    // Check for overlapping requests within tenant (pre-check before transaction)
    const overlappingRequests = await db.leaveRequest.findMany({
      where: {
        memberId,
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

    const overlapResult = validateNoOverlap(startDate, endDate, overlappingRequests);
    if (!overlapResult.valid) {
      return NextResponse.json({ error: overlapResult.error }, { status: 400 });
    }

    const year = startDate.getFullYear();

    // Create leave request in a transaction (includes balance check to prevent race conditions)
    const leaveRequest = await prisma.$transaction(async (tx) => {
      // Get or create leave balance inside transaction to prevent race conditions
      let balance = await tx.leaveBalance.findUnique({
        where: {
          tenantId_memberId_leaveTypeId_year: {
            tenantId,
            memberId,
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
            memberId,
            leaveTypeId: data.leaveTypeId,
            year,
            entitlement,
            tenantId: tenantId!,
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

      // Get organization's code prefix
      const codePrefix = await getOrganizationCodePrefix(tenantId!);

      // Generate unique request number: {PREFIX}-LR-XXXXX
      const leaveCount = await tx.leaveRequest.count({
        where: { tenantId: tenantId! }
      });
      const requestNumber = `${codePrefix}-LR-${String(leaveCount + 1).padStart(5, '0')}`;

      // Create the request
      const request = await tx.leaveRequest.create({
        data: {
          requestNumber,
          memberId,
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
          tenantId: tenantId!,
          // Track who submitted the request (if on behalf of another employee)
          createdById,
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

      // Update balance pending days
      await tx.leaveBalance.update({
        where: {
          tenantId_memberId_leaveTypeId_year: {
            tenantId,
            memberId,
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

      // Create history entry (performedById is the actual submitter, not the target user)
      await tx.leaveRequestHistory.create({
        data: {
          leaveRequestId: request.id,
          action: 'CREATED',
          newStatus: 'PENDING',
          performedById: sessionMemberId,
          notes: createdById ? 'Submitted on behalf of employee' : undefined,
        },
      });

      return request;
    });

    await logAction(
      tenantId,
      sessionMemberId,
      ActivityActions.LEAVE_REQUEST_CREATED,
      'LeaveRequest',
      leaveRequest.id,
      {
        requestNumber: leaveRequest.requestNumber,
        leaveType: leaveType.name,
        totalDays,
        startDate: data.startDate,
        endDate: data.endDate,
        onBehalfOf: createdById ? memberId : undefined,
      }
    );

    // Check for multi-level approval policy
    try {
      const approvalPolicy = await findApplicablePolicy('LEAVE_REQUEST', { days: totalDays, tenantId: tenantId! });

      if (approvalPolicy && approvalPolicy.levels.length > 0) {
        // Initialize approval chain
        const steps = await initializeApprovalChain('LEAVE_REQUEST', leaveRequest.id, approvalPolicy, tenantId!);

        // Send WhatsApp notifications to approvers (non-blocking)
        if (steps.length > 0) {
          notifyApproversViaWhatsApp(
            tenantId!,
            'LEAVE_REQUEST',
            leaveRequest.id,
            steps[0].requiredRole
          );
        }

        // Notify users with the first level's required role
        const firstStep = steps[0];
        if (firstStep) {
          const approvers = await db.teamMember.findMany({
            where: {
              approvalRole: firstStep.requiredRole,
              isDeleted: false,
            },
            select: { id: true },
          });

          for (const approver of approvers) {
            await createNotification({
              recipientId: approver.id,
              type: 'APPROVAL_PENDING',
              title: 'Leave Request Approval Required',
              message: `${leaveRequest.member?.name || leaveRequest.member?.email || 'Employee'} submitted a ${leaveType.name} request (${leaveRequest.requestNumber}) for ${totalDays} day${totalDays === 1 ? '' : 's'}. Your approval is required.`,
              link: `/admin/leave/requests/${leaveRequest.id}`,
              entityType: 'LeaveRequest',
              entityId: leaveRequest.id,
            }, tenantId);
          }
        }
      } else {
        // No policy - fall back to notifying all admins in the same organization
        const admins = await db.teamMember.findMany({
          where: {
            role: 'ADMIN',
            isDeleted: false,
          },
          select: { id: true },
        });

        if (admins.length > 0) {
          const notifications = admins.map(admin =>
            NotificationTemplates.leaveSubmitted(
              admin.id,
              leaveRequest.member?.name || leaveRequest.member?.email || 'Employee',
              leaveRequest.requestNumber,
              leaveType.name,
              totalDays,
              leaveRequest.id
            )
          );
          await createBulkNotifications(notifications, tenantId);
        }
      }
    } catch (notifyError) {
      logger.error({ error: notifyError instanceof Error ? notifyError.message : 'Unknown error', leaveRequestId: leaveRequest.id }, 'Failed to send leave request notifications');
    }

    return NextResponse.json(leaveRequest, { status: 201 });
}

export const POST = withErrorHandler(createLeaveRequestHandler, { requireAuth: true, requireModule: 'leave' });
