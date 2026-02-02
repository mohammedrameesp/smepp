/**
 * @file route.ts
 * @description Resume a paused loan API
 * @module hr/payroll
 */
import { NextRequest, NextResponse } from 'next/server';
import { LoanStatus } from '@prisma/client';
import { TenantPrismaClient } from '@/lib/core/prisma-tenant';
import { logAction, ActivityActions } from '@/lib/core/activity';
import { withErrorHandler, APIContext } from '@/lib/http/handler';

async function resumeLoanHandler(request: NextRequest, context: APIContext) {
    const { tenant, params, prisma: tenantPrisma } = context;
    if (!tenant?.tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
    }
    const db = tenantPrisma as TenantPrismaClient;
    const tenantId = tenant.tenantId;
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    // Use findFirst with tenantId to prevent cross-tenant access
    const loan = await db.employeeLoan.findFirst({
      where: { id, tenantId },
      include: {
        member: { select: { name: true } },
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

    const updatedLoan = await db.employeeLoan.update({
      where: { id },
      data: { status: LoanStatus.ACTIVE },
    });

    await logAction(
      tenantId,
      tenant.userId,
      ActivityActions.LOAN_RESUMED,
      'EmployeeLoan',
      id,
      {
        loanNumber: loan.loanNumber,
        memberName: loan.member.name,
      }
    );

    return NextResponse.json(updatedLoan);
}

export const POST = withErrorHandler(resumeLoanHandler, { requireAdmin: true, requireModule: 'payroll' });

/* CODE REVIEW SUMMARY
 * Date: 2026-02-01
 * Reviewer: Claude
 * Status: Reviewed
 * Changes: Added review summary
 * Issues: None identified
 */
