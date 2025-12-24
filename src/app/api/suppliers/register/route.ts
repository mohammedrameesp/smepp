import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import { createSupplierSchema } from '@/lib/validations/suppliers';
import { checkRateLimit } from '@/lib/security/rateLimit';
import { logAction } from '@/lib/activity';

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting (100 req/15min per IP as specified)
    const { allowed } = checkRateLimit(request);
    if (!allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: 'Too many requests. Please try again later.'
        },
        { status: 429 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = createSupplierSchema.safeParse(body);

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

    // Combine country code with mobile numbers
    const primaryMobile = data.primaryContactMobile
      ? `${data.primaryContactMobileCode || ''} ${data.primaryContactMobile}`.trim()
      : null;

    const secondaryMobile = data.secondaryContactMobile
      ? `${data.secondaryContactMobileCode || ''} ${data.secondaryContactMobile}`.trim()
      : null;

    // Create supplier with PENDING status (suppCode will be assigned on approval)
    // NOTE: This is a public registration route - tenantId should come from the registration context
    // For now, we'll use a default system tenant or handle this differently
    // This route may need special handling as it's for new supplier registration (public)
    const supplier = await prisma.supplier.create({
      data: {
        suppCode: null, // Will be assigned when approved
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
        primaryContactMobile: primaryMobile,
        secondaryContactName: data.secondaryContactName || null,
        secondaryContactTitle: data.secondaryContactTitle || null,
        secondaryContactEmail: data.secondaryContactEmail || null,
        secondaryContactMobile: secondaryMobile,
        paymentTerms: data.paymentTerms || null,
        additionalInfo: data.additionalInfo || null,
        status: 'PENDING',
        tenantId: 'SYSTEM', // Public registration - will be associated with tenant on approval
      },
    });

    // Log the registration activity (no user since it's public)
    await logAction(
      null,
      'SUPPLIER_REGISTERED',
      'supplier',
      supplier.id,
      {
        name: supplier.name,
        category: supplier.category,
      }
    );

    // NOTE: Admin notification is skipped for public registration.
    // Since this is a public route without tenant context, we cannot notify
    // tenant-specific admins. Notifications will be handled during approval
    // when the supplier is associated with a specific tenant.
    console.log(`[Supplier Registration] New supplier registered: ${supplier.name} (pending approval)`)

    return NextResponse.json({
      message: 'Thank you! Your registration is pending approval.',
      supplier: {
        id: supplier.id,
        name: supplier.name,
      },
    }, { status: 201 });

  } catch (error) {
    console.error('Supplier registration error:', error);
    return NextResponse.json(
      { error: 'Failed to register supplier' },
      { status: 500 }
    );
  }
}
