import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/core/prisma';
import { parseDecimal } from '@/lib/payroll/utils';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const loan = await prisma.employeeLoan.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        approvedBy: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
        repayments: {
          orderBy: { paymentDate: 'desc' },
          include: {
            recordedBy: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!loan) {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
    }

    // Non-admin users can only view their own loans
    if (session.user.role !== Role.ADMIN && loan.userId !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Transform decimals
    const response = {
      ...loan,
      principalAmount: parseDecimal(loan.principalAmount),
      totalAmount: parseDecimal(loan.totalAmount),
      monthlyDeduction: parseDecimal(loan.monthlyDeduction),
      totalPaid: parseDecimal(loan.totalPaid),
      remainingAmount: parseDecimal(loan.remainingAmount),
      repayments: loan.repayments.map(r => ({
        ...r,
        amount: parseDecimal(r.amount),
      })),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Loan GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch loan' },
      { status: 500 }
    );
  }
}
