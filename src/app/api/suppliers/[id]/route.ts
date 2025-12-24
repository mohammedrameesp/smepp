import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { updateSupplierSchema } from '@/lib/validations/suppliers';
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

    // Require organization context for tenant isolation
    if (!session.user.organizationId) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 403 });
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

    // EMPLOYEE can only view APPROVED suppliers
    if (session.user.role === Role.EMPLOYEE && supplier.status !== 'APPROVED') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ supplier });

  } catch (error) {
    console.error('Get supplier error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch supplier' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check authentication - only ADMIN can update
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

  } catch (error) {
    console.error('Update supplier error:', error);
    return NextResponse.json(
      { error: 'Failed to update supplier' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check authentication - only ADMIN can delete
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

  } catch (error) {
    console.error('Delete supplier error:', error);
    return NextResponse.json(
      { error: 'Failed to delete supplier' },
      { status: 500 }
    );
  }
}
