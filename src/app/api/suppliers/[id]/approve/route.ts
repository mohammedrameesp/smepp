/**
 * @file route.ts
 * @description Approve a pending supplier
 * @module operations/suppliers
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import { logAction } from '@/lib/core/activity';
import { generateUniqueSupplierCode, approveSupplierSchema } from '@/features/suppliers';
import { sendEmail } from '@/lib/core/email';
import { handleEmailFailure } from '@/lib/core/email-failure-handler';
import { supplierApprovalEmail } from '@/lib/core/email-templates';
import { createBulkNotifications, NotificationTemplates } from '@/features/notifications/lib';
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

    // Validate request body (optional - body may be empty for simple approval)
    const body = await request.json().catch(() => ({}));
    const validation = approveSupplierSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid request body',
        details: validation.error.issues,
      }, { status: 400 });
    }

    const { notes } = validation.data;

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

    // Log the approval activity (including notes in metadata)
    await logAction(
      tenantId,
      userId,
      'SUPPLIER_APPROVED',
      'supplier',
      supplier.id,
      {
        suppCode: supplier.suppCode,
        name: supplier.name,
        ...(notes && { approverNotes: notes }),
      }
    );

    // Send approval email to supplier (non-blocking)
    if (supplier.primaryContactEmail) {
      // Get org name for email (Organization is not a tenant model, use raw prisma)
      const org = await prisma.organization.findUnique({
        where: { id: tenantId },
        select: { name: true, slug: true, primaryColor: true },
      });
      const orgName = org?.name || 'Organization';
      const orgSlug = org?.slug || 'app';

      const emailContent = supplierApprovalEmail({
        companyName: supplier.name,
        serviceCategory: supplier.category || 'General',
        approvalDate: new Date(),
        orgName,
        primaryColor: org?.primaryColor || undefined,
      });

      try {
        await sendEmail({
          to: supplier.primaryContactEmail,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
        });
      } catch (emailError) {
        logger.error({ error: emailError instanceof Error ? emailError.message : 'Unknown error', supplierId: supplier.id }, 'Failed to send supplier approval email');

        // Notify admins and super admin about email failure
        await handleEmailFailure({
          module: 'suppliers',
          action: 'approval',
          tenantId,
          organizationName: orgName,
          organizationSlug: orgSlug,
          recipientEmail: supplier.primaryContactEmail,
          recipientName: supplier.primaryContactName || supplier.name,
          emailSubject: emailContent.subject,
          error: emailError instanceof Error ? emailError.message : 'Unknown error',
          metadata: {
            supplierId: supplier.id,
            suppCode: supplier.suppCode,
            supplierName: supplier.name,
          },
        }).catch(() => {}); // Non-blocking
      }
    }

    // Send in-app notifications to all admins about the approval
    try {
      const admins = await db.teamMember.findMany({
        where: { isAdmin: true, isDeleted: false },
        select: { id: true },
      });

      if (admins.length > 0) {
        const notifications = admins
          .filter(admin => admin.id !== userId) // Don't notify the approver
          .map(admin =>
            NotificationTemplates.supplierApproved(
              admin.id,
              supplier.name,
              supplier.suppCode,
              supplier.id
            )
          );

        if (notifications.length > 0) {
          await createBulkNotifications(notifications, tenantId);
        }
      }
    } catch (notifyError) {
      logger.error({
        error: notifyError instanceof Error ? notifyError.message : 'Unknown error',
        supplierId: supplier.id,
      }, 'Failed to send in-app notifications for supplier approval');
    }

    return NextResponse.json({
      success: true,
      message: 'Supplier approved successfully',
      supplier,
      status: 'APPROVED',
    });
}

export const PATCH = withErrorHandler(approveSupplierHandler, { requireAdmin: true, requireModule: 'suppliers' });
