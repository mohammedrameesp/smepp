/**
 * @file route.ts
 * @description Submit a processed payroll run for approval API
 * @module hr/payroll
 */
import { NextRequest, NextResponse } from 'next/server';
import { PayrollStatus } from '@prisma/client';
import { prisma } from '@/lib/core/prisma';
import { TenantPrismaClient } from '@/lib/core/prisma-tenant';
import { logAction, ActivityActions } from '@/lib/core/activity';
import { submitPayrollSchema } from '@/features/payroll/validations/payroll';
import { withErrorHandler, APIContext } from '@/lib/http/handler';

async function submitPayrollHandler(request: NextRequest, context: APIContext) {
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
    const validation = submitPayrollSchema.safeParse(body);

    const notes = validation.success ? validation.data.notes : undefined;

    // Use findFirst with tenantId to prevent cross-tenant access
    const payrollRun = await db.payrollRun.findFirst({
      where: { id, tenantId },
    });

    if (!payrollRun) {
      return NextResponse.json({ error: 'Payroll run not found' }, { status: 404 });
    }

    if (payrollRun.status !== PayrollStatus.PROCESSED) {
      return NextResponse.json({
        error: 'Can only submit payroll runs in PROCESSED status. Please process the payroll first.',
        currentStatus: payrollRun.status,
      }, { status: 400 });
    }

    const updatedRun = await prisma.$transaction(async (tx) => {
      const run = await tx.payrollRun.update({
        where: { id },
        data: {
          status: PayrollStatus.PENDING_APPROVAL,
          submittedById: currentUserId,
          submittedAt: new Date(),
        },
      });

      await tx.payrollHistory.create({
        data: {
          payrollRunId: id,
          action: 'SUBMITTED',
          previousStatus: PayrollStatus.PROCESSED,
          newStatus: PayrollStatus.PENDING_APPROVAL,
          notes,
          performedById: currentUserId,
        },
      });

      return run;
    });

    await logAction(
      tenantId,
      currentUserId,
      ActivityActions.PAYROLL_RUN_SUBMITTED,
      'PayrollRun',
      id,
      { referenceNumber: payrollRun.referenceNumber }
    );

    return NextResponse.json({ success: true, status: updatedRun.status });
}

export const POST = withErrorHandler(submitPayrollHandler, { requireAdmin: true, requireModule: 'payroll' });
