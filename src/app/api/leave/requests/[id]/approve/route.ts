/**
 * @file route.ts
 * @description Approve a pending leave request with multi-level approval chain support.
 *              Supports parallel visibility where any upper level can approve and override
 *              lower pending levels.
 * @module hr/leave
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import { TenantPrismaClient } from '@/lib/core/prisma-tenant';
import { approveLeaveRequestSchema } from '@/features/leave/validations/leave';
import { logAction, ActivityActions } from '@/lib/core/activity';
import { createNotification, createBulkNotifications, NotificationTemplates } from '@/features/notifications/lib';
import { sendEmail } from '@/lib/core/email';
import { leaveRequestSubmittedEmail, leaveApprovedEmail } from '@/lib/core/email-templates';
import { notifyApproversViaWhatsApp } from '@/lib/whatsapp';
import logger from '@/lib/core/log';
import { withErrorHandler, APIContext } from '@/lib/http/handler';
import { invalidateTokensForEntity } from '@/lib/whatsapp';
import {
  getApprovalChain,
  getApprovalChainSummary,
  getApproversForRole,
  getCurrentPendingStep,
} from '@/features/approvals/lib';
import { Role } from '@prisma/client';

/**
 * Determine what role level the current user can approve at.
 * Returns the highest role they qualify for.
 */
async function getUserApprovalRole(
  db: TenantPrismaClient,
  userId: string,
  requesterId: string
): Promise<{ role: Role; levelOrder: number } | null> {
  const member = await db.teamMember.findUnique({
    where: { id: userId },
    select: {
      id: true,
      tenantId: true,
      isAdmin: true,
      isOwner: true,
      hasHRAccess: true,
      hasFinanceAccess: true,
    },
  });

  if (!member) return null;

  // Admin = Director (highest level)
  if (member.isAdmin) {
    return { role: 'DIRECTOR', levelOrder: 3 };
  }

  // Owner = Director only if no other admins exist
  if (member.isOwner) {
    const otherAdminCount = await db.teamMember.count({
      where: {
        isAdmin: true,
        isDeleted: false,
        id: { not: userId },
      },
    });
    if (otherAdminCount === 0) {
      return { role: 'DIRECTOR', levelOrder: 3 };
    }
  }

  // HR Manager is level 2
  if (member.hasHRAccess) {
    return { role: 'HR_MANAGER', levelOrder: 2 };
  }

  // Check if user is the requester's direct manager (level 1)
  const requester = await db.teamMember.findUnique({
    where: { id: requesterId },
    select: { reportingToId: true },
  });

  if (requester?.reportingToId === userId) {
    return { role: 'MANAGER', levelOrder: 1 };
  }

  return null;
}

