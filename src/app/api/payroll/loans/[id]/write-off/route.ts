import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { Role, LoanStatus } from '@prisma/client';
import { prisma } from '@/lib/core/prisma';
import { logAction, ActivityActions } from '@/lib/activity';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
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
      session.user.id,
      ActivityActions.LOAN_WRITTEN_OFF,
      'EmployeeLoan',
      id,
      {
        loanNumber: loan.loanNumber,
        userName: loan.user.name,
        remainingAmount,
      }
    );

    return NextResponse.json(updatedLoan);
  } catch (error) {
    console.error('Loan write-off error:', error);
    return NextResponse.json(
      { error: 'Failed to write off loan' },
      { status: 500 }
    );
  }
}
