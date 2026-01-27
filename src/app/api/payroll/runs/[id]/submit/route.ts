/**
 * @file route.ts
 * @description Submit a processed payroll run for approval API
 * @module hr/payroll
 */
import { NextRequest, NextResponse } from 'next/server';
import { PayrollStatus } from '@prisma/client';
import { prisma } from '@/lib/core/prisma';
import { TenantPrismaClient } from '@/lib/core/prisma-tenant';
import { logAction, ActivityActions } from '@/lib/core/activity';
import { submitPayrollSchema } from '@/features/payroll/validations/payroll';
import { withErrorHandler, APIContext } from '@/lib/http/handler';
import { createBulkNotifications, NotificationTemplates } from '@/features/notifications/lib';
import { sendEmail, payrollSubmittedEmail } from '@/lib/email';
import logger from '@/lib/core/log';
import { formatMonthYear } from '@/lib/core/datetime';

async function submitPayrollHandler(request: NextRequest, context: APIContext) {
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
    const validation = submitPayrollSchema.safeParse(body);

    const notes = validation.success ? validation.data.notes : undefined;

    // Use findFirst with tenantId to prevent cross-tenant access
    const payrollRun = await db.payrollRun.findFirst({
      where: { id, tenantId },
    });

    if (!payrollRun) {
      return NextResponse.json({ error: 'Payroll run not found' }, { status: 404 });
    }

    if (payrollRun.status !== PayrollStatus.PROCESSED) {
      return NextResponse.json({
        error: 'Can only submit payroll runs in PROCESSED status. Please process the payroll first.',
        currentStatus: payrollRun.status,
      }, { status: 400 });
    }

    const updatedRun = await prisma.$transaction(async (tx) => {
      const run = await tx.payrollRun.update({
        where: { id },
        data: {
          status: PayrollStatus.PENDING_APPROVAL,
          submittedById: currentUserId,
          submittedAt: new Date(),
        },
      });

      await tx.payrollHistory.create({
        data: {
          payrollRunId: id,
          action: 'SUBMITTED',
          previousStatus: PayrollStatus.PROCESSED,
          newStatus: PayrollStatus.PENDING_APPROVAL,
          notes,
          performedById: currentUserId,
        },
      });

      return run;
    });

    await logAction(
      tenantId,
      currentUserId,
      ActivityActions.PAYROLL_RUN_SUBMITTED,
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

    // Get organization and submitter info for notifications
    const [org, submitter] = await Promise.all([
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
    const submitterName = submitter?.name || submitter?.email || 'Admin';

    // Send email + in-app notifications to admins
    try {
      const admins = await db.teamMember.findMany({
        where: { isAdmin: true, isDeleted: false },
        select: { id: true, email: true },
      });

      if (admins.length > 0) {
        // Send in-app notifications (exclude the submitter)
        const inAppNotifications = admins
          .filter(admin => admin.id !== currentUserId)
          .map(admin =>
            NotificationTemplates.payrollSubmitted(
              admin.id,
              payrollRun.referenceNumber,
              periodLabel,
              payrollDetails?.totalNet?.toString() || '0',
              currency,
              id
            )
          );

        if (inAppNotifications.length > 0) {
          await createBulkNotifications(inAppNotifications, tenantId);
        }

        // Send email to all admins (including the submitter for record)
        if (org) {
          const emailContent = payrollSubmittedEmail({
            referenceNumber: payrollRun.referenceNumber,
            periodLabel,
            employeeCount: payrollDetails?._count.payslips || 0,
            totalGross: payrollDetails?.totalGross?.toString() || '0',
            totalNet: payrollDetails?.totalNet?.toString() || '0',
            currency,
            submitterName,
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
            }).catch(err => logger.error({ error: err instanceof Error ? err.message : 'Unknown error' }, 'Failed to send payroll submitted email'));
          }
        }
      }
    } catch (notifyError) {
      logger.error({
        error: notifyError instanceof Error ? notifyError.message : 'Unknown error',
        payrollRunId: id,
      }, 'Failed to send notifications for payroll submission');
    }

    return NextResponse.json({ success: true, status: updatedRun.status });
}

export const POST = withErrorHandler(submitPayrollHandler, { requireAdmin: true, requireModule: 'payroll' });
