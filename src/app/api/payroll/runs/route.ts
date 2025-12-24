import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { Role, PayrollStatus } from '@prisma/client';
import { prisma } from '@/lib/core/prisma';
import { createPayrollRunSchema, payrollRunQuerySchema } from '@/lib/validations/payroll';
import { logAction, ActivityActions } from '@/lib/activity';
import {
  generatePayrollReference,
  getPeriodStartDate,
  getPeriodEndDate,
  parseDecimal
} from '@/lib/payroll/utils';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can view payroll runs
    if (session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());

    const validation = payrollRunQuerySchema.safeParse(queryParams);
    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid query parameters',
        details: validation.error.issues,
      }, { status: 400 });
    }

    const { year, status, p, ps } = validation.data;
    const page = p;
    const pageSize = ps;

    // Build where clause
    const where: Record<string, unknown> = {};

    if (year) {
      where.year = year;
    }

    if (status) {
      where.status = status;
    }

    const [runs, total] = await Promise.all([
      prisma.payrollRun.findMany({
        where,
        include: {
          createdBy: { select: { id: true, name: true } },
          submittedBy: { select: { id: true, name: true } },
          approvedBy: { select: { id: true, name: true } },
          processedBy: { select: { id: true, name: true } },
          paidBy: { select: { id: true, name: true } },
          _count: { select: { payslips: true } },
        },
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.payrollRun.count({ where }),
    ]);

    // Transform decimals
    const transformed = runs.map(run => ({
      ...run,
      totalGross: parseDecimal(run.totalGross),
      totalDeductions: parseDecimal(run.totalDeductions),
      totalNet: parseDecimal(run.totalNet),
    }));

    return NextResponse.json({
      runs: transformed,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
        hasMore: page * pageSize < total,
      },
    });
  } catch (error) {
    console.error('Payroll runs GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payroll runs' },
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
    const validation = createPayrollRunSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid request body',
        details: validation.error.issues,
      }, { status: 400 });
    }

    const { year, month } = validation.data;

    // Check if payroll run already exists for this period
    const existing = await prisma.payrollRun.findUnique({
      where: { year_month: { year, month } },
    });

    if (existing) {
      return NextResponse.json({
        error: `Payroll run for ${month}/${year} already exists`,
        existingId: existing.id,
      }, { status: 400 });
    }

    // Get all employees with active salary structures
    const salaryStructures = await prisma.salaryStructure.findMany({
      where: { isActive: true },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            hrProfile: {
              select: {
                bankName: true,
                iban: true,
                qidNumber: true,
              },
            },
          },
        },
      },
    });

    if (salaryStructures.length === 0) {
      return NextResponse.json({
        error: 'No employees with active salary structures found',
      }, { status: 400 });
    }

    // Calculate totals
    let totalGross = 0;
    let totalDeductions = 0;

    for (const salary of salaryStructures) {
      totalGross += parseDecimal(salary.grossSalary);
      // Deductions will be calculated later when payroll is processed
    }

    const totalNet = totalGross - totalDeductions;

    // Generate reference number
    const lastPayroll = await prisma.payrollRun.findFirst({
      where: { year, month },
      orderBy: { referenceNumber: 'desc' },
    });

    let sequence = 1;
    if (lastPayroll) {
      const match = lastPayroll.referenceNumber.match(/PAY-\d{4}-\d{2}-(\d{3})/);
      if (match) {
        sequence = parseInt(match[1], 10) + 1;
      }
    }

    const referenceNumber = generatePayrollReference(year, month, sequence);
    const periodStart = getPeriodStartDate(year, month);
    const periodEnd = getPeriodEndDate(year, month);

    // Create payroll run with history
    const payrollRun = await prisma.$transaction(async (tx) => {
      const run = await tx.payrollRun.create({
        data: {
          referenceNumber,
          year,
          month,
          periodStart,
          periodEnd,
          status: PayrollStatus.DRAFT,
          totalGross,
          totalDeductions,
          totalNet,
          employeeCount: salaryStructures.length,
          createdById: session.user.id,
          tenantId: session.user.organizationId!,
        },
        include: {
          createdBy: { select: { id: true, name: true } },
        },
      });

      // Create history record
      await tx.payrollHistory.create({
        data: {
          payrollRunId: run.id,
          action: 'CREATED',
          newStatus: PayrollStatus.DRAFT,
          performedById: session.user.id,
        },
      });

      return run;
    });

    await logAction(
      session.user.id,
      ActivityActions.PAYROLL_RUN_CREATED,
      'PayrollRun',
      payrollRun.id,
      {
        referenceNumber,
        year,
        month,
        employeeCount: salaryStructures.length,
        totalGross,
      }
    );

    // Transform decimals for response
    const response = {
      ...payrollRun,
      totalGross: parseDecimal(payrollRun.totalGross),
      totalDeductions: parseDecimal(payrollRun.totalDeductions),
      totalNet: parseDecimal(payrollRun.totalNet),
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Payroll run POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create payroll run' },
      { status: 500 }
    );
  }
}
