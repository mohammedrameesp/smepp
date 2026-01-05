/**
 * @file route.ts
 * @description Public supplier registration endpoint
 * @module operations/suppliers
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import { createSupplierSchema } from '@/lib/validations/suppliers';
import { logAction } from '@/lib/core/activity';
import { withErrorHandler, APIContext } from '@/lib/http/handler';

async function registerSupplierHandler(request: NextRequest, _context: APIContext) {
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
      'SYSTEM', // Public registration - no tenant context
      null,
      'SUPPLIER_REGISTERED',
      'supplier',
      supplier.id,
      {
        name: supplier.name,
        category: supplier.category,
      }
    );

    return NextResponse.json({
      message: 'Thank you! Your registration is pending approval.',
      supplier: {
        id: supplier.id,
        name: supplier.name,
      },
    }, { status: 201 });
}

// Public route with rate limiting - no auth required
export const POST = withErrorHandler(registerSupplierHandler, { rateLimit: true });
