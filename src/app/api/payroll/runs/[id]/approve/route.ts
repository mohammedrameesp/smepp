/**
 * @file route.ts
 * @description Approve a submitted payroll run API
 * @module hr/payroll
 */
import { NextRequest, NextResponse } from 'next/server';
import { PayrollStatus } from '@prisma/client';
import { prisma } from '@/lib/core/prisma';
import { TenantPrismaClient } from '@/lib/core/prisma-tenant';
import { logAction, ActivityActions } from '@/lib/core/activity';
import { approvePayrollSchema } from '@/lib/validations/payroll';
import { withErrorHandler, APIContext } from '@/lib/http/handler';

async function approvePayrollHandler(request: NextRequest, context: APIContext) {
    const { tenant, params, prisma: tenantPrisma } = context;
    if (!tenant?.tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
    }
    const db = tenantPrisma as TenantPrismaClient;
    const tenantId = tenant.tenantId;
    const currentUserId = tenant.userId;
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const validation = approvePayrollSchema.safeParse(body);

    const notes = validation.success ? validation.data.notes : undefined;

    // Use findFirst with tenantId to prevent cross-tenant access
    const payrollRun = await db.payrollRun.findFirst({
      where: { id, tenantId },
    });

    if (!payrollRun) {
      return NextResponse.json({ error: 'Payroll run not found' }, { status: 404 });
    }

    if (payrollRun.status !== PayrollStatus.PENDING_APPROVAL) {
      return NextResponse.json({
        error: 'Can only approve payroll runs in PENDING_APPROVAL status',
        currentStatus: payrollRun.status,
      }, { status: 400 });
    }

    const updatedRun = await prisma.$transaction(async (tx) => {
      const run = await tx.payrollRun.update({
        where: { id },
        data: {
          status: PayrollStatus.APPROVED,
          approvedById: currentUserId,
          approvedAt: new Date(),
          approverNotes: notes,
        },
      });

      await tx.payrollHistory.create({
        data: {
          payrollRunId: id,
          action: 'APPROVED',
          previousStatus: PayrollStatus.PENDING_APPROVAL,
          newStatus: PayrollStatus.APPROVED,
          notes,
          performedById: currentUserId,
        },
      });

      return run;
    });

    await logAction(
      tenantId,
      currentUserId,
      ActivityActions.PAYROLL_RUN_APPROVED,
      'PayrollRun',
      id,
      { referenceNumber: payrollRun.referenceNumber }
    );

    return NextResponse.json({ success: true, status: updatedRun.status });
}

export const POST = withErrorHandler(approvePayrollHandler, { requireAdmin: true, requireModule: 'payroll' });
