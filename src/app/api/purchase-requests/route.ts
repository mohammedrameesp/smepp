import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/core/prisma';
import { createPurchaseRequestSchema } from '@/lib/validations/purchase-request';
import { logAction, ActivityActions } from '@/lib/activity';
import { generatePurchaseRequestNumber } from '@/lib/purchase-request-utils';
import { USD_TO_QAR_RATE } from '@/lib/constants';
import { sendEmail } from '@/lib/email';
import { purchaseRequestSubmittedEmail } from '@/lib/email-templates';
import { createBulkNotifications, createNotification, NotificationTemplates } from '@/lib/domains/system/notifications';
import { findApplicablePolicy, initializeApprovalChain } from '@/lib/domains/system/approvals';

// GET - List purchase requests
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Require organization context for tenant isolation
    if (!session.user.organizationId) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 403 });
    }

    const tenantId = session.user.organizationId;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    // Build where clause with tenant filtering
    const where: any = { tenantId };

    // Non-admin users can only see their own requests
    if (session.user.role !== Role.ADMIN) {
      where.requesterId = session.user.id;
    }

    if (status) {
      where.status = status;
    }

    if (priority) {
      where.priority = priority;
    }

    if (search) {
      where.OR = [
        { referenceNumber: { contains: search, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Get total count and requests
    const [total, requests] = await Promise.all([
      prisma.purchaseRequest.count({ where }),
      prisma.purchaseRequest.findMany({
        where,
        include: {
          requester: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          reviewedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          items: true,
          _count: {
            select: {
              items: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return NextResponse.json({
      requests,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Purchase requests GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch purchase requests' },
      { status: 500 }
    );
  }
}

// POST - Create new purchase request
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = createPurchaseRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid request body',
        details: validation.error.issues
      }, { status: 400 });
    }

    const data = validation.data;

    // Generate reference number
    const referenceNumber = await generatePurchaseRequestNumber(prisma);

    // Calculate totals
    let totalAmount = 0;
    let totalAmountQAR = 0;
    let totalOneTime = 0;
    let totalMonthly = 0;
    let totalContractValue = 0;

    // Get form-level currency (use item currency as fallback for backwards compatibility)
    const formCurrency = data.currency || data.items[0]?.currency || 'QAR';
    const isSubscriptionType = data.purchaseType === 'SOFTWARE_SUBSCRIPTION';

    const itemsWithCalculations = data.items.map((item, index) => {
      const billingCycle = item.billingCycle || 'ONE_TIME';
      const durationMonths = item.durationMonths || null;
      const qty = item.quantity || 1;

      // For subscriptions, use amountPerCycle; for others, use unitPrice
      let lineTotal: number;
      let amountPerCycle: number | null = null;
      let unitPriceForDb = item.unitPrice || 0;

      if (isSubscriptionType && item.amountPerCycle && item.amountPerCycle > 0) {
        // Subscription with amountPerCycle provided
        amountPerCycle = item.amountPerCycle;
        lineTotal = amountPerCycle * qty;
        unitPriceForDb = amountPerCycle; // Store amountPerCycle as unitPrice for compatibility
      } else {
        // Non-subscription or legacy handling
        lineTotal = qty * (item.unitPrice || 0);
        if (billingCycle !== 'ONE_TIME') {
          amountPerCycle = lineTotal;
        }
      }

      // Convert to QAR for totals if USD
      const isUSD = item.currency === 'USD' || formCurrency === 'USD';
      const lineTotalQAR = isUSD ? lineTotal * USD_TO_QAR_RATE : lineTotal;
      const unitPriceQAR = isUSD ? unitPriceForDb * USD_TO_QAR_RATE : unitPriceForDb;
      const amountPerCycleQAR = amountPerCycle && isUSD
        ? amountPerCycle * USD_TO_QAR_RATE
        : amountPerCycle;

      // Calculate totals based on billing cycle
      if (billingCycle === 'ONE_TIME') {
        totalOneTime += lineTotalQAR;
        totalAmount += lineTotal;
        totalAmountQAR += lineTotalQAR;
        totalContractValue += lineTotalQAR;
      } else if (billingCycle === 'MONTHLY') {
        totalMonthly += lineTotalQAR;
        const months = durationMonths || 12; // Default to 12 months if not specified
        const contractValue = lineTotalQAR * months;
        totalContractValue += contractValue;
        totalAmount += lineTotal * months;
        totalAmountQAR += contractValue;
      } else if (billingCycle === 'YEARLY') {
        totalMonthly += lineTotalQAR / 12; // Convert to monthly equivalent
        totalContractValue += lineTotalQAR;
        totalAmount += lineTotal;
        totalAmountQAR += lineTotalQAR;
      }

      return {
        itemNumber: index + 1,
        description: item.description,
        quantity: qty,
        unitPrice: unitPriceForDb,
        currency: item.currency || formCurrency,
        unitPriceQAR,
        totalPrice: lineTotal,
        totalPriceQAR: lineTotalQAR,
        billingCycle,
        durationMonths,
        amountPerCycle: amountPerCycleQAR,
        productUrl: item.productUrl || null,
        category: item.category || null,
        supplier: item.supplier || null,
        notes: item.notes || null,
      };
    });

    // Create purchase request with items
    const purchaseRequest = await prisma.purchaseRequest.create({
      data: {
        referenceNumber,
        requesterId: session.user.id,
        title: data.title,
        description: data.description || null,
        justification: data.justification || null,
        priority: data.priority,
        neededByDate: data.neededByDate ? new Date(data.neededByDate) : null,
        // New fields from prototype
        purchaseType: data.purchaseType,
        costType: data.costType,
        projectName: data.projectName || null,
        paymentMode: data.paymentMode,
        // Vendor details
        vendorName: data.vendorName || null,
        vendorContact: data.vendorContact || null,
        vendorEmail: data.vendorEmail || null,
        // Additional notes
        additionalNotes: data.additionalNotes || null,
        // Totals
        totalAmount,
        currency: formCurrency,
        totalAmountQAR,
        totalOneTime: totalOneTime > 0 ? totalOneTime : null,
        totalMonthly: totalMonthly > 0 ? totalMonthly : null,
        totalContractValue: totalContractValue > 0 ? totalContractValue : null,
        tenantId: session.user.organizationId!,
        items: {
          create: itemsWithCalculations.map(item => ({
            ...item,
            tenantId: session.user.organizationId!,
          })),
        },
        history: {
          create: {
            action: 'CREATED',
            newStatus: 'PENDING',
            performedById: session.user.id,
            details: `Request created with ${data.items.length} item(s)`,
          },
        },
      },
      include: {
        requester: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        items: true,
      },
    });

    // Log activity
    await logAction(
      session.user.id,
      ActivityActions.PURCHASE_REQUEST_CREATED,
      'PurchaseRequest',
      purchaseRequest.id,
      {
        referenceNumber,
        title: data.title,
        itemCount: data.items.length,
        totalAmount,
        currency: purchaseRequest.currency,
      }
    );

    // Check for multi-level approval policy
    try {
      const approvalPolicy = await findApplicablePolicy('PURCHASE_REQUEST', { amount: totalAmountQAR, tenantId: session.user.organizationId! });

      if (approvalPolicy && approvalPolicy.levels.length > 0) {
        // Initialize approval chain
        const steps = await initializeApprovalChain('PURCHASE_REQUEST', purchaseRequest.id, approvalPolicy);

        // Notify users with the first level's required role (tenant-scoped)
        const firstStep = steps[0];
        if (firstStep) {
          const approvers = await prisma.user.findMany({
            where: {
              role: firstStep.requiredRole,
              organizationMemberships: { some: { organizationId: session.user.organizationId! } },
            },
            select: { id: true, email: true },
          });

          // Send email to approvers
          if (approvers.length > 0) {
            const emailContent = purchaseRequestSubmittedEmail({
              referenceNumber,
              requesterName: session.user.name || session.user.email,
              title: data.title,
              totalAmount: Number(totalAmount),
              currency: purchaseRequest.currency,
              itemCount: data.items.length,
              priority: data.priority,
            });

            await sendEmail({
              to: approvers.map(a => a.email),
              subject: emailContent.subject,
              html: emailContent.html,
              text: emailContent.text,
            });
          }

          // In-app notifications
          for (const approver of approvers) {
            await createNotification({
              recipientId: approver.id,
              type: 'APPROVAL_PENDING',
              title: 'Purchase Request Approval Required',
              message: `${session.user.name || session.user.email || 'Employee'} submitted a purchase request (${referenceNumber}) for ${purchaseRequest.currency} ${totalAmount.toFixed(2)}. Your approval is required.`,
              link: `/admin/purchase-requests/${purchaseRequest.id}`,
              entityType: 'PurchaseRequest',
              entityId: purchaseRequest.id,
            });
          }
        }
      } else {
        // No policy - fall back to notifying all admins (tenant-scoped)
        const admins = await prisma.user.findMany({
          where: {
            role: Role.ADMIN,
            organizationMemberships: { some: { organizationId: session.user.organizationId! } },
          },
          select: { id: true, email: true },
        });

        if (admins.length > 0) {
          // Email notification
          const emailContent = purchaseRequestSubmittedEmail({
            referenceNumber,
            requesterName: session.user.name || session.user.email,
            title: data.title,
            totalAmount: Number(totalAmount),
            currency: purchaseRequest.currency,
            itemCount: data.items.length,
            priority: data.priority,
          });

          await sendEmail({
            to: admins.map(a => a.email),
            subject: emailContent.subject,
            html: emailContent.html,
            text: emailContent.text,
          });

          // In-app notifications
          const notifications = admins.map(admin =>
            NotificationTemplates.purchaseRequestSubmitted(
              admin.id,
              referenceNumber,
              session.user.name || session.user.email || 'User',
              data.title,
              purchaseRequest.id
            )
          );
          await createBulkNotifications(notifications, session.user.organizationId!);
        }
      }
    } catch (emailError) {
      console.error('Failed to send notification email:', emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json(purchaseRequest, { status: 201 });
  } catch (error) {
    console.error('Purchase request POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create purchase request' },
      { status: 500 }
    );
  }
}
