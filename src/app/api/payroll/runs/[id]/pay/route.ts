import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { Role, PayrollStatus } from '@prisma/client';
import { prisma } from '@/lib/core/prisma';
import { logAction, ActivityActions } from '@/lib/activity';
import { markPaidSchema } from '@/lib/validations/payroll';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const validation = markPaidSchema.safeParse(body);

    const { paymentReference, notes } = validation.success ? validation.data : {};

    const payrollRun = await prisma.payrollRun.findUnique({
      where: { id },
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
          paidById: session.user.id,
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
          performedById: session.user.id,
        },
      });

      return run;
    });

    await logAction(
      session.user.id,
      ActivityActions.PAYROLL_RUN_PAID,
      'PayrollRun',
      id,
      {
        referenceNumber: payrollRun.referenceNumber,
        paymentReference,
      }
    );

    return NextResponse.json({ success: true, status: updatedRun.status });
  } catch (error) {
    console.error('Payroll pay error:', error);
    return NextResponse.json(
      { error: 'Failed to mark payroll as paid' },
      { status: 500 }
    );
  }
}
