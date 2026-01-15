/**
 * @file route.ts
 * @description Get, update and delete individual supplier
 * @module operations/suppliers
 */
import { NextRequest, NextResponse } from 'next/server';
import { updateSupplierSchema } from '@/features/suppliers';
import { logAction } from '@/lib/core/activity';
import { withErrorHandler, APIContext } from '@/lib/http/handler';
import { TenantPrismaClient } from '@/lib/core/prisma-tenant';

async function getSupplierHandler(request: NextRequest, context: APIContext) {
    const { tenant, prisma: tenantPrisma } = context;

    if (!tenant?.tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
    }

    const db = tenantPrisma as TenantPrismaClient;

    const id = context.params?.id;
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    // Use findFirst - tenant filtering handled automatically by tenant-scoped prisma
    const supplier = await db.supplier.findFirst({
      where: { id },
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
    if (!tenant?.isOwner && !tenant?.isAdmin && supplier.status !== 'APPROVED') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ supplier });
}

async function updateSupplierHandler(request: NextRequest, context: APIContext) {
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

    // Check if supplier exists - tenant filtering handled automatically
    const existingSupplier = await db.supplier.findFirst({
      where: { id },
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

    // Update supplier - tenant filtering handled automatically
    const supplier = await db.supplier.update({
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
      userId,
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

    // Check if supplier exists - tenant filtering handled automatically
    const supplier = await db.supplier.findFirst({
      where: { id },
    });

    if (!supplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
    }

    // Delete supplier (cascades to engagements) - tenant filtering handled automatically
    await db.supplier.delete({
      where: { id },
    });

    // Log the deletion activity
    await logAction(
      tenantId,
      userId,
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
