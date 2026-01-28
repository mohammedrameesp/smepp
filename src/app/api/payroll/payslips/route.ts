/**
 * @file route.ts
 * @description Payslips listing API
 * @module hr/payroll
 */
import { NextRequest, NextResponse } from 'next/server';
import { TenantPrismaClient } from '@/lib/core/prisma-tenant';
import { payslipQuerySchema } from '@/features/payroll/validations/payroll';
import { parseDecimal } from '@/features/payroll/lib/utils';
import { withErrorHandler, APIContext } from '@/lib/http/handler';
import { buildManagerAccessFilter, applyManagerFilter } from '@/lib/access-control/manager-filter';

async function getPayslipsHandler(request: NextRequest, context: APIContext) {
    const { tenant, prisma: tenantPrisma } = context;
    if (!tenant?.tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
    }
    const db = tenantPrisma as TenantPrismaClient;
    const tenantId = tenant.tenantId;

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

    // Build access filter using centralized helper (handles admin/finance, manager, and regular user access)
    const accessFilter = await buildManagerAccessFilter(db, tenant, {
      domain: 'finance',
      requestedMemberId: userId,
    });

    // Build where clause with tenant filter and access filter
    const where: Record<string, unknown> = applyManagerFilter(accessFilter, { tenantId });

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
      db.payslip.findMany({
        where,
        include: {
          member: {
            select: {
              id: true,
              name: true,
              email: true,
              employeeCode: true,
              designation: true,
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
      db.payslip.count({ where }),
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
