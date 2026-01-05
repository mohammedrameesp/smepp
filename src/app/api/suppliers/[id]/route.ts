/**
 * @file route.ts
 * @description Get, update and delete individual supplier
 * @module operations/suppliers
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { updateSupplierSchema } from '@/lib/validations/suppliers';
import { logAction } from '@/lib/core/activity';
import { withErrorHandler, APIContext } from '@/lib/http/handler';

async function getSupplierHandler(request: NextRequest, context: APIContext) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 403 });
    }

    const id = context.params?.id;
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const tenantId = session.user.organizationId;

    // Use findFirst with tenantId to prevent IDOR attacks
    const supplier = await prisma.supplier.findFirst({
      where: { id, tenantId },
      include: {
        approvedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        engagements: {
          orderBy: { date: 'desc' },
          include: {
            createdBy: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!supplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
    }

    // Non-admin users can only view APPROVED suppliers
    if (session.user.teamMemberRole !== 'ADMIN' && supplier.status !== 'APPROVED') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ supplier });
}

async function updateSupplierHandler(request: NextRequest, context: APIContext) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 403 });
    }

    const id = context.params?.id;
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const tenantId = session.user.organizationId;

    // Check if supplier exists within tenant
    const existingSupplier = await prisma.supplier.findFirst({
      where: { id, tenantId },
    });

    if (!existingSupplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = updateSupplierSchema.safeParse(body);

    if (!validation.success) {
      const errorMessages = validation.error.issues.map(issue => {
        const field = issue.path.join('.');
        return `${field}: ${issue.message}`;
      }).join('; ');

      return NextResponse.json(
        {
          error: `Validation failed: ${errorMessages}`,
          details: validation.error.issues,
        },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Update supplier
    const supplier = await prisma.supplier.update({
      where: { id },
      data: {
        name: data.name,
        category: data.category,
        address: data.address || null,
        city: data.city || null,
        country: data.country || null,
        website: data.website || null,
        establishmentYear: data.establishmentYear || null,
        primaryContactName: data.primaryContactName || null,
        primaryContactTitle: data.primaryContactTitle || null,
        primaryContactEmail: data.primaryContactEmail || null,
        primaryContactMobile: data.primaryContactMobile || null,
        secondaryContactName: data.secondaryContactName || null,
        secondaryContactTitle: data.secondaryContactTitle || null,
        secondaryContactEmail: data.secondaryContactEmail || null,
        secondaryContactMobile: data.secondaryContactMobile || null,
        paymentTerms: data.paymentTerms || null,
        additionalInfo: data.additionalInfo || null,
      },
    });

    // Log the update activity
    await logAction(
      tenantId,
      session.user.id,
      'SUPPLIER_UPDATED',
      'supplier',
      supplier.id,
      {
        suppCode: supplier.suppCode,
        name: supplier.name,
        changes: data,
      }
    );

    return NextResponse.json({ supplier });
}

async function deleteSupplierHandler(request: NextRequest, context: APIContext) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 403 });
    }

    const id = context.params?.id;
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const tenantId = session.user.organizationId;

    // Check if supplier exists within tenant
    const supplier = await prisma.supplier.findFirst({
      where: { id, tenantId },
    });

    if (!supplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
    }

    // Delete supplier (cascades to engagements)
    await prisma.supplier.delete({
      where: { id },
    });

    // Log the deletion activity
    await logAction(
      tenantId,
      session.user.id,
      'SUPPLIER_DELETED',
      'supplier',
      id,
      {
        suppCode: supplier.suppCode,
        name: supplier.name,
      }
    );

    return NextResponse.json({ message: 'Supplier deleted successfully' });
}

export const GET = withErrorHandler(getSupplierHandler, { requireAuth: true, requireModule: 'suppliers' });
export const PATCH = withErrorHandler(updateSupplierHandler, { requireAdmin: true, requireModule: 'suppliers' });
export const DELETE = withErrorHandler(deleteSupplierHandler, { requireAdmin: true, requireModule: 'suppliers' });
