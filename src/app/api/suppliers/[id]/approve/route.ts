import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { logAction } from '@/lib/activity';
import { generateUniqueSupplierCode } from '@/lib/supplier-utils';
import { Role } from '@prisma/client';
import { sendEmail } from '@/lib/email';
import { supplierApprovalEmail } from '@/lib/email-templates';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check authentication - only ADMIN can approve
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if supplier exists and is PENDING
    const existingSupplier = await prisma.supplier.findUnique({
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
    const suppCode = await generateUniqueSupplierCode();

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
        const emailContent = supplierApprovalEmail({
          companyName: supplier.name,
          serviceCategory: supplier.category || 'General',
          approvalDate: new Date(),
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

  } catch (error) {
    console.error('Approve supplier error:', error);
    return NextResponse.json(
      { error: 'Failed to approve supplier' },
      { status: 500 }
    );
  }
}
