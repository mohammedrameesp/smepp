/**
 * @file route.ts
 * @description Approve a pending supplier
 * @module operations/suppliers
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import { logAction } from '@/lib/core/activity';
import { generateUniqueSupplierCode } from '@/features/suppliers';
import { sendEmail } from '@/lib/core/email';
import { supplierApprovalEmail } from '@/lib/email-templates';
import { withErrorHandler, APIContext } from '@/lib/http/handler';
import { TenantPrismaClient } from '@/lib/core/prisma-tenant';
import logger from '@/lib/core/log';

async function approveSupplierHandler(request: NextRequest, context: APIContext) {
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

    // Check if supplier exists and is PENDING - tenant filtering handled automatically
    const existingSupplier = await db.supplier.findFirst({
      where: { id },
    });

    if (!existingSupplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
    }

    if (existingSupplier.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Only PENDING suppliers can be approved' },
        { status: 400 }
      );
    }

    // Generate unique supplier code
    const suppCode = await generateUniqueSupplierCode(tenantId);

    // Approve supplier and assign supplier code - tenant filtering handled automatically
    const supplier = await db.supplier.update({
      where: { id },
      data: {
        suppCode, // Assign supplier code on approval
        status: 'APPROVED',
        approvedAt: new Date(),
        approvedById: userId,
        rejectionReason: null, // Clear any previous rejection reason
      },
    });

    // Log the approval activity
    await logAction(
      tenantId,
      userId,
      'SUPPLIER_APPROVED',
      'supplier',
      supplier.id,
      {
        suppCode: supplier.suppCode,
        name: supplier.name,
      }
    );

    // Send approval email to supplier (non-blocking)
    if (supplier.primaryContactEmail) {
      try {
        // Get org name for email (Organization is not a tenant model, use raw prisma)
        const org = await prisma.organization.findUnique({
          where: { id: tenantId },
          select: { name: true, primaryColor: true },
        });

        const emailContent = supplierApprovalEmail({
          companyName: supplier.name,
          serviceCategory: supplier.category || 'General',
          approvalDate: new Date(),
          orgName: org?.name || 'Organization',
          primaryColor: org?.primaryColor || undefined,
        });
        await sendEmail({
          to: supplier.primaryContactEmail,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
        });
      } catch (emailError) {
        logger.error({ error: emailError instanceof Error ? emailError.message : 'Unknown error', supplierId: supplier.id }, 'Failed to send supplier approval email');
        // Don't fail the request if email fails
      }
    }

    return NextResponse.json({
      message: 'Supplier approved successfully',
      supplier,
    });
}

export const PATCH = withErrorHandler(approveSupplierHandler, { requireAdmin: true, requireModule: 'suppliers' });
