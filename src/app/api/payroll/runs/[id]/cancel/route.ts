import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { Role, PayrollStatus } from '@prisma/client';
import { prisma } from '@/lib/core/prisma';
import { logAction, ActivityActions } from '@/lib/activity';
import { rejectPayrollSchema } from '@/lib/validations/payroll';

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
    const body = await request.json();
    const validation = rejectPayrollSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid request body',
        details: validation.error.issues,
      }, { status: 400 });
    }

    const { reason } = validation.data;

    const payrollRun = await prisma.payrollRun.findUnique({
      where: { id },
    });

    if (!payrollRun) {
      return NextResponse.json({ error: 'Payroll run not found' }, { status: 404 });
    }

    // Cannot cancel PAID payrolls
    if (payrollRun.status === PayrollStatus.PAID) {
      return NextResponse.json({
        error: 'Cannot cancel a paid payroll run',
      }, { status: 400 });
    }

    const previousStatus = payrollRun.status;

    const updatedRun = await prisma.$transaction(async (tx) => {
      // If payroll was processed, need to reverse loan deductions
      if (payrollRun.status === PayrollStatus.PROCESSED) {
        // Get all payslips with loan deductions
        const payslips = await tx.payslip.findMany({
          where: { payrollRunId: id },
          include: {
            deductions: {
              where: { type: 'LOAN_REPAYMENT' },
            },
          },
        });

        // Reverse loan repayments
        for (const payslip of payslips) {
          for (const deduction of payslip.deductions) {
            if (deduction.loanId) {
              // Delete the loan repayment record
              await tx.loanRepayment.deleteMany({
                where: {
                  payslipId: payslip.id,
                  loanId: deduction.loanId,
                },
              });

              // Reverse loan amounts
              const loan = await tx.employeeLoan.findUnique({
                where: { id: deduction.loanId },
              });

              if (loan) {
                await tx.employeeLoan.update({
                  where: { id: loan.id },
                  data: {
                    totalPaid: { decrement: Number(deduction.amount) },
                    remainingAmount: { increment: Number(deduction.amount) },
                    installmentsPaid: { decrement: 1 },
                    status: 'ACTIVE',
                  },
                });
              }
            }
          }
        }

        // Delete all payslips and their deductions
        await tx.payslip.deleteMany({
          where: { payrollRunId: id },
        });
      }

      const run = await tx.payrollRun.update({
        where: { id },
        data: {
          status: PayrollStatus.CANCELLED,
        },
      });

      await tx.payrollHistory.create({
        data: {
          payrollRunId: id,
          action: 'CANCELLED',
          previousStatus,
          newStatus: PayrollStatus.CANCELLED,
          notes: reason,
          performedById: session.user.id,
        },
      });

      return run;
    });

    await logAction(
      session.user.id,
      ActivityActions.PAYROLL_RUN_CANCELLED,
      'PayrollRun',
      id,
      {
        referenceNumber: payrollRun.referenceNumber,
        reason,
        previousStatus,
      }
    );

    return NextResponse.json({ success: true, status: updatedRun.status });
  } catch (error) {
    console.error('Payroll cancel error:', error);
    return NextResponse.json(
      { error: 'Failed to cancel payroll' },
      { status: 500 }
    );
  }
}
