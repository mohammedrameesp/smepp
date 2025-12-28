import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { rejectSupplierSchema } from '@/lib/validations/suppliers';
import { logAction } from '@/lib/activity';
import { Role } from '@prisma/client';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication - only ADMIN can reject
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Require organization context for tenant isolation
    if (!session.user.organizationId) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 403 });
    }

    const tenantId = session.user.organizationId;
    const { id } = await params;

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

  } catch (error) {
    console.error('Reject supplier error:', error);
    return NextResponse.json(
      { error: 'Failed to reject supplier' },
      { status: 500 }
    );
  }
}
