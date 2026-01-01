/**
 * @file route.ts
 * @description Write off a loan API
 * @module hr/payroll
 */
import { NextRequest, NextResponse } from 'next/server';
import { LoanStatus } from '@prisma/client';
import { prisma } from '@/lib/core/prisma';
import { logAction, ActivityActions } from '@/lib/activity';
import { withErrorHandler, APIContext } from '@/lib/http/handler';

async function writeOffLoanHandler(request: NextRequest, context: APIContext) {
    const { tenant, params } = context;
    const tenantId = tenant!.tenantId;
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    // Use findFirst with tenantId to prevent cross-tenant access
    const loan = await prisma.employeeLoan.findFirst({
      where: { id, tenantId },
      include: {
        member: { select: { name: true } },
      },
    });

    if (!loan) {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
    }

    if (loan.status === LoanStatus.COMPLETED || loan.status === LoanStatus.WRITTEN_OFF) {
      return NextResponse.json({
        error: 'Loan is already completed or written off',
        currentStatus: loan.status,
      }, { status: 400 });
    }

    const remainingAmount = Number(loan.remainingAmount);

    const updatedLoan = await prisma.employeeLoan.update({
      where: { id },
      data: {
        status: LoanStatus.WRITTEN_OFF,
      },
    });

    await logAction(
      tenantId,
      tenant!.userId,
      ActivityActions.LOAN_WRITTEN_OFF,
      'EmployeeLoan',
      id,
      {
        loanNumber: loan.loanNumber,
        memberName: loan.member.name,
        remainingAmount,
      }
    );

    return NextResponse.json(updatedLoan);
}

export const POST = withErrorHandler(writeOffLoanHandler, { requireAdmin: true, requireModule: 'payroll' });
