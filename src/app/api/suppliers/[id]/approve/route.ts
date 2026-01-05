/**
 * @file route.ts
 * @description Approve a pending supplier
 * @module operations/suppliers
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { logAction } from '@/lib/core/activity';
import { generateUniqueSupplierCode } from '@/lib/supplier-utils';
import { sendEmail } from '@/lib/core/email';
import { supplierApprovalEmail } from '@/lib/email-templates';
import { withErrorHandler, APIContext } from '@/lib/http/handler';

async function approveSupplierHandler(request: NextRequest, context: APIContext) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 403 });
    }

    const id = context.params?.id;
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const tenantId = session.user.organizationId;

    // Check if supplier exists within tenant and is PENDING
    const existingSupplier = await prisma.supplier.findFirst({
      where: { id, tenantId },
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

    // Approve supplier and assign supplier code
    const supplier = await prisma.supplier.update({
      where: { id },
      data: {
        suppCode, // Assign supplier code on approval
        status: 'APPROVED',
        approvedAt: new Date(),
        approvedById: session.user.id,
        rejectionReason: null, // Clear any previous rejection reason
      },
    });

    // Log the approval activity
    await logAction(
      tenantId,
      session.user.id,
      'SUPPLIER_APPROVED',
      'supplier',
      supplier.id,
      {
        suppCode: supplier.suppCode,
        name: supplier.name,
        approvedBy: session.user.name || session.user.email,
      }
    );

    // Send approval email to supplier (non-blocking)
    if (supplier.primaryContactEmail) {
      try {
        // Get org name for email
        const org = await prisma.organization.findUnique({
          where: { id: tenantId },
          select: { name: true },
        });

        const emailContent = supplierApprovalEmail({
          companyName: supplier.name,
          serviceCategory: supplier.category || 'General',
          approvalDate: new Date(),
          orgName: org?.name || 'Organization',
        });
        await sendEmail({
          to: supplier.primaryContactEmail,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
        });
      } catch (emailError) {
        console.error('[Email] Failed to send supplier approval email:', emailError);
        // Don't fail the request if email fails
      }
    }

    return NextResponse.json({
      message: 'Supplier approved successfully',
      supplier,
    });
}

export const PATCH = withErrorHandler(approveSupplierHandler, { requireAdmin: true, requireModule: 'suppliers' });