async function approveLeaveRequestHandler(request: NextRequest, context: APIContext) {
  const { tenant, params, prisma: tenantPrisma } = context;
  if (!tenant?.tenantId) {
    return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
  }
  const db = tenantPrisma as TenantPrismaClient;
  const tenantId = tenant.tenantId;
  const currentUserId = tenant.userId;
  const id = params?.id;
  if (!id) {
    return NextResponse.json({ error: 'ID is required' }, { status: 400 });
  }

  const body = await request.json();
  const validation = approveLeaveRequestSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json({
      error: 'Invalid request body',
      details: validation.error.issues,
    }, { status: 400 });
  }

  const { notes } = validation.data;

  // Get existing request within tenant
  const existing = await db.leaveRequest.findFirst({
    where: { id },
    include: {
      member: {
        select: { id: true, name: true },
      },
      leaveType: {
        select: { name: true, isOnceInEmployment: true },
      },
    },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Leave request not found' }, { status: 404 });
  }

  if (existing.status !== 'PENDING') {
    return NextResponse.json({
      error: 'Only pending requests can be approved',
    }, { status: 400 });
  }

  // Get the approval chain
  const chain = await getApprovalChain('LEAVE_REQUEST', id);

  if (chain.length === 0) {
    return NextResponse.json({ error: 'No approval chain found for this request' }, { status: 400 });
  }

  // Determine user's approval role
  const userRole = await getUserApprovalRole(db, currentUserId, existing.memberId);

  if (!userRole) {
    return NextResponse.json({ error: 'You do not have permission to approve this request' }, { status: 403 });
  }

  // Find the step that matches the user's role
  const userStep = chain.find(step => step.requiredRole === userRole.role);

  // Track if this is an admin bypass (admin approving when their role isn't in chain)
  let isAdminBypass = false;

  if (!userStep) {
    // User's role is not in the chain - check if they can approve any step
    // Admins can approve any step (admin bypass)
    const member = await db.teamMember.findUnique({
      where: { id: currentUserId },
      select: { isAdmin: true },
    });

    if (!member?.isAdmin) {
      return NextResponse.json({
        error: 'Your role is not part of the approval chain for this request'
      }, { status: 403 });
    }

    isAdminBypass = true;
  }

  // Get approver name for notes
  const approver = await db.teamMember.findUnique({
    where: { id: currentUserId },
    select: { name: true, email: true },
  });
  const approverName = approver?.name || approver?.email || 'Unknown';

  // Find the current pending step (lowest level that's still pending)
  const currentPendingStep = chain.find(step => step.status === 'PENDING');

  if (!currentPendingStep) {
    return NextResponse.json({ error: 'No pending approval steps found' }, { status: 400 });
  }

  // Determine which step to approve based on user's role
  // For admin bypass, approve all remaining steps (full bypass)
  const stepToApprove = userStep || chain[chain.length - 1]; // If no matching step, approve last one (admin case)

  // If user is approving at a level higher than current pending, this is an override
  const isOverride = stepToApprove.levelOrder > currentPendingStep.levelOrder;

  // Override and admin bypass approvals require notes explaining the action
  if ((isOverride || isAdminBypass) && (!notes || notes.trim() === '')) {
    return NextResponse.json({
      error: isAdminBypass
        ? 'Notes are required for admin bypass approvals. Please explain why you are approving this request.'
        : 'Notes are required when approving at a higher level (override). Please explain why you are skipping the lower approval levels.',
    }, { status: 400 });
  }

  const now = new Date();
  const year = existing.startDate.getFullYear();

  // Process approval in transaction
  const result = await prisma.$transaction(async (tx) => {
    // Admin bypass: approve ALL pending steps at once
    if (isAdminBypass) {
      await tx.approvalStep.updateMany({
        where: {
          entityType: 'LEAVE_REQUEST',
          entityId: id,
          status: 'PENDING',
        },
        data: {
          status: 'APPROVED',
          approverId: currentUserId,
          actionAt: now,
          notes: `Admin bypass: ${notes}`,
        },
      });
    } else {
      // If this is an override, skip all lower pending steps
      if (isOverride) {
        // Mark all pending steps below user's level as SKIPPED
        await tx.approvalStep.updateMany({
          where: {
            entityType: 'LEAVE_REQUEST',
            entityId: id,
            status: 'PENDING',
            levelOrder: { lt: stepToApprove.levelOrder },
          },
          data: {
            status: 'SKIPPED',
            approverId: currentUserId,
            actionAt: now,
            notes: `Skipped - Approved by ${approverName}`,
          },
        });
      }

      // Approve the current step (or user's step)
      await tx.approvalStep.update({
        where: { id: stepToApprove.id },
        data: {
          status: 'APPROVED',
          approverId: currentUserId,
          actionAt: now,
          notes: notes || undefined,
        },
      });
    }

    // Check if all steps are now complete (approved or skipped)
    const remainingPending = await tx.approvalStep.count({
      where: {
        entityType: 'LEAVE_REQUEST',
        entityId: id,
        status: 'PENDING',
      },
    });

    const isChainComplete = remainingPending === 0;

    if (isChainComplete) {
      // All approvals done - finalize the leave request
      const request = await tx.leaveRequest.update({
        where: { id },
        data: {
          status: 'APPROVED',
          approverId: currentUserId,
          approvedAt: now,
          approverNotes: notes,
        },
        include: {
          member: {
            select: { id: true, name: true, email: true },
          },
          leaveType: {
            select: { id: true, name: true, color: true },
          },
          approver: {
            select: { id: true, name: true },
          },
        },
      });

      // Update balance: pending -= totalDays, used += totalDays
      await tx.leaveBalance.update({
        where: {
          tenantId_memberId_leaveTypeId_year: {
            tenantId,
            memberId: existing.memberId,
            leaveTypeId: existing.leaveTypeId,
            year,
          },
        },
        data: {
          pending: { decrement: Number(existing.totalDays) },
          used: { increment: Number(existing.totalDays) },
        },
      });

      // Create history entry
      await tx.leaveRequestHistory.create({
        data: {
          leaveRequestId: id,
          action: 'APPROVED',
          oldStatus: 'PENDING',
          newStatus: 'APPROVED',
          notes: isAdminBypass
            ? `Admin bypass: ${notes}`
            : isOverride
              ? `${notes || ''} (Override: lower levels skipped)`.trim()
              : notes,
          performedById: currentUserId,
        },
      });

      // Mark hajjLeaveTaken if this is once-in-employment leave
      if (existing.leaveType?.isOnceInEmployment) {
        await tx.teamMember.update({
          where: { id: existing.memberId },
          data: { hajjLeaveTaken: true },
        });
      }

      return { request, isChainComplete: true };
    } else {
      // Chain not complete - just record the step approval
      await tx.leaveRequestHistory.create({
        data: {
          leaveRequestId: id,
          action: 'UPDATED',
          oldStatus: 'PENDING',
          newStatus: 'PENDING',
          notes: `Level ${stepToApprove.levelOrder} (${stepToApprove.requiredRole}) approved by ${approverName}`,
          performedById: currentUserId,
        },
      });

      return { request: null, isChainComplete: false };
    }
  });

  if (result.isChainComplete && result.request) {
    // Final approval - send notifications and log
    await logAction(
      tenantId,
      currentUserId,
      ActivityActions.LEAVE_REQUEST_APPROVED,
      'LeaveRequest',
      id,
      {
        requestNumber: existing.requestNumber,
        memberName: existing.member?.name,
        leaveType: existing.leaveType?.name,
        totalDays: Number(existing.totalDays),
        approvalMethod: isOverride ? 'override' : 'sequential',
      }
    );

    // Invalidate WhatsApp action tokens
    await invalidateTokensForEntity('LEAVE_REQUEST', id);

    // Notify the requester (in-app)
    await createNotification(
      NotificationTemplates.leaveApproved(
        existing.memberId,
        existing.requestNumber,
        existing.leaveType?.name || 'Leave',
        id
      ),
      tenantId
    );

    // Send email notification to the requester
    try {
      const org = await db.organization.findUnique({
        where: { id: tenantId },
        select: { slug: true, name: true, primaryColor: true },
      });

      if (org && result.request.member?.email) {
        const emailContent = leaveApprovedEmail({
          requestNumber: existing.requestNumber,
          employeeName: result.request.member.name || 'Employee',
          leaveType: existing.leaveType?.name || 'Leave',
          startDate: existing.startDate,
          endDate: existing.endDate,
          totalDays: Number(existing.totalDays),
          approverName: approverName,
          approverNotes: notes || null,
          orgSlug: org.slug,
          orgName: org.name,
          primaryColor: org.primaryColor || undefined,
        });

        sendEmail({
          to: result.request.member.email,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
          tenantId,
        }).catch(err => logger.error({ error: err instanceof Error ? err.message : 'Unknown error' }, 'Failed to send leave approval email'));
      }
    } catch (emailError) {
      logger.error({ error: emailError instanceof Error ? emailError.message : 'Unknown error', leaveRequestId: id }, 'Failed to send leave approval email notification');
    }

    // Include approval chain in response
    const updatedChain = await getApprovalChain('LEAVE_REQUEST', id);
    const chainSummary = await getApprovalChainSummary('LEAVE_REQUEST', id);

    return NextResponse.json({
      ...result.request,
      approvalChain: updatedChain,
      approvalSummary: chainSummary,
      message: 'Leave request fully approved',
    });
  } else {
    // Partial approval - chain not complete
    // Notify the next level approvers (sequential notification)
    try {
      const nextPendingStep = await getCurrentPendingStep('LEAVE_REQUEST', id);

      if (nextPendingStep) {
        const nextLevelApprovers = await getApproversForRole(
          nextPendingStep.requiredRole,
          tenantId,
          existing.memberId
        );

        // Filter out the requester themselves
        const filteredApprovers = nextLevelApprovers.filter(a => a.id !== existing.memberId);

        if (filteredApprovers.length > 0) {
          // Get organization info for emails
          const org = await db.organization.findUnique({
            where: { id: tenantId },
            select: { slug: true, name: true, primaryColor: true },
          });

          // Send WhatsApp notifications to next level approvers
          notifyApproversViaWhatsApp(
            tenantId,
            'LEAVE_REQUEST',
            id,
            nextPendingStep.requiredRole
          );

          // Send email notifications to next level approvers
          if (org) {
            const emailContent = leaveRequestSubmittedEmail({
              requestNumber: existing.requestNumber,
              requesterName: existing.member?.name || 'Employee',
              leaveType: existing.leaveType?.name || 'Leave',
              startDate: existing.startDate,
              endDate: existing.endDate,
              totalDays: Number(existing.totalDays),
              reason: existing.reason,
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
            }).catch(err => logger.error({ error: err instanceof Error ? err.message : 'Unknown error' }, 'Failed to send leave approval forward email'));
          }

          // In-app notifications to next level approvers
          const notifications = filteredApprovers.map(approver => ({
            recipientId: approver.id,
            type: 'APPROVAL_PENDING' as const,
            title: 'Leave Request Pending Your Approval',
            message: `${existing.member?.name || 'Employee'}'s ${existing.leaveType?.name || 'leave'} request (${existing.requestNumber}) has been forwarded to you for approval.`,
            link: `/admin/leave/requests/${id}`,
            entityType: 'LeaveRequest',
            entityId: id,
          }));
          await createBulkNotifications(notifications, tenantId);
        }
      }
    } catch (notifyError) {
      logger.error({ error: notifyError instanceof Error ? notifyError.message : 'Unknown error', leaveRequestId: id }, 'Failed to send next level approval notifications');
    }

    const updatedChain = await getApprovalChain('LEAVE_REQUEST', id);
    const chainSummary = await getApprovalChainSummary('LEAVE_REQUEST', id);

    return NextResponse.json({
      message: isOverride
        ? `Level ${stepToApprove.levelOrder} approved (lower levels skipped). Waiting for remaining approvals.`
        : `Level ${stepToApprove.levelOrder} approved. Waiting for remaining approvals.`,
      approvalChain: updatedChain,
      approvalSummary: chainSummary,
      currentStep: chainSummary.currentStep,
    });
  }
}

// Allow users with approval capability to approve leave requests
export const POST = withErrorHandler(approveLeaveRequestHandler, {
  requireCanApprove: true,
  requireModule: 'leave'
});
