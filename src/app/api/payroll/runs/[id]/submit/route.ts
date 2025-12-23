import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { Role, PayrollStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { logAction, ActivityActions } from '@/lib/activity';
import { submitPayrollSchema } from '@/lib/validations/payroll';

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
    const validation = submitPayrollSchema.safeParse(body);

    const notes = validation.success ? validation.data.notes : undefined;

    const payrollRun = await prisma.payrollRun.findUnique({
      where: { id },
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
          submittedById: session.user.id,
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
          performedById: session.user.id,
        },
      });

      return run;
    });

    await logAction(
      session.user.id,
      ActivityActions.PAYROLL_RUN_SUBMITTED,
      'PayrollRun',
      id,
      { referenceNumber: payrollRun.referenceNumber }
    );

    return NextResponse.json({ success: true, status: updatedRun.status });
  } catch (error) {
    console.error('Payroll submit error:', error);
    return NextResponse.json(
      { error: 'Failed to submit payroll' },
      { status: 500 }
    );
  }
}
