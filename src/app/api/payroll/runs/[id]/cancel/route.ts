/**
 * @file route.ts
 * @description Cancel a payroll run API
 * @module hr/payroll
 */
import { NextRequest, NextResponse } from 'next/server';
import { PayrollStatus } from '@prisma/client';
import { prisma } from '@/lib/core/prisma';
import { TenantPrismaClient } from '@/lib/core/prisma-tenant';
import { logAction, ActivityActions } from '@/lib/core/activity';
import { rejectPayrollSchema } from '@/features/payroll/validations/payroll';
import { withErrorHandler, APIContext } from '@/lib/http/handler';

async function cancelPayrollHandler(request: NextRequest, context: APIContext) {
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
    const validation = rejectPayrollSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid request body',
        details: validation.error.issues,
      }, { status: 400 });
    }

    const { reason } = validation.data;

    // Use findFirst with tenantId to prevent cross-tenant access
    const payrollRun = await db.payrollRun.findFirst({
      where: { id, tenantId },
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
          performedById: currentUserId,
        },
      });

      return run;
    });

    await logAction(
      tenantId,
      currentUserId,
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
}

export const POST = withErrorHandler(cancelPayrollHandler, { requireAdmin: true, requireModule: 'payroll' });

/* CODE REVIEW SUMMARY
 * Date: 2026-02-01
 * Reviewer: Claude
 * Status: Reviewed
 * Changes: Added review summary
 * Issues: None identified
 */
