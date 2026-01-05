/**
 * @file route.ts
 * @description Supplier engagements management (list, create)
 * @module operations/suppliers
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { createEngagementSchema } from '@/lib/validations/suppliers';
import { logAction } from '@/lib/core/activity';
import { withErrorHandler, APIContext } from '@/lib/http/handler';

async function getEngagementsHandler(request: NextRequest, context: APIContext) {
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

    // Non-admin users can only view engagements for APPROVED suppliers
    if (session.user.teamMemberRole !== 'ADMIN' && supplier.status !== 'APPROVED') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch engagements
    const engagements = await prisma.supplierEngagement.findMany({
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

    // Non-admin users can only add engagements for APPROVED suppliers
    if (session.user.teamMemberRole !== 'ADMIN' && supplier.status !== 'APPROVED') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse and validate request body
    const body = await request.json();

    // Add createdById from session
    const dataWithCreator = {
      ...body,
      createdById: session.user.id,
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
    const engagement = await prisma.supplierEngagement.create({
      data: {
        supplierId: id,
        date: new Date(data.date),
        notes: data.notes,
        rating: data.rating,
        createdById: data.createdById,
        tenantId: session.user.organizationId!,
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
      session.user.id,
      'SUPPLIER_ENGAGEMENT_ADDED',
      'supplier',
      supplier.id,
      {
        suppCode: supplier.suppCode,
        supplierName: supplier.name,
        engagementId: engagement.id,
        date: engagement.date,
        addedBy: session.user.name || session.user.email,
      }
    );

    return NextResponse.json({
      message: 'Engagement added successfully',
      engagement,
    }, { status: 201 });
}

export const GET = withErrorHandler(getEngagementsHandler, { requireAuth: true, requireModule: 'suppliers' });
export const POST = withErrorHandler(createEngagementHandler, { requireAuth: true, requireModule: 'suppliers' });
