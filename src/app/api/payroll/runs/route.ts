/**
 * @file route.ts
 * @description Payroll runs listing and creation API
 * @module hr/payroll
 */
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { PayrollStatus } from '@prisma/client';
import { prisma } from '@/lib/core/prisma';
import { createPayrollRunSchema, payrollRunQuerySchema } from '@/features/payroll/validations/payroll';
import { logAction, ActivityActions } from '@/lib/core/activity';
import { withErrorHandler } from '@/lib/http/handler';
import {
  generatePayrollReferenceWithPrefix,
  getPeriodStartDate,
  getPeriodEndDate,
  parseDecimal
} from '@/features/payroll/lib/utils';

export const GET = withErrorHandler(
  async (request, { prisma: tenantPrisma }) => {
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

    // Build where clause - tenantId filtering handled by tenant-scoped prisma
    const where: Record<string, unknown> = {};

    if (year) {
      where.year = year;
    }

    if (status) {
      where.status = status;
    }

    const [runs, total] = await Promise.all([
      tenantPrisma.payrollRun.findMany({
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
      tenantPrisma.payrollRun.count({ where }),
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
  },
  {
    requireAuth: true,
    requireAdmin: true,
    requireModule: 'payroll',
    rateLimit: true,
  }
);

export const POST = withErrorHandler(
  async (request, { prisma: tenantPrisma, tenant }) => {
    const session = await getServerSession(authOptions);

    const body = await request.json();
    const validation = createPayrollRunSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid request body',
        details: validation.error.issues,
      }, { status: 400 });
    }

    const { year, month } = validation.data;

    // Check if payroll run already exists for this period (tenant-scoped)
    const existing = await tenantPrisma.payrollRun.findFirst({
      where: { year, month },
    });

    if (existing) {
      return NextResponse.json({
        error: `Payroll run for ${month}/${year} already exists`,
        existingId: existing.id,
      }, { status: 400 });
    }

    // Get all employees with active salary structures (tenant-scoped)
    const salaryStructures = await tenantPrisma.salaryStructure.findMany({
      where: {
        isActive: true,
      },
      include: {
        member: {
          select: {
            id: true,
            name: true,
            bankName: true,
            iban: true,
            qidNumber: true,
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
    const totalDeductions = 0;

    for (const salary of salaryStructures) {
      totalGross += parseDecimal(salary.grossSalary);
      // Deductions will be calculated later when payroll is processed
    }

    const totalNet = totalGross - totalDeductions;

    // Generate reference number (tenant-scoped)
    const lastPayroll = await tenantPrisma.payrollRun.findFirst({
      where: { year },
      orderBy: { referenceNumber: 'desc' },
    });

    let sequence = 1;
    if (lastPayroll) {
      const match = lastPayroll.referenceNumber.match(/PAY-\d{4}-\d{2}-(\d{3})/);
      if (match) {
        sequence = parseInt(match[1], 10) + 1;
      }
    }

    const referenceNumber = await generatePayrollReferenceWithPrefix(tenant!.tenantId, year, month, sequence);
    const periodStart = getPeriodStartDate(year, month);
    const periodEnd = getPeriodEndDate(year, month);

    // Create payroll run with history (use global prisma for transaction)
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
          createdById: session!.user.id,
          tenantId: tenant!.tenantId,
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
          performedById: session!.user.id,
        },
      });

      return run;
    });

    await logAction(
      tenant!.tenantId,
      session!.user.id,
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
  },
  {
    requireAuth: true,
    requireAdmin: true,
    requireModule: 'payroll',
    rateLimit: true,
  }
);
