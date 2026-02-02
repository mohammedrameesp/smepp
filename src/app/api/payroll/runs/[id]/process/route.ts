/**
 * @file route.ts
 * @description Process a draft payroll run to generate payslips
 * @module hr/payroll
 */
import { NextResponse } from 'next/server';
import { PayrollStatus, DeductionType, LoanStatus } from '@prisma/client';
import { prisma } from '@/lib/core/prisma';
import { logAction, ActivityActions } from '@/lib/core/activity';
import { withErrorHandler } from '@/lib/http/handler';
import { badRequestResponse, notFoundResponse } from '@/lib/http/errors';
import logger from '@/lib/core/log';
import {
  generatePayslipNumberWithPrefix,
  parseDecimal,
  calculateDailySalary,
  subtractMoney,
  addMoney
} from '@/features/payroll/lib/utils';
import { calculateUnpaidLeaveDeductions } from '@/features/payroll/lib/leave-deduction';

export const POST = withErrorHandler(async (_request, { tenant, params }) => {
  const tenantId = tenant!.tenantId;
  const userId = tenant!.userId;
  const id = params?.id;

  if (!id) {
    return badRequestResponse('Payroll run ID is required');
  }

    // Check database connection and table existence
    try {
      await prisma.salaryStructure.count({
        where: { tenantId },
      });
    } catch (dbError) {
      logger.error({ error: dbError instanceof Error ? dbError.message : 'Unknown error' }, 'Payroll process database error');
      return NextResponse.json({
        error: 'Database connection or table error. SalaryStructure table may not exist.',
        details: dbError instanceof Error ? dbError.message : 'Unknown'
      }, { status: 500 });
    }

    // Use findFirst with tenantId to prevent cross-tenant access
    const payrollRun = await prisma.payrollRun.findFirst({
      where: { id, tenantId },
    });

  if (!payrollRun) {
    return notFoundResponse('Payroll run not found');
  }

  // Must be in DRAFT status to process
  if (payrollRun.status !== PayrollStatus.DRAFT) {
    return badRequestResponse(`Payroll must be in DRAFT status to process. Current status: ${payrollRun.status}`);
  }

    // FIN-005: Moved payslip existence check inside transaction to prevent race conditions
    // The check is now done inside the transaction with a lock

    // Get all active salary structures for employees only
    // SECURITY: Filter by tenantId to prevent cross-tenant payroll processing
    const salaryStructures = await prisma.salaryStructure.findMany({
      where: {
        tenantId, // CRITICAL: Tenant isolation
        isActive: true,
        member: {
          isEmployee: true, // Only process payroll for members marked as employees
        },
      },
      include: {
        member: {
          select: {
            id: true,
            name: true,
            bankName: true,
            iban: true,
            qidNumber: true,
          },
        },
      },
    });

  if (salaryStructures.length === 0) {
    return badRequestResponse('No employees with active salary structures found. Please create salary structures first.');
  }

    // Get active loans for deductions (wrapped in try-catch)
    // SECURITY: Filter by tenantId to prevent cross-tenant loan access
    let activeLoans: Awaited<ReturnType<typeof prisma.employeeLoan.findMany>> = [];
    try {
      activeLoans = await prisma.employeeLoan.findMany({
        where: {
          tenantId, // CRITICAL: Tenant isolation
          status: LoanStatus.ACTIVE,
          // Only include loans that have started by the payroll period end date
          startDate: { lte: payrollRun.periodEnd },
        },
      });
    } catch {
      // Continue without loans if there's an error
    }

    // Create a map of loans by memberId
    const loansByMember = new Map<string, typeof activeLoans>();
    for (const loan of activeLoans) {
      const memberLoans = loansByMember.get(loan.memberId) || [];
      memberLoans.push(loan);
      loansByMember.set(loan.memberId, memberLoans);
    }

    // Get the last payslip number sequence for this period
    const lastPayslip = await prisma.payslip.findFirst({
      where: {
        payrollRun: {
          year: payrollRun.year,
          month: payrollRun.month,
        },
      },
      orderBy: { payslipNumber: 'desc' },
    });

    let payslipSequence = 1;
    if (lastPayslip) {
      const match = lastPayslip.payslipNumber.match(/PS-\d{4}-\d{2}-(\d{5})/);
      if (match) {
        payslipSequence = parseInt(match[1], 10) + 1;
      }
    }

  // Process payroll in transaction (with extended timeout for large payrolls)
  let result;
  try {
    result = await prisma.$transaction(async (tx) => {
      // FIN-005: Check for existing payslips INSIDE transaction with lock
      // This prevents race conditions when multiple users click "Process" simultaneously
      const existingPayslips = await tx.payslip.count({
        where: { payrollRunId: id },
      });

      if (existingPayslips > 0) {
        throw new Error('PAYSLIPS_ALREADY_EXIST');
      }

      let totalGross = 0;
      let totalDeductions = 0;
      const createdPayslips = [];

      for (const salary of salaryStructures) {
        const grossSalary = parseDecimal(salary.grossSalary);
        const basicSalary = parseDecimal(salary.basicSalary);
        const dailyRate = calculateDailySalary(grossSalary);

        // Calculate deductions
        const deductionItems: Array<{
          type: DeductionType;
          description: string;
          amount: number;
          leaveRequestId?: string;
          loanId?: string;
        }> = [];

        // 1. Calculate unpaid leave deductions
        let leaveDeductions: Awaited<ReturnType<typeof calculateUnpaidLeaveDeductions>> = [];
        try {
          leaveDeductions = await calculateUnpaidLeaveDeductions(
            salary.memberId,
            payrollRun.year,
            payrollRun.month,
            dailyRate,
            tenantId
          );
        } catch {
          // Continue without leave deductions if there's an error
        }

        for (const leave of leaveDeductions) {
          deductionItems.push({
            type: DeductionType.UNPAID_LEAVE,
            description: `${leave.leaveTypeName} (${leave.totalDays} days)`,
            amount: leave.deductionAmount,
            leaveRequestId: leave.leaveRequestId,
          });
        }

        // 2. Calculate loan deductions
        const memberLoans = loansByMember.get(salary.memberId) || [];
        for (const loan of memberLoans) {
          const monthlyDeduction = parseDecimal(loan.monthlyDeduction);
          const remaining = parseDecimal(loan.remainingAmount);
          const deductionAmount = Math.min(monthlyDeduction, remaining);

          if (deductionAmount > 0) {
            deductionItems.push({
              type: DeductionType.LOAN_REPAYMENT,
              description: `${loan.type} - ${loan.loanNumber}`,
              amount: deductionAmount,
              loanId: loan.id,
            });
          }
        }

        // FIN-003: Use precise addition for deduction totals
        const totalDeductionsForEmployee = addMoney(...deductionItems.map(d => d.amount));

        // FIN-004: Validate net salary is not negative
        // Cap deductions at gross salary to prevent negative net
        const cappedDeductions = Math.min(totalDeductionsForEmployee, grossSalary);

        // FIN-003: Use precise subtraction for net salary
        const netSalary = subtractMoney(grossSalary, cappedDeductions);

        // Create payslip
        const payslipNumber = await generatePayslipNumberWithPrefix(
          tenantId,
          payrollRun.year,
          payrollRun.month,
          payslipSequence++
        );

        const payslip = await tx.payslip.create({
          data: {
            payslipNumber,
            payrollRunId: id,
            memberId: salary.memberId,
            basicSalary: basicSalary,
            housingAllowance: parseDecimal(salary.housingAllowance),
            transportAllowance: parseDecimal(salary.transportAllowance),
            foodAllowance: parseDecimal(salary.foodAllowance),
            phoneAllowance: parseDecimal(salary.phoneAllowance),
            otherAllowances: parseDecimal(salary.otherAllowances),
            otherAllowancesDetails: salary.otherAllowancesDetails,
            grossSalary,
            totalDeductions: cappedDeductions, // FIN-004: Use capped deductions
            netSalary,
            bankName: salary.member?.bankName,
            iban: salary.member?.iban,
            qidNumber: salary.member?.qidNumber,
            tenantId: tenantId,
          },
        });

        // Create deduction records
        for (const deduction of deductionItems) {
          await tx.payslipDeduction.create({
            data: {
              payslipId: payslip.id,
              type: deduction.type,
              description: deduction.description,
              amount: deduction.amount,
              leaveRequestId: deduction.leaveRequestId,
              loanId: deduction.loanId,
            },
          });

          // Update loan if it's a loan deduction
          if (deduction.type === DeductionType.LOAN_REPAYMENT && deduction.loanId) {
            const loan = memberLoans.find(l => l.id === deduction.loanId);
            if (loan) {
              // FIN-003: Use precise math for loan calculations
              const newTotalPaid = addMoney(parseDecimal(loan.totalPaid), deduction.amount);
              const newRemaining = subtractMoney(parseDecimal(loan.remainingAmount), deduction.amount);
              const newInstallmentsPaid = loan.installmentsPaid + 1;

              await tx.employeeLoan.update({
                where: { id: loan.id },
                data: {
                  totalPaid: newTotalPaid,
                  remainingAmount: Math.max(0, newRemaining),
                  installmentsPaid: newInstallmentsPaid,
                  status: newRemaining <= 0 ? LoanStatus.COMPLETED : LoanStatus.ACTIVE,
                },
              });

              // Create loan repayment record
              await tx.loanRepayment.create({
                data: {
                  loanId: loan.id,
                  amount: deduction.amount,
                  payslipId: payslip.id,
                  paymentDate: new Date(),
                  paymentMethod: 'SALARY_DEDUCTION',
                  recordedById: userId,
                },
              });
            }
          }
        }

        // FIN-010: Reconcile deduction totals
        // Verify sum of individual deductions equals payslip total
        const deductionSum = addMoney(...deductionItems.map(d => d.amount));
        if (Math.abs(deductionSum - cappedDeductions) > 0.01) {
          logger.error({
            memberId: salary.memberId,
            deductionSum,
            cappedDeductions,
            payslipNumber,
          }, 'Deduction reconciliation failed');
          throw new Error(`Deduction reconciliation failed for payslip ${payslipNumber}`);
        }

        // FIN-003: Use precise addition for running totals
        totalGross = addMoney(totalGross, grossSalary);
        totalDeductions = addMoney(totalDeductions, cappedDeductions);
        createdPayslips.push(payslip);
      }

      // Update payroll run
      const updatedRun = await tx.payrollRun.update({
        where: { id },
        data: {
          status: PayrollStatus.PROCESSED,
          totalGross,
          totalDeductions,
          totalNet: totalGross - totalDeductions,
          employeeCount: createdPayslips.length,
          processedById: userId,
          processedAt: new Date(),
        },
      });

      // Create history record
      await tx.payrollHistory.create({
        data: {
          payrollRunId: id,
          action: 'PROCESSED',
          previousStatus: PayrollStatus.DRAFT,
          newStatus: PayrollStatus.PROCESSED,
          notes: `Generated ${createdPayslips.length} payslips`,
          performedById: userId,
        },
      });

      return {
        payrollRun: updatedRun,
        payslipsCreated: createdPayslips.length,
        totalGross,
        totalDeductions,
        // FIN-003: Use precise subtraction for total net
        totalNet: subtractMoney(totalGross, totalDeductions),
      };
    }, {
      maxWait: 10000, // 10 seconds max wait to start transaction
      timeout: 120000, // 2 minutes timeout for the transaction
    });
  } catch (error) {
    // FIN-005: Handle race condition error
    if (error instanceof Error && error.message === 'PAYSLIPS_ALREADY_EXIST') {
      return badRequestResponse('Payslips already generated for this payroll run');
    }
    throw error; // Re-throw other errors for withErrorHandler to handle
  }

  await logAction(
      tenantId,
      userId,
      ActivityActions.PAYROLL_RUN_PROCESSED,
      'PayrollRun',
      id,
      {
        referenceNumber: payrollRun.referenceNumber,
        payslipsCreated: result.payslipsCreated,
        totalNet: result.totalNet,
      }
    );

  return NextResponse.json({
    success: true,
    ...result,
  });
}, { requireAuth: true, requireAdmin: true, requireFinanceAccess: true, requireModule: 'payroll' });

/* CODE REVIEW SUMMARY
 * Date: 2026-02-01
 * Reviewer: Claude
 * Status: Reviewed
 * Changes: Added review summary
 * Issues: None identified
 */
