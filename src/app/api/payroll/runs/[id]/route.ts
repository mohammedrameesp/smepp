import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { Role, PayrollStatus } from '@prisma/client';
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

    if (session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { id } = await params;

    const payrollRun = await prisma.payrollRun.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, name: true } },
        submittedBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
        processedBy: { select: { id: true, name: true } },
        paidBy: { select: { id: true, name: true } },
        payslips: {
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
                  },
                },
              },
            },
            deductions: true,
          },
        },
        history: {
          orderBy: { createdAt: 'desc' },
          include: {
            performedBy: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!payrollRun) {
      return NextResponse.json({ error: 'Payroll run not found' }, { status: 404 });
    }

    // Transform decimals
    const response = {
      ...payrollRun,
      totalGross: parseDecimal(payrollRun.totalGross),
      totalDeductions: parseDecimal(payrollRun.totalDeductions),
      totalNet: parseDecimal(payrollRun.totalNet),
      payslips: payrollRun.payslips.map(p => ({
        ...p,
        basicSalary: parseDecimal(p.basicSalary),
        housingAllowance: parseDecimal(p.housingAllowance),
        transportAllowance: parseDecimal(p.transportAllowance),
        foodAllowance: parseDecimal(p.foodAllowance),
        phoneAllowance: parseDecimal(p.phoneAllowance),
        otherAllowances: parseDecimal(p.otherAllowances),
        grossSalary: parseDecimal(p.grossSalary),
        totalDeductions: parseDecimal(p.totalDeductions),
        netSalary: parseDecimal(p.netSalary),
        deductions: p.deductions.map(d => ({
          ...d,
          amount: parseDecimal(d.amount),
        })),
      })),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Payroll run GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payroll run' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const payrollRun = await prisma.payrollRun.findUnique({
      where: { id },
    });

    if (!payrollRun) {
      return NextResponse.json({ error: 'Payroll run not found' }, { status: 404 });
    }

    // Can only delete DRAFT or CANCELLED payroll runs
    if (payrollRun.status !== PayrollStatus.DRAFT && payrollRun.status !== PayrollStatus.CANCELLED) {
      return NextResponse.json({
        error: 'Can only delete payroll runs in DRAFT or CANCELLED status',
      }, { status: 400 });
    }

    // Delete payroll run (cascade will delete payslips and history)
    await prisma.payrollRun.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Payroll run DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete payroll run' },
      { status: 500 }
    );
  }
}
