/**
 * @file route.ts
 * @description Single payslip details API
 * @module hr/payroll
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import { parseDecimal } from '@/lib/payroll/utils';
import { withErrorHandler, APIContext } from '@/lib/http/handler';

async function getPayslipHandler(request: NextRequest, context: APIContext) {
    const { tenant, params } = context;
    const tenantId = tenant!.tenantId;
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    // Use findFirst with tenantId to prevent IDOR attacks
    const payslip = await prisma.payslip.findFirst({
      where: { id, tenantId },
      include: {
        member: {
          select: {
            id: true,
            name: true,
            email: true,
            employeeCode: true,
            designation: true,
            dateOfJoining: true,
            bankName: true,
            iban: true,
            qidNumber: true,
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
    if (tenant!.orgRole !== 'ADMIN' && payslip.memberId !== tenant!.userId) {
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
}

export const GET = withErrorHandler(getPayslipHandler, { requireAuth: true, requireModule: 'payroll' });
