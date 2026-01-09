/**
 * @file route.ts
 * @description Single loan details API
 * @module hr/payroll
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import { TenantPrismaClient } from '@/lib/core/prisma-tenant';
import { parseDecimal } from '@/lib/payroll/utils';
import { withErrorHandler, APIContext } from '@/lib/http/handler';

async function getLoanHandler(request: NextRequest, context: APIContext) {
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
    const loan = await db.employeeLoan.findFirst({
      where: { id, tenantId },
      include: {
        member: { select: { id: true, name: true, email: true } },
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
    const isOwnerOrAdmin = tenant.orgRole === 'OWNER' || tenant.orgRole === 'ADMIN';
    if (!isOwnerOrAdmin && loan.memberId !== tenant.userId) {
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
}

export const GET = withErrorHandler(getLoanHandler, { requireAuth: true, requireModule: 'payroll' });
