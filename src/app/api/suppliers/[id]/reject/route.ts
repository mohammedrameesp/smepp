/**
 * @file route.ts
 * @description Reject and delete a pending supplier
 * @module operations/suppliers
 */
import { NextRequest, NextResponse } from 'next/server';
import { invalidBodyResponse } from '@/lib/http/responses';
import { rejectSupplierSchema } from '@/features/suppliers';
import { logAction } from '@/lib/core/activity';
import { withErrorHandler, APIContext } from '@/lib/http/handler';
import { TenantPrismaClient } from '@/lib/core/prisma-tenant';

async function rejectSupplierHandler(request: NextRequest, context: APIContext) {
    const { tenant, prisma: tenantPrisma } = context;

    if (!tenant?.tenantId || !tenant?.userId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
    }

    const db = tenantPrisma as TenantPrismaClient;
    const { tenantId, userId } = tenant;

    const id = context.params?.id;
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = rejectSupplierSchema.safeParse(body);

    if (!validation.success) {
      return invalidBodyResponse(validation.error);
    }

    const { rejectionReason } = validation.data;

    // Check if supplier exists and is PENDING - tenant filtering handled automatically
    const existingSupplier = await db.supplier.findFirst({
      where: { id },
    });

    if (!existingSupplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
    }

    if (existingSupplier.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Only PENDING suppliers can be rejected' },
        { status: 400 }
      );
    }

    // Log the rejection activity before deleting
    await logAction(
      tenantId,
      userId,
      'SUPPLIER_REJECTED',
      'supplier',
      existingSupplier.id,
      {
        suppCode: existingSupplier.suppCode,
        name: existingSupplier.name,
        rejectionReason,
      }
    );

    // Delete supplier instead of marking as rejected - tenant filtering handled automatically
    await db.supplier.delete({
      where: { id },
    });

    return NextResponse.json({
      message: 'Supplier rejected and deleted',
      deletedSupplier: {
        id: existingSupplier.id,
        name: existingSupplier.name,
      },
    });
}

export const PATCH = withErrorHandler(rejectSupplierHandler, { requireOperationsAccess: true, requireModule: 'suppliers' });

/* CODE REVIEW SUMMARY
 * Date: 2026-02-01
 * Reviewer: Claude
 * Status: Reviewed
 * Changes: Added review summary
 * Issues: None identified
 */
