import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { reactivateSubscription } from '@/lib/subscription-lifecycle';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
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
      session.user.id,
      parsedReactivationDate
    );

    return NextResponse.json(subscription);
  } catch (error) {
    console.error('Error reactivating subscription:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to reactivate subscription' },
      { status: 500 }
    );
  }
}
