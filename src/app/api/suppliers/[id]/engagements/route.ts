import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { createEngagementSchema } from '@/lib/validations/suppliers';
import { logAction } from '@/lib/activity';
import { Role } from '@prisma/client';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if supplier exists
    const supplier = await prisma.supplier.findUnique({
      where: { id },
    });

    if (!supplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
    }

    // EMPLOYEE can only view engagements for APPROVED suppliers
    if (session.user.role === Role.EMPLOYEE && supplier.status !== 'APPROVED') {
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

  } catch (error) {
    console.error('Get engagements error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch engagements' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check authentication - ADMIN and EMPLOYEE can add engagements
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if supplier exists
    const supplier = await prisma.supplier.findUnique({
      where: { id },
    });

    if (!supplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
    }

    // EMPLOYEE can only add engagements for APPROVED suppliers
    if (session.user.role === Role.EMPLOYEE && supplier.status !== 'APPROVED') {
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

  } catch (error) {
    console.error('Create engagement error:', error);
    return NextResponse.json(
      { error: 'Failed to create engagement' },
      { status: 500 }
    );
  }
}
