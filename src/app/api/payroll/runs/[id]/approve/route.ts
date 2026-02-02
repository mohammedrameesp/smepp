/**
 * @file route.ts
 * @description Approve a submitted payroll run API
 * @module hr/payroll
 */
import { NextRequest, NextResponse } from 'next/server';
import { PayrollStatus } from '@prisma/client';
import { prisma } from '@/lib/core/prisma';
import { TenantPrismaClient } from '@/lib/core/prisma-tenant';
import { logAction, ActivityActions } from '@/lib/core/activity';
import { approvePayrollSchema } from '@/features/payroll/validations/payroll';
import { withErrorHandler, APIContext } from '@/lib/http/handler';
import { createBulkNotifications, NotificationTemplates } from '@/features/notifications/lib';
import { sendEmail, payrollApprovedEmail } from '@/lib/email';
import logger from '@/lib/core/log';
import { formatMonthYear } from '@/lib/core/datetime';

async function approvePayrollHandler(request: NextRequest, context: APIContext) {
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

    const body = await request.json().catch(() => ({}));
    const validation = approvePayrollSchema.safeParse(body);

    // Return validation errors instead of silently continuing
    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid request body',
        details: validation.error.issues,
      }, { status: 400 });
    }

    const notes = validation.data.notes;

    // Use findFirst with tenantId to prevent cross-tenant access
    const payrollRun = await db.payrollRun.findFirst({
      where: { id, tenantId },
    });

    if (!payrollRun) {
      return NextResponse.json({ error: 'Payroll run not found' }, { status: 404 });
    }

    if (payrollRun.status !== PayrollStatus.PENDING_APPROVAL) {
      return NextResponse.json({
        error: 'Can only approve payroll runs in PENDING_APPROVAL status',
        currentStatus: payrollRun.status,
      }, { status: 400 });
    }

    const updatedRun = await prisma.$transaction(async (tx) => {
      const run = await tx.payrollRun.update({
        where: { id },
        data: {
          status: PayrollStatus.APPROVED,
          approvedById: currentUserId,
          approvedAt: new Date(),
          approverNotes: notes,
        },
      });

      await tx.payrollHistory.create({
        data: {
          payrollRunId: id,
          action: 'APPROVED',
          previousStatus: PayrollStatus.PENDING_APPROVAL,
          newStatus: PayrollStatus.APPROVED,
          notes,
          performedById: currentUserId,
        },
      });

      return run;
    });

    await logAction(
      tenantId,
      currentUserId,
      ActivityActions.PAYROLL_RUN_APPROVED,
      'PayrollRun',
      id,
      { referenceNumber: payrollRun.referenceNumber }
    );

    // Get payroll details for notifications
    const payrollDetails = await db.payrollRun.findUnique({
      where: { id },
      include: {
        _count: {
          select: { payslips: true },
        },
      },
    });

    // Get organization and approver info for notifications
    const [org, approver] = await Promise.all([
      prisma.organization.findUnique({
        where: { id: tenantId },
        select: { slug: true, name: true, primaryColor: true, currency: true },
      }),
      db.teamMember.findUnique({
        where: { id: currentUserId },
        select: { name: true, email: true },
      }),
    ]);

    const periodLabel = formatMonthYear(payrollRun.periodStart);
    const currency = org?.currency || 'QAR';
    const approverName = approver?.name || approver?.email || 'Admin';

    // Send email + in-app notifications to admins
    try {
      const admins = await db.teamMember.findMany({
        where: { isAdmin: true, isDeleted: false },
        select: { id: true, email: true },
      });

      if (admins.length > 0) {
        // Send in-app notifications (exclude the approver)
        const inAppNotifications = admins
          .filter(admin => admin.id !== currentUserId)
          .map(admin =>
            NotificationTemplates.payrollApproved(
              admin.id,
              payrollRun.referenceNumber,
              periodLabel,
              id
            )
          );

        if (inAppNotifications.length > 0) {
          await createBulkNotifications(inAppNotifications, tenantId);
        }

        // Send email to all admins (excluding the approver)
        if (org) {
          const emailContent = payrollApprovedEmail({
            referenceNumber: payrollRun.referenceNumber,
            periodLabel,
            employeeCount: payrollDetails?._count.payslips || 0,
            totalNet: payrollDetails?.totalNet?.toString() || '0',
            currency,
            approverName,
            orgSlug: org.slug,
            orgName: org.name,
            primaryColor: org.primaryColor || undefined,
          });

          const adminEmails = admins
            .filter(admin => admin.id !== currentUserId)
            .map(admin => admin.email);

          if (adminEmails.length > 0) {
            sendEmail({
              to: adminEmails,
              subject: emailContent.subject,
              html: emailContent.html,
              text: emailContent.text,
              tenantId,
            }).catch(err => logger.error({ error: err instanceof Error ? err.message : 'Unknown error' }, 'Failed to send payroll approved email'));
          }
        }
      }
    } catch (notifyError) {
      logger.error({
        error: notifyError instanceof Error ? notifyError.message : 'Unknown error',
        payrollRunId: id,
      }, 'Failed to send notifications for payroll approval');
    }

    return NextResponse.json({
      success: true,
      message: 'Payroll run approved successfully',
      payrollRun: {
        id: updatedRun.id,
        referenceNumber: payrollRun.referenceNumber,
        status: updatedRun.status,
        approvedAt: updatedRun.approvedAt,
      },
      status: updatedRun.status,
    });
}

export const POST = withErrorHandler(approvePayrollHandler, { requireFinanceAccess: true, requireModule: 'payroll' });

/* CODE REVIEW SUMMARY
 * Date: 2026-02-01
 * Reviewer: Claude
 * Status: Reviewed
 * Changes: Added review summary
 * Issues: None identified
 */
