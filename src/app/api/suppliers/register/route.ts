import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createSupplierSchema } from '@/lib/validations/suppliers';
import { checkRateLimit } from '@/lib/security/rateLimit';
import { logAction } from '@/lib/activity';
import { sendBatchEmails } from '@/lib/email';
import { newSupplierRegistrationEmail } from '@/lib/email-templates';
import { Role } from '@prisma/client';

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

    // Send email notification to all admins
    try {
      const admins = await prisma.user.findMany({
        where: { role: Role.ADMIN },
        select: { email: true, name: true },
      });

      if (admins.length > 0) {
        const emailContent = newSupplierRegistrationEmail({
          companyName: supplier.name,
          category: supplier.category,
          contactName: supplier.primaryContactName,
          contactEmail: supplier.primaryContactEmail,
          country: supplier.country,
          registrationDate: new Date(),
        });

        await sendBatchEmails(
          admins.map((admin) => ({
            to: admin.email,
            subject: emailContent.subject,
            html: emailContent.html,
            text: emailContent.text,
          }))
        );
        console.log(`[Supplier Registration] Notified ${admins.length} admin(s) about new supplier: ${supplier.name}`);
      }
    } catch (emailError) {
      console.error('[Supplier Registration] Failed to send admin notification:', emailError);
      // Don't fail the registration if email fails
    }

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
