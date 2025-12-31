/**
 * @file route.ts
 * @description Payslips listing API
 * @module hr/payroll
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import { payslipQuerySchema } from '@/lib/validations/payroll';
import { parseDecimal } from '@/lib/payroll/utils';
import { withErrorHandler, APIContext } from '@/lib/http/handler';

async function getPayslipsHandler(request: NextRequest, context: APIContext) {
    const { tenant } = context;
    const tenantId = tenant!.tenantId;

    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());

    const validation = payslipQuerySchema.safeParse(queryParams);
    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid query parameters',
        details: validation.error.issues,
      }, { status: 400 });
    }

    const { payrollRunId, userId, year, month, p, ps } = validation.data;
    const page = p;
    const pageSize = ps;
    const isAdmin = tenant!.userRole === 'ADMIN';

    // Build where clause with tenant filter
    const where: Record<string, unknown> = { tenantId };

    // Non-admin users can only see their own payslips
    if (!isAdmin) {
      where.userId = tenant!.userId;
    } else if (userId) {
      where.userId = userId;
    }

    if (payrollRunId) {
      where.payrollRunId = payrollRunId;
    }

    if (year || month) {
      where.payrollRun = {};
      if (year) {
        (where.payrollRun as Record<string, unknown>).year = year;
      }
      if (month) {
        (where.payrollRun as Record<string, unknown>).month = month;
      }
    }

    const [payslips, total] = await Promise.all([
      prisma.payslip.findMany({
        where,
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
          payrollRun: {
            select: {
              id: true,
              referenceNumber: true,
              year: true,
              month: true,
              status: true,
            },
          },
          deductions: true,
        },
        orderBy: [
          { payrollRun: { year: 'desc' } },
          { payrollRun: { month: 'desc' } },
          { createdAt: 'desc' },
        ],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.payslip.count({ where }),
    ]);

    // Transform decimals
    const transformed = payslips.map(p => ({
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
    }));

    return NextResponse.json({
      payslips: transformed,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
        hasMore: page * pageSize < total,
      },
    });
}

export const GET = withErrorHandler(getPayslipsHandler, { requireAuth: true, requireModule: 'payroll' });
