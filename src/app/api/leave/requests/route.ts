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
import { sendEmail } from '@/lib/core/email';
import { leaveRequestSubmittedEmail } from '@/lib/core/email-templates';
import { findApplicablePolicy, initializeApprovalChain, ensureDefaultApprovalPolicies, getApproversForRole, ApprovalPolicyWithLevels, getCurrentPendingStep } from '@/features/approvals/lib';
import { prisma as globalPrisma } from '@/lib/core/prisma';
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

    // Users with admin or HR access can see all requests
    const hasFullAccess = !!(tenant?.isOwner || tenant?.isAdmin || tenant?.hasHRAccess);
    // Support both memberId and legacy userId parameter
    const filterMemberId = memberId || userId;

    // Build where clause (tenant filtering is automatic via db)
    const where: Record<string, unknown> = {};

    if (hasFullAccess) {
      // Full access: can see all or filter by specific member
      if (filterMemberId) {
        where.memberId = filterMemberId;
      }
    } else if (tenant?.canApprove) {
      // Manager: can see own requests + direct reports' requests
      const directReports = await db.teamMember.findMany({
        where: { reportingToId: tenant.userId },
        select: { id: true },
      });
      const directReportIds = directReports.map(r => r.id);

      // Include own ID + direct reports
      const allowedMemberIds = [tenant.userId, ...directReportIds];

      // If filtering by specific member, ensure they're in allowed list
      if (filterMemberId) {
        if (allowedMemberIds.includes(filterMemberId)) {
          where.memberId = filterMemberId;
        } else {
          // Trying to access someone they don't manage - return empty
          where.memberId = tenant.userId;
        }
      } else {
        where.memberId = { in: allowedMemberIds };
      }
    } else {
      // Regular user: can only see their own requests
      where.memberId = tenant.userId;
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
        orderBy: [
          { status: 'asc' },  // PENDING first, then APPROVED, REJECTED, CANCELLED
          { [sort]: order },
        ],
        take: ps,
        skip,
      }),
      db.leaveRequest.count({ where }),
    ]);

    // Get approval summaries for pending requests (batch query for efficiency)
    const pendingRequestIds = requests
      .filter(r => r.status === 'PENDING')
      .map(r => r.id);

    let approvalStepsMap: Record<string, { currentStep: { levelOrder: number; requiredRole: string } | null; totalSteps: number; completedSteps: number; canCurrentUserApprove: boolean }> = {};

    if (pendingRequestIds.length > 0) {
      // Batch fetch all approval steps for pending requests
      const allSteps = await globalPrisma.approvalStep.findMany({
        where: {
          entityType: 'LEAVE_REQUEST',
          entityId: { in: pendingRequestIds },
        },
        orderBy: { levelOrder: 'asc' },
      });

      // Get current user's approval capabilities
      const currentUserId = tenant.userId;
      const currentUserIsAdmin = !!(tenant.isAdmin || tenant.isOwner);
      const currentUserHasHRAccess = !!tenant.hasHRAccess;
      const currentUserHasFinanceAccess = !!tenant.hasFinanceAccess;

      // Get the list of team members who report to the current user (for MANAGER role check)
      const directReports = await db.teamMember.findMany({
        where: { reportingToId: currentUserId },
        select: { id: true },
      });
      const directReportIds = new Set(directReports.map(r => r.id));

      // Helper function to check if current user can approve a step based on role match
      // Note: Admins CAN approve any step (via bypass), but we only show "You" if they're
      // the natural approver for that step to avoid confusion
      const canUserApproveStep = (step: { requiredRole: string }, requesterId: string): boolean => {
        switch (step.requiredRole) {
          case 'MANAGER':
            // User must be the requester's direct manager
            return directReportIds.has(requesterId);
          case 'HR_MANAGER':
            return currentUserHasHRAccess;
          case 'FINANCE_MANAGER':
            return currentUserHasFinanceAccess;
          case 'DIRECTOR':
            // Only admins can approve director-level steps
            return currentUserIsAdmin;
          default:
            return false;
        }
      };

      // Create a map of request IDs to requester member IDs
      const requestMemberMap = new Map(requests.map(r => [r.id, r.member?.id || '']));

      // Group steps by entityId and calculate summary
      for (const requestId of pendingRequestIds) {
        const steps = allSteps.filter(s => s.entityId === requestId);
        if (steps.length > 0) {
          const currentPending = steps.find(s => s.status === 'PENDING');
          const completedSteps = steps.filter(s => s.status === 'APPROVED' || s.status === 'SKIPPED').length;
          const requesterId = requestMemberMap.get(requestId) || '';
          approvalStepsMap[requestId] = {
            currentStep: currentPending ? { levelOrder: currentPending.levelOrder, requiredRole: currentPending.requiredRole } : null,
            totalSteps: steps.length,
            completedSteps,
            canCurrentUserApprove: currentPending ? canUserApproveStep(currentPending, requesterId) : false,
          };
        }
      }
    }

    // Enrich requests with approval summary
    const enrichedRequests = requests.map(request => ({
      ...request,
      approvalSummary: request.status === 'PENDING' ? approvalStepsMap[request.id] || null : null,
    }));

    return NextResponse.json({
      requests: enrichedRequests,
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
    const isAdmin = !!(tenant?.isOwner || tenant?.isAdmin);

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

    // Validate start date is not in the past (unless admin creating backdated request)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDateNormalized = new Date(startDate);
    startDateNormalized.setHours(0, 0, 0, 0);

    if (startDateNormalized < today && !isAdmin) {
      return NextResponse.json(
        { error: 'Leave start date cannot be in the past. Contact your administrator to create backdated requests.' },
        { status: 400 }
      );
    }

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

    // Fetch organization's weekend days configuration
    const organization = await db.organization.findUnique({
      where: { id: tenantId },
      select: { weekendDays: true },
    });
    const weekendDays = organization?.weekendDays ?? [5, 6]; // Default to Friday-Saturday

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
      weekendDays,
    });

    if (dateValidation.error) {
      return NextResponse.json({ error: dateValidation.error }, { status: 400 });
    }

    const totalDays = dateValidation.totalDays;

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

      // Generate unique request number: {PREFIX}-LR-YYMMDD-NNN (date-based to reduce race conditions)
      const now = new Date();
      const yearStr = now.getFullYear().toString().slice(-2);
      const month = (now.getMonth() + 1).toString().padStart(2, '0');
      const day = now.getDate().toString().padStart(2, '0');
      const datePrefix = `${codePrefix}-LR-${yearStr}${month}${day}`;

      // Find highest sequence for today (reduces collision window to same day)
      const existingRequests = await tx.leaveRequest.findMany({
        where: {
          tenantId: tenantId!,
          requestNumber: { startsWith: datePrefix },
        },
        orderBy: { requestNumber: 'desc' },
        take: 1,
      });

      let nextSequence = 1;
      if (existingRequests.length > 0) {
        const latestNumber = existingRequests[0].requestNumber;
        const parts = latestNumber.split('-');
        if (parts.length === 4) {
          const currentSequence = parseInt(parts[3], 10);
          if (!isNaN(currentSequence)) {
            nextSequence = currentSequence + 1;
          }
        }
      }
      const requestNumber = `${datePrefix}-${nextSequence.toString().padStart(3, '0')}`;

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

    // Initialize multi-level approval chain and notify all approvers
    try {
      // Ensure default approval policies exist for this tenant (lazy initialization)
      await ensureDefaultApprovalPolicies(tenantId!, 'LEAVE_REQUEST');

      // Find applicable policy (should always exist now after ensuring defaults)
      const approvalPolicy = await findApplicablePolicy('LEAVE_REQUEST', { days: totalDays, tenantId: tenantId! });

      if (approvalPolicy && approvalPolicy.levels.length > 0) {
        // Initialize approval chain (pass memberId to check manager relationship)
        // This will auto-skip levels where no approver exists (e.g., no manager assigned)
        const steps = await initializeApprovalChain('LEAVE_REQUEST', leaveRequest.id, approvalPolicy, tenantId!, memberId);

        // Get organization info for emails
        const org = await db.organization.findUnique({
          where: { id: tenantId },
          select: { slug: true, name: true, primaryColor: true },
        });

        // Sequential notifications: Only notify the first level approvers
        // Next levels will be notified when previous level approves
        if (steps.length > 0) {
          const firstStep = steps[0];
          const firstLevelApprovers = await getApproversForRole(
            firstStep.requiredRole,
            tenantId!,
            memberId
          );

          // Filter out the requester themselves if they happen to be an approver
          const filteredApprovers = firstLevelApprovers.filter(a => a.id !== memberId);

          if (filteredApprovers.length > 0) {
            // Send WhatsApp notifications to first level approvers (non-blocking)
            notifyApproversViaWhatsApp(
              tenantId!,
              'LEAVE_REQUEST',
              leaveRequest.id,
              firstStep.requiredRole,
              memberId // Pass requester ID for role-based routing
            );

            // Send email notifications to first level approvers only
            if (org) {
              const emailContent = leaveRequestSubmittedEmail({
                requestNumber: leaveRequest.requestNumber,
                requesterName: leaveRequest.member?.name || leaveRequest.member?.email || 'Employee',
                leaveType: leaveType.name,
                startDate: leaveRequest.startDate,
                endDate: leaveRequest.endDate,
                totalDays,
                reason: leaveRequest.reason,
                orgSlug: org.slug,
                orgName: org.name,
                primaryColor: org.primaryColor || undefined,
              });
              sendEmail({
                to: filteredApprovers.map(a => a.email),
                subject: emailContent.subject,
                html: emailContent.html,
                text: emailContent.text,
                tenantId,
              }).catch(err => logger.error({ error: err instanceof Error ? err.message : 'Unknown error' }, 'Failed to send leave request email'));
            }

            // In-app notifications to first level approvers only
            const notifications = filteredApprovers.map(approver => ({
              recipientId: approver.id,
              type: 'APPROVAL_PENDING' as const,
              title: 'Leave Request Pending Your Approval',
              message: `${leaveRequest.member?.name || leaveRequest.member?.email || 'Employee'} submitted a ${leaveType.name} request (${leaveRequest.requestNumber}) for ${totalDays} day${totalDays === 1 ? '' : 's'}.`,
              link: `/admin/leave/requests/${leaveRequest.id}`,
              entityType: 'LeaveRequest',
              entityId: leaveRequest.id,
            }));
            await createBulkNotifications(notifications, tenantId);
          }
        }
      } else {
        // Fallback: No policy even after ensuring defaults - notify admins
        logger.warn({ tenantId, leaveRequestId: leaveRequest.id }, 'No approval policy found even after ensuring defaults');

        const admins = await db.teamMember.findMany({
          where: {
            isAdmin: true,
            isDeleted: false,
          },
          select: { id: true, email: true },
        });

        if (admins.length > 0) {
          const org = await db.organization.findUnique({
            where: { id: tenantId },
            select: { slug: true, name: true, primaryColor: true },
          });
          if (org) {
            const emailContent = leaveRequestSubmittedEmail({
              requestNumber: leaveRequest.requestNumber,
              requesterName: leaveRequest.member?.name || leaveRequest.member?.email || 'Employee',
              leaveType: leaveType.name,
              startDate: leaveRequest.startDate,
              endDate: leaveRequest.endDate,
              totalDays,
              reason: leaveRequest.reason,
              orgSlug: org.slug,
              orgName: org.name,
              primaryColor: org.primaryColor || undefined,
            });
            sendEmail({
              to: admins.map(a => a.email),
              subject: emailContent.subject,
              html: emailContent.html,
              text: emailContent.text,
              tenantId,
            }).catch(err => logger.error({ error: err instanceof Error ? err.message : 'Unknown error' }, 'Failed to send leave request email'));
          }

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
