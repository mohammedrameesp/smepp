/**
 * @file route.ts
 * @description Subscription reactivation endpoint
 * @module operations/subscriptions
 *
 * Features:
 * - Reactivate cancelled subscriptions
 * - Set custom reactivation and renewal dates
 * - Validates status transitions (only CANCELLED → ACTIVE)
 * - Date range validation and logical checks
 * - Audit trail via subscription history
 *
 * Endpoint:
 * - POST /api/subscriptions/[id]/reactivate (admin required)
 *
 * Security:
 * - Admin-only access
 * - Tenant isolation enforced
 * - Comprehensive date validation
 */

import { NextRequest, NextResponse } from 'next/server';
import { reactivateSubscription } from '@/features/subscriptions';
import { withErrorHandler, APIContext } from '@/lib/http/handler';

/**
 * POST /api/subscriptions/[id]/reactivate - Reactivate a cancelled subscription
 *
 * Restores a cancelled subscription to active status with new billing cycle:
 * - Sets status back to ACTIVE
 * - Assigns new renewal date for next billing cycle
 * - Records reactivation date (custom or current date)
 * - Creates subscription history entry
 *
 * Validation Rules:
 * - Subscription must exist and be CANCELLED
 * - Renewal date required and must be between 2000-01-01 and +10 years
 * - Reactivation date must be between 2000-01-01 and +1 year
 * - Reactivation date cannot be after renewal date (logical check)
 *
 * @param id - Subscription ID from URL path
 * @param body.renewalDate - Next renewal date (required)
 * @param body.reactivationDate - Optional reactivation date (defaults to now)
 * @param body.notes - Optional reactivation notes
 *
 * @returns Reactivated subscription object
 * @throws 400 if validation fails
 * @throws 404 if subscription not found
 *
 * @example
 * POST /api/subscriptions/sub_xyz123/reactivate
 * Body: {
 *   renewalDate: "2024-07-01",
 *   reactivationDate: "2024-06-01",
 *   notes: "Service needed again"
 * }
 * // Returns: { id: "sub_xyz123", status: "ACTIVE", renewalDate: Date(...) }
 */
async function reactivateSubscriptionHandler(request: NextRequest, context: APIContext) {
    const { tenant, params } = context;
    const currentUserId = tenant!.userId;
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const { reactivationDate, renewalDate, notes } = body;

    // Validate renewal date is provided
    if (!renewalDate) {
      return NextResponse.json(
        { error: 'Renewal date is required' },
        { status: 400 }
      );
    }

    // Validate and parse renewal date
    const parsedRenewalDate = new Date(renewalDate);
    if (isNaN(parsedRenewalDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid renewal date format' },
        { status: 400 }
      );
    }

    // Check renewal date is not before year 2000
    const minDate = new Date('2000-01-01');
    if (parsedRenewalDate < minDate) {
      return NextResponse.json(
        { error: 'Renewal date cannot be before January 1, 2000' },
        { status: 400 }
      );
    }

    // Check renewal date is not more than 10 years in the future
    const maxRenewalDate = new Date();
    maxRenewalDate.setFullYear(maxRenewalDate.getFullYear() + 10);
    if (parsedRenewalDate > maxRenewalDate) {
      return NextResponse.json(
        { error: 'Renewal date cannot be more than 10 years in the future' },
        { status: 400 }
      );
    }

    // Validate and parse reactivation date if provided
    let parsedReactivationDate: Date | undefined;
    if (reactivationDate) {
      parsedReactivationDate = new Date(reactivationDate);

      // Check if date is valid
      if (isNaN(parsedReactivationDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid reactivation date format' },
          { status: 400 }
        );
      }

      // Check date is not before year 2000
      if (parsedReactivationDate < minDate) {
        return NextResponse.json(
          { error: 'Reactivation date cannot be before January 1, 2000' },
          { status: 400 }
        );
      }

      // Check date is not more than 1 year in the future
      const maxReactivationDate = new Date();
      maxReactivationDate.setFullYear(maxReactivationDate.getFullYear() + 1);
      if (parsedReactivationDate > maxReactivationDate) {
        return NextResponse.json(
          { error: 'Reactivation date cannot be more than 1 year in the future' },
          { status: 400 }
        );
      }

      // Validate reactivation date is not after renewal date
      if (parsedReactivationDate > parsedRenewalDate) {
        return NextResponse.json(
          { error: 'Reactivation date cannot be after renewal date' },
          { status: 400 }
        );
      }
    }

    const subscription = await reactivateSubscription(
      id,
      parsedRenewalDate,
      notes,
      currentUserId,
      parsedReactivationDate
    );

    return NextResponse.json(subscription);
}

export const POST = withErrorHandler(reactivateSubscriptionHandler, { requireAdmin: true, requireModule: 'subscriptions' });
