/**
 * @file route.ts
 * @description Pause an active loan API
 * @module hr/payroll
 */
import { NextRequest, NextResponse } from 'next/server';
import { LoanStatus } from '@prisma/client';
import { prisma } from '@/lib/core/prisma';
import { logAction, ActivityActions } from '@/lib/core/activity';
import { withErrorHandler, APIContext } from '@/lib/http/handler';

async function pauseLoanHandler(request: NextRequest, context: APIContext) {
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

    if (loan.status !== LoanStatus.ACTIVE) {
      return NextResponse.json({
        error: 'Only active loans can be paused',
        currentStatus: loan.status,
      }, { status: 400 });
    }

    const updatedLoan = await prisma.employeeLoan.update({
      where: { id },
      data: { status: LoanStatus.PAUSED },
    });

    await logAction(
      tenantId,
      tenant!.userId,
      ActivityActions.LOAN_PAUSED,
      'EmployeeLoan',
      id,
      {
        loanNumber: loan.loanNumber,
        memberName: loan.member.name,
      }
    );

    return NextResponse.json(updatedLoan);
}

export const POST = withErrorHandler(pauseLoanHandler, { requireAdmin: true, requireModule: 'payroll' });
