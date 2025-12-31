/**
 * @file route.ts
 * @description Subscription cancellation endpoint
 * @module operations/subscriptions
 */

import { NextRequest, NextResponse } from 'next/server';
import { cancelSubscription } from '@/lib/subscription-lifecycle';
import { withErrorHandler, APIContext } from '@/lib/http/handler';

async function cancelSubscriptionHandler(request: NextRequest, context: APIContext) {
    const { tenant, params } = context;
    const currentUserId = tenant!.userId;
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const { cancellationDate, notes } = body;

    // Validate and parse cancellation date
    let parsedDate: Date;
    if (cancellationDate) {
      parsedDate = new Date(cancellationDate);

      // Check if date is valid
      if (isNaN(parsedDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid cancellation date format' },
          { status: 400 }
        );
      }

      // Check date is not before year 2000 (reasonable minimum)
      const minDate = new Date('2000-01-01');
      if (parsedDate < minDate) {
        return NextResponse.json(
          { error: 'Cancellation date cannot be before January 1, 2000' },
          { status: 400 }
        );
      }

      // Check date is not more than 1 year in the future
      const maxDate = new Date();
      maxDate.setFullYear(maxDate.getFullYear() + 1);
      if (parsedDate > maxDate) {
        return NextResponse.json(
          { error: 'Cancellation date cannot be more than 1 year in the future' },
          { status: 400 }
        );
      }
    } else {
      parsedDate = new Date();
    }

    const subscription = await cancelSubscription(
      id,
      parsedDate,
      notes,
      currentUserId
    );

    return NextResponse.json(subscription);
}

export const POST = withErrorHandler(cancelSubscriptionHandler, { requireAdmin: true, requireModule: 'subscriptions' });
