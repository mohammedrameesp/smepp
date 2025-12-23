import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { Role, LoanStatus } from '@prisma/client';
import { prisma } from '@/lib/core/prisma';
import { createLoanSchema, loanQuerySchema } from '@/lib/validations/payroll';
import { logAction, ActivityActions } from '@/lib/activity';
import { generateLoanNumber, calculateLoanEndDate, parseDecimal } from '@/lib/payroll/utils';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());

    const validation = loanQuerySchema.safeParse(queryParams);
    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid query parameters',
        details: validation.error.issues,
      }, { status: 400 });
    }

    const { userId, status, type, p, ps } = validation.data;
    const page = p;
    const pageSize = ps;
    const isAdmin = session.user.role === Role.ADMIN;

    // Build where clause
    const where: Record<string, unknown> = {};

    // Non-admin users can only see their own loans
    if (!isAdmin) {
      where.userId = session.user.id;
    } else if (userId) {
      where.userId = userId;
    }

    if (status) {
      where.status = status;
    }

    if (type) {
      where.type = type;
    }

    const [loans, total] = await Promise.all([
      prisma.employeeLoan.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true } },
          approvedBy: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true } },
          _count: { select: { repayments: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.employeeLoan.count({ where }),
    ]);

    // Transform decimals
    const transformed = loans.map(loan => ({
      ...loan,
      principalAmount: parseDecimal(loan.principalAmount),
      totalAmount: parseDecimal(loan.totalAmount),
      monthlyDeduction: parseDecimal(loan.monthlyDeduction),
      totalPaid: parseDecimal(loan.totalPaid),
      remainingAmount: parseDecimal(loan.remainingAmount),
    }));

    return NextResponse.json({
      loans: transformed,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
        hasMore: page * pageSize < total,
      },
    });
  } catch (error) {
    console.error('Loans GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch loans' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validation = createLoanSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid request body',
        details: validation.error.issues,
      }, { status: 400 });
    }

    const data = validation.data;

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: data.userId },
      select: { id: true, name: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Generate loan number
    const lastLoan = await prisma.employeeLoan.findFirst({
      orderBy: { loanNumber: 'desc' },
    });

    let sequence = 1;
    if (lastLoan) {
      const match = lastLoan.loanNumber.match(/LOAN-(\d{5})/);
      if (match) {
        sequence = parseInt(match[1], 10) + 1;
      }
    }

    const loanNumber = generateLoanNumber(sequence);
    const startDate = new Date(data.startDate);
    const endDate = calculateLoanEndDate(startDate, data.installments);

    const loan = await prisma.employeeLoan.create({
      data: {
        loanNumber,
        userId: data.userId,
        type: data.type,
        description: data.description,
        principalAmount: data.principalAmount,
        totalAmount: data.principalAmount, // No interest for now
        monthlyDeduction: data.monthlyDeduction,
        totalPaid: 0,
        remainingAmount: data.principalAmount,
        startDate,
        endDate,
        installments: data.installments,
        status: LoanStatus.ACTIVE,
        approvedById: session.user.id,
        approvedAt: new Date(),
        notes: data.notes,
        createdById: session.user.id,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    await logAction(
      session.user.id,
      ActivityActions.LOAN_CREATED,
      'EmployeeLoan',
      loan.id,
      {
        loanNumber,
        userId: data.userId,
        userName: user.name,
        type: data.type,
        amount: data.principalAmount,
      }
    );

    // Transform decimals for response
    const response = {
      ...loan,
      principalAmount: parseDecimal(loan.principalAmount),
      totalAmount: parseDecimal(loan.totalAmount),
      monthlyDeduction: parseDecimal(loan.monthlyDeduction),
      totalPaid: parseDecimal(loan.totalPaid),
      remainingAmount: parseDecimal(loan.remainingAmount),
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Loan POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create loan' },
      { status: 500 }
    );
  }
}
