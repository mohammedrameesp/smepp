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

    const payslip = await prisma.payslip.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            hrProfile: {
              select: {
                employeeId: true,
                designation: true,
                dateOfJoining: true,
                bankName: true,
                iban: true,
                qidNumber: true,
              },
            },
          },
        },
        payrollRun: {
          select: {
            id: true,
            referenceNumber: true,
            year: true,
            month: true,
            status: true,
            periodStart: true,
            periodEnd: true,
          },
        },
        deductions: true,
      },
    });

    if (!payslip) {
      return NextResponse.json({ error: 'Payslip not found' }, { status: 404 });
    }

    // Non-admin users can only view their own payslips
    if (session.user.role !== Role.ADMIN && payslip.userId !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Transform decimals
    const response = {
      ...payslip,
      basicSalary: parseDecimal(payslip.basicSalary),
      housingAllowance: parseDecimal(payslip.housingAllowance),
      transportAllowance: parseDecimal(payslip.transportAllowance),
      foodAllowance: parseDecimal(payslip.foodAllowance),
      phoneAllowance: parseDecimal(payslip.phoneAllowance),
      otherAllowances: parseDecimal(payslip.otherAllowances),
      grossSalary: parseDecimal(payslip.grossSalary),
      totalDeductions: parseDecimal(payslip.totalDeductions),
      netSalary: parseDecimal(payslip.netSalary),
      deductions: payslip.deductions.map(d => ({
        ...d,
        amount: parseDecimal(d.amount),
      })),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Payslip GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payslip' },
      { status: 500 }
    );
  }
}
