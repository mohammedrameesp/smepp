import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { Role, LoanStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
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

    const { id } = await params;

    const loan = await prisma.employeeLoan.findUnique({
      where: { id },
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
      session.user.id,
      ActivityActions.LOAN_RESUMED,
      'EmployeeLoan',
      id,
      {
        loanNumber: loan.loanNumber,
        userName: loan.user.name,
      }
    );

    return NextResponse.json(updatedLoan);
  } catch (error) {
    console.error('Loan resume error:', error);
    return NextResponse.json(
      { error: 'Failed to resume loan' },
      { status: 500 }
    );
  }
}
