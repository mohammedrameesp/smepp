/**
 * @file route.ts
 * @description Subscription list and creation endpoints
 * @module operations/subscriptions
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import { createSubscriptionSchema, subscriptionQuerySchema } from '@/lib/validations/subscriptions';
import { logAction, ActivityActions } from '@/lib/activity';
import { getQatarNow, getQatarStartOfDay } from '@/lib/qatar-timezone';
import { parseInputDateString } from '@/lib/date-format';
import { USD_TO_QAR_RATE } from '@/lib/constants';
import { buildFilterWithSearch } from '@/lib/db/search-filter';
import { withErrorHandler, APIContext } from '@/lib/http/handler';

async function getSubscriptionsHandler(request: NextRequest, context: APIContext) {
    const { tenant } = context;
    const tenantId = tenant!.tenantId;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());

    const validation = subscriptionQuerySchema.safeParse(queryParams);
    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid query parameters',
        details: validation.error.issues
      }, { status: 400 });
    }

    const { q, projectId, status, category, billingCycle, renewalWindowDays, p, ps, sort, order } = validation.data;

    // Build where clause using reusable search filter
    const filters: Record<string, any> = {};

    if (projectId) filters.projectId = projectId;
    if (status) filters.status = status;
    if (category) filters.category = category;
    if (billingCycle) filters.billingCycle = billingCycle;

    if (renewalWindowDays !== undefined) {
      // Calculate renewal window using Qatar timezone
      const now = getQatarStartOfDay(getQatarNow());
      const targetDate = new Date(now);
      targetDate.setDate(targetDate.getDate() + renewalWindowDays);
      filters.renewalDate = {
        lte: targetDate,
        gte: now,
      };
    }

    // Add tenant filtering to filters
    filters.tenantId = tenantId;

    const where = buildFilterWithSearch({
      searchTerm: q,
      searchFields: ['serviceName', 'accountId', 'vendor', 'category'],
      filters,
    });

    // Calculate pagination
    const skip = (p - 1) * ps;

    // Fetch subscriptions
    const [subscriptions, total] = await Promise.all([
      prisma.subscription.findMany({
        where,
        orderBy: { [sort]: order },
        take: ps,
        skip,
        include: {
          assignedMember: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      prisma.subscription.count({ where }),
    ]);

    return NextResponse.json({
      subscriptions,
      pagination: {
        page: p,
        pageSize: ps,
        total,
        totalPages: Math.ceil(total / ps),
        hasMore: skip + ps < total,
      },
    });
}

async function createSubscriptionHandler(request: NextRequest, context: APIContext) {
    const { tenant } = context;
    const tenantId = tenant!.tenantId;
    const currentUserId = tenant!.userId;

    // Parse and validate request body
    const body = await request.json();
    const validation = createSubscriptionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid request body',
        details: validation.error.issues
      }, { status: 400 });
    }

    const data = validation.data;

    // SAFEGUARD: Always calculate costQAR to prevent data loss
    let costQAR = data.costQAR;

    // Default currency to QAR if not specified
    const currency = data.costCurrency || 'QAR';

    if (data.costPerCycle && !costQAR) {
      // If costQAR is missing, calculate it based on currency
      if (currency === 'QAR') {
        // QAR is base currency, store as-is
        costQAR = data.costPerCycle;
      } else {
        // USD - convert to QAR
        costQAR = data.costPerCycle * USD_TO_QAR_RATE;
      }
    }

    // Convert date strings to Date objects
    const subscriptionData: any = {
      ...data,
      costCurrency: currency, // Use the calculated currency with default
      costQAR: costQAR || null, // Ensure costQAR is always set, use null instead of undefined
      purchaseDate: data.purchaseDate ? parseInputDateString(data.purchaseDate) : null,
      renewalDate: data.renewalDate ? parseInputDateString(data.renewalDate) : null,
    };

    // Remove assignmentDate - it's only used for history tracking, not stored on subscription
    const assignmentDate = data.assignmentDate ? new Date(data.assignmentDate) : null;
    delete subscriptionData.assignmentDate;

    // Create subscription
    const subscription = await prisma.subscription.create({
      data: {
        ...subscriptionData,
        tenantId,
      },
      include: {
        assignedMember: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Log activity
    await logAction(
      tenantId,
      currentUserId,
      ActivityActions.SUBSCRIPTION_CREATED,
      'Subscription',
      subscription.id,
      { serviceName: subscription.serviceName, billingCycle: subscription.billingCycle }
    );

    // Create subscription history entry for creation
    await prisma.subscriptionHistory.create({
      data: {
        subscriptionId: subscription.id,
        action: 'CREATED',
        newStatus: subscription.status,
        performedById: currentUserId,
        assignmentDate: subscription.assignedMemberId ? assignmentDate : null,
        newMemberId: subscription.assignedMemberId,
      },
    });

    return NextResponse.json(subscription, { status: 201 });
}

export const GET = withErrorHandler(getSubscriptionsHandler, { requireAuth: true, requireModule: 'subscriptions' });
export const POST = withErrorHandler(createSubscriptionHandler, { requireAdmin: true, requireModule: 'subscriptions' });