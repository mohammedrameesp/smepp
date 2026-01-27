/**
 * @file route.ts
 * @description Supplier engagements management (list, create)
 * @module operations/suppliers
 */
import { NextRequest, NextResponse } from 'next/server';
import { createEngagementSchema } from '@/features/suppliers';
import { logAction, ActivityActions } from '@/lib/core/activity';
import { withErrorHandler, APIContext } from '@/lib/http/handler';
import { TenantPrismaClient } from '@/lib/core/prisma-tenant';

async function getEngagementsHandler(request: NextRequest, context: APIContext) {
    const { tenant, prisma: tenantPrisma } = context;

    if (!tenant?.tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
    }

    const db = tenantPrisma as TenantPrismaClient;

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

    // Non-admin users can only view engagements for APPROVED suppliers
    if (!tenant?.isOwner && !tenant?.isAdmin && supplier.status !== 'APPROVED') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch engagements - tenant filtering handled automatically
    const engagements = await db.supplierEngagement.findMany({
      where: { supplierId: id },
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
    });

    return NextResponse.json({ engagements });
}

async function createEngagementHandler(request: NextRequest, context: APIContext) {
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

    // Non-admin users can only add engagements for APPROVED suppliers
    if (!tenant?.isOwner && !tenant?.isAdmin && supplier.status !== 'APPROVED') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse and validate request body
    const body = await request.json();

    // Add createdById from tenant context
    const dataWithCreator = {
      ...body,
      createdById: userId,
    };

    const validation = createEngagementSchema.safeParse(dataWithCreator);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.error.issues,
        },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Create engagement
    // Note: tenantId is included explicitly for type safety, the tenant prisma
    // extension also auto-injects it but TypeScript requires it at compile time
    const engagement = await db.supplierEngagement.create({
      data: {
        tenantId,
        supplierId: id,
        date: new Date(data.date),
        notes: data.notes,
        rating: data.rating,
        createdById: data.createdById,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Log the engagement activity
    await logAction(
      tenantId,
      userId,
      ActivityActions.SUPPLIER_ENGAGEMENT_ADDED,
      'supplier',
      supplier.id,
      {
        suppCode: supplier.suppCode,
        supplierName: supplier.name,
        engagementId: engagement.id,
        date: engagement.date,
      }
    );

    return NextResponse.json({
      message: 'Engagement added successfully',
      engagement,
    }, { status: 201 });
}

export const GET = withErrorHandler(getEngagementsHandler, { requireAuth: true, requireModule: 'suppliers' });
export const POST = withErrorHandler(createEngagementHandler, { requireAuth: true, requireModule: 'suppliers' });
