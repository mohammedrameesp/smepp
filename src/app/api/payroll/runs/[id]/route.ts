/**
 * @file route.ts
 * @description Single payroll run details and deletion API
 * @module hr/payroll
 */
import { NextRequest, NextResponse } from 'next/server';
import { PayrollStatus } from '@prisma/client';
import { TenantPrismaClient } from '@/lib/core/prisma-tenant';
import { parseDecimal } from '@/features/payroll/lib/utils';
import { withErrorHandler, APIContext } from '@/lib/http/handler';

async function getPayrollRunHandler(request: NextRequest, context: APIContext) {
    const { tenant, params, prisma: tenantPrisma } = context;
    if (!tenant?.tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
    }
    const db = tenantPrisma as TenantPrismaClient;
    const tenantId = tenant.tenantId;
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    // Use findFirst with tenantId to prevent cross-tenant access
    const payrollRun = await db.payrollRun.findFirst({
      where: { id, tenantId },
      include: {
        createdBy: { select: { id: true, name: true } },
        submittedBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
        processedBy: { select: { id: true, name: true } },
        paidBy: { select: { id: true, name: true } },
        payslips: {
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
}

export const GET = withErrorHandler(getPayrollRunHandler, { requireAdmin: true, requireModule: 'payroll' });

async function deletePayrollRunHandler(request: NextRequest, context: APIContext) {
    const { tenant, params, prisma: tenantPrisma } = context;
    if (!tenant?.tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
    }
    const db = tenantPrisma as TenantPrismaClient;
    const tenantId = tenant.tenantId;
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    // Use findFirst with tenantId to prevent cross-tenant access
    const payrollRun = await db.payrollRun.findFirst({
      where: { id, tenantId },
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
    await db.payrollRun.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
}

export const DELETE = withErrorHandler(deletePayrollRunHandler, { requireAdmin: true, requireModule: 'payroll' });
