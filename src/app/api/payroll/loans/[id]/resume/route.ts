/**
 * @file route.ts
 * @description Resume a paused loan API
 * @module hr/payroll
 */
import { NextRequest, NextResponse } from 'next/server';
import { LoanStatus } from '@prisma/client';
import { prisma } from '@/lib/core/prisma';
import { logAction, ActivityActions } from '@/lib/activity';
import { withErrorHandler, APIContext } from '@/lib/http/handler';

async function resumeLoanHandler(request: NextRequest, context: APIContext) {
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
        user: { select: { name: true } },
      },
    });

    if (!loan) {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
    }

    if (loan.status !== LoanStatus.PAUSED) {
      return NextResponse.json({
        error: 'Only paused loans can be resumed',
        currentStatus: loan.status,
      }, { status: 400 });
    }

    const updatedLoan = await prisma.employeeLoan.update({
      where: { id },
      data: { status: LoanStatus.ACTIVE },
    });

    await logAction(
      tenantId,
      tenant!.userId,
      ActivityActions.LOAN_RESUMED,
      'EmployeeLoan',
      id,
      {
        loanNumber: loan.loanNumber,
        userName: loan.user.name,
      }
    );

    return NextResponse.json(updatedLoan);
}

export const POST = withErrorHandler(resumeLoanHandler, { requireAdmin: true, requireModule: 'payroll' });
