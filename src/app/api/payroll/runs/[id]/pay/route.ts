/**
 * @file route.ts
 * @description Mark approved payroll run as paid API
 * @module hr/payroll
 */
import { NextRequest, NextResponse } from 'next/server';
import { PayrollStatus } from '@prisma/client';
import { prisma } from '@/lib/core/prisma';
import { logAction, ActivityActions } from '@/lib/activity';
import { markPaidSchema } from '@/lib/validations/payroll';
import { withErrorHandler, APIContext } from '@/lib/http/handler';

async function payPayrollHandler(request: NextRequest, context: APIContext) {
    const { tenant, params } = context;
    const tenantId = tenant!.tenantId;
    const currentUserId = tenant!.userId;
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const validation = markPaidSchema.safeParse(body);

    const { paymentReference, notes } = validation.success ? validation.data : {};

    // Use findFirst with tenantId to prevent cross-tenant access
    const payrollRun = await prisma.payrollRun.findFirst({
      where: { id, tenantId },
    });

    if (!payrollRun) {
      return NextResponse.json({ error: 'Payroll run not found' }, { status: 404 });
    }

    if (payrollRun.status !== PayrollStatus.APPROVED) {
      return NextResponse.json({
        error: 'Can only mark APPROVED payroll runs as paid',
        currentStatus: payrollRun.status,
      }, { status: 400 });
    }

    const updatedRun = await prisma.$transaction(async (tx) => {
      const run = await tx.payrollRun.update({
        where: { id },
        data: {
          status: PayrollStatus.PAID,
          paidById: currentUserId,
          paidAt: new Date(),
          paymentReference,
        },
      });

      // Mark all payslips as paid
      await tx.payslip.updateMany({
        where: { payrollRunId: id },
        data: {
          isPaid: true,
          paidAt: new Date(),
        },
      });

      await tx.payrollHistory.create({
        data: {
          payrollRunId: id,
          action: 'PAID',
          previousStatus: PayrollStatus.APPROVED,
          newStatus: PayrollStatus.PAID,
          notes: notes || (paymentReference ? `Payment Ref: ${paymentReference}` : undefined),
          performedById: currentUserId,
        },
      });

      return run;
    });

    await logAction(
      tenantId,
      currentUserId,
      ActivityActions.PAYROLL_RUN_PAID,
      'PayrollRun',
      id,
      {
        referenceNumber: payrollRun.referenceNumber,
        paymentReference,
      }
    );

    return NextResponse.json({ success: true, status: updatedRun.status });
}

export const POST = withErrorHandler(payPayrollHandler, { requireAdmin: true, requireModule: 'payroll' });
