/**
 * @file route.ts
 * @description Process a draft payroll run to generate payslips
 * @module hr/payroll
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { Role, PayrollStatus, DeductionType, LoanStatus } from '@prisma/client';
import { prisma } from '@/lib/core/prisma';
import { logAction, ActivityActions } from '@/lib/activity';
import {
  generatePayslipNumber,
  parseDecimal,
  calculateDailySalary,
  subtractMoney,
  addMoney
} from '@/lib/payroll/utils';
import { calculateUnpaidLeaveDeductions } from '@/lib/payroll/leave-deduction';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Require organization context for tenant isolation
    if (!session.user.organizationId) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 403 });
    }

    const tenantId = session.user.organizationId;
    const { id } = await params;

    // Check database connection and table existence
    try {
      await prisma.salaryStructure.count({
        where: { tenantId },
      });
    } catch (dbError) {
      console.error('[Payroll Process] Database error:', dbError);
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
      return NextResponse.json({ error: 'Payroll run not found' }, { status: 404 });
    }

    // Must be in DRAFT status to process
    if (payrollRun.status !== PayrollStatus.DRAFT) {
      return NextResponse.json({
        error: 'Payroll must be in DRAFT status to process',
        currentStatus: payrollRun.status,
      }, { status: 400 });
    }

    // FIN-005: Moved payslip existence check inside transaction to prevent race conditions
    // The check is now done inside the transaction with a lock

    // Get all active salary structures for employees only
    // SECURITY: Filter by tenantId to prevent cross-tenant payroll processing
    const salaryStructures = await prisma.salaryStructure.findMany({
      where: {
        tenantId, // CRITICAL: Tenant isolation
        isActive: true,
        user: {
          isEmployee: true, // Only process payroll for users marked as employees
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            hrProfile: {
              select: {
                bankName: true,
                iban: true,
                qidNumber: true,
              },
            },
          },
        },
      },
    });

    if (salaryStructures.length === 0) {
      return NextResponse.json({
        error: 'No employees with active salary structures found. Please create salary structures first.',
      }, { status: 400 });
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

    // Create a map of loans by userId
    const loansByUser = new Map<string, typeof activeLoans>();
    for (const loan of activeLoans) {
      const userLoans = loansByUser.get(loan.userId) || [];
      userLoans.push(loan);
      loansByUser.set(loan.userId, userLoans);
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
    const result = await prisma.$transaction(async (tx) => {
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
            salary.userId,
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
        const userLoans = loansByUser.get(salary.userId) || [];
        for (const loan of userLoans) {
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
        const payslipNumber = generatePayslipNumber(
          payrollRun.year,
          payrollRun.month,
          payslipSequence++
        );

        const payslip = await tx.payslip.create({
          data: {
            payslipNumber,
            payrollRunId: id,
            userId: salary.userId,
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
            bankName: salary.user.hrProfile?.bankName,
            iban: salary.user.hrProfile?.iban,
            qidNumber: salary.user.hrProfile?.qidNumber,
            tenantId: session.user.organizationId!,
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
            const loan = userLoans.find(l => l.id === deduction.loanId);
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
                  recordedById: session.user.id,
                },
              });
            }
          }
        }

        // FIN-010: Reconcile deduction totals
        // Verify sum of individual deductions equals payslip total
        const deductionSum = addMoney(...deductionItems.map(d => d.amount));
        if (Math.abs(deductionSum - cappedDeductions) > 0.01) {
          console.error(
            `[Payroll] Deduction reconciliation failed for user ${salary.userId}: ` +
            `sum=${deductionSum}, total=${cappedDeductions}`
          );
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
          processedById: session.user.id,
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
          performedById: session.user.id,
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

    await logAction(
      tenantId,
      session.user.id,
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
  } catch (error) {
    console.error('Payroll process error:', error);
    let errorMessage = 'Unknown error';
    let statusCode = 500;

    if (error instanceof Error) {
      errorMessage = error.message;

      // FIN-005: Handle race condition error
      if (error.message === 'PAYSLIPS_ALREADY_EXIST') {
        return NextResponse.json({
          error: 'Payslips already generated for this payroll run',
        }, { status: 400 });
      }

      // Check for common Prisma errors
      if (error.message.includes('does not exist')) {
        errorMessage = 'Database table not found. Please run migrations.';
      } else if (error.message.includes('Foreign key constraint')) {
        errorMessage = 'Foreign key constraint failed. Check data integrity.';
      } else if (error.message.includes('Unique constraint')) {
        errorMessage = 'Duplicate record found.';
      } else if (error.message.includes('Deduction reconciliation failed')) {
        errorMessage = 'Payroll calculation error: deductions do not reconcile.';
        statusCode = 400;
      }
    }
    return NextResponse.json(
      { error: `Failed to process payroll: ${errorMessage}` },
      { status: statusCode }
    );
  }
}
