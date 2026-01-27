/**
 * @file route.ts
 * @description Public supplier registration endpoint (tenant-aware via subdomain)
 * @module operations/suppliers
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import { createSupplierSchema } from '@/features/suppliers';
import { logAction, ActivityActions } from '@/lib/core/activity';
import { withErrorHandler } from '@/lib/http/handler';
import { getAdminMembers } from '@/features/notifications/lib/notification-service';
import { sendBulkEmailsWithFailureHandling } from '@/lib/core/email-sender';
import { newSupplierRegistrationEmail } from '@/lib/core/email-templates';

async function registerSupplierHandler(request: NextRequest) {
    // Get tenant from subdomain (set by middleware)
    const subdomain = request.headers.get('x-subdomain');

    if (!subdomain) {
      return NextResponse.json(
        { error: 'Supplier registration requires accessing via organization subdomain' },
        { status: 400 }
      );
    }

    // Look up organization by subdomain slug
    const organization = await prisma.organization.findUnique({
      where: { slug: subdomain.toLowerCase() },
      select: { id: true, name: true, slug: true },
    });

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
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

    // Create supplier with PENDING status, associated with the organization
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
        tenantId: organization.id,
      },
    });

    // Log the registration activity
    await logAction(
      organization.id,
      null, // No user - public registration
      ActivityActions.SUPPLIER_REGISTERED,
      'supplier',
      supplier.id,
      {
        name: supplier.name,
        category: supplier.category,
      }
    );

    // Notify admins about new supplier registration (non-blocking)
    const admins = await getAdminMembers(prisma, organization.id);
    if (admins.length > 0) {
      const emailData = newSupplierRegistrationEmail({
        companyName: supplier.name,
        category: supplier.category || 'General',
        contactName: supplier.primaryContactName,
        contactEmail: supplier.primaryContactEmail,
        country: supplier.country,
        registrationDate: new Date(),
        orgSlug: organization.slug,
        orgName: organization.name,
      });

      // Fire and forget - don't block the response for email delivery
      sendBulkEmailsWithFailureHandling(
        admins.map((admin) => ({
          to: admin.email,
          subject: emailData.subject,
          html: emailData.html,
          text: emailData.text,
          module: 'suppliers' as const,
          action: 'new-registration',
          tenantId: organization.id,
          orgName: organization.name,
          orgSlug: organization.slug,
          recipientName: admin.email,
        }))
      ).catch(() => {
        // Email failures are logged by sendBulkEmailsWithFailureHandling
        // Don't let email errors affect the supplier registration response
      });
    }

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
