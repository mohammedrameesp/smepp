/**
 * @file route.ts
 * @description Subscription cancellation endpoint
 * @module operations/subscriptions
 *
 * Features:
 * - Cancel active subscriptions with custom cancellation date
 * - Preserves last active renewal date for historical tracking
 * - Creates audit trail via subscription history
 * - Validates status transitions (only ACTIVE → CANCELLED)
 * - Date range validation to prevent invalid dates
 *
 * Endpoint:
 * - POST /api/subscriptions/[id]/cancel (admin required)
 *
 * Security:
 * - Admin-only access
 * - Tenant isolation enforced
 * - Date validation prevents future/past abuse
 */

import { NextRequest, NextResponse } from 'next/server';
import { cancelSubscription } from '@/features/subscriptions';
import { withErrorHandler, APIContext } from '@/lib/http/handler';

/**
 * POST /api/subscriptions/[id]/cancel - Cancel an active subscription
 *
 * Cancels a subscription while preserving historical data:
 * - Sets status to CANCELLED
 * - Stores last active renewal date for cost calculations
 * - Records cancellation date (custom or current date)
 * - Creates subscription history entry with notes
 *
 * Validation:
 * - Subscription must exist and be ACTIVE
 * - Cancellation date must be between 2000-01-01 and +1 year from now
 * - Cannot be more than 1 year in future
 *
 * @param id - Subscription ID from URL path
 * @param body.cancellationDate - Optional cancellation date (defaults to now)
 * @param body.notes - Optional cancellation reason/notes
 *
 * @returns Cancelled subscription object
 * @throws 400 if validation fails
 * @throws 404 if subscription not found
 *
 * @example
 * POST /api/subscriptions/sub_xyz123/cancel
 * Body: {
 *   cancellationDate: "2024-06-15",
 *   notes: "Service no longer needed"
 * }
 * // Returns: { id: "sub_xyz123", status: "CANCELLED", cancelledAt: Date(...) }
 */
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

/* CODE REVIEW SUMMARY
 * Date: 2026-02-01
 * Reviewer: Claude
 * Status: Reviewed
 * Changes: Added review summary
 * Issues: None identified
 */
