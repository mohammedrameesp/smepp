/**
 * @file route.ts
 * @description Reject and delete a pending supplier
 * @module operations/suppliers
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { rejectSupplierSchema } from '@/lib/validations/suppliers';
import { logAction } from '@/lib/core/activity';
import { withErrorHandler, APIContext } from '@/lib/http/handler';

async function rejectSupplierHandler(request: NextRequest, context: APIContext) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 403 });
    }

    const id = context.params?.id;
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const tenantId = session.user.organizationId;

    // Parse and validate request body
    const body = await request.json();
    const validation = rejectSupplierSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.error.issues,
        },
        { status: 400 }
      );
    }

    const { rejectionReason } = validation.data;

    // Check if supplier exists within tenant and is PENDING
    const existingSupplier = await prisma.supplier.findFirst({
      where: { id, tenantId },
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
      session.user.id,
      'SUPPLIER_REJECTED',
      'supplier',
      existingSupplier.id,
      {
        suppCode: existingSupplier.suppCode,
        name: existingSupplier.name,
        rejectedBy: session.user.name || session.user.email,
        rejectionReason,
      }
    );

    // Delete supplier instead of marking as rejected
    await prisma.supplier.delete({
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

export const PATCH = withErrorHandler(rejectSupplierHandler, { requireAdmin: true, requireModule: 'suppliers' });
