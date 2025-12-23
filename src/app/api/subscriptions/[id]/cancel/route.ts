import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { cancelSubscription } from '@/lib/subscription-lifecycle';

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
      session.user.id
    );

    return NextResponse.json(subscription);
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to cancel subscription' },
      { status: 500 }
    );
  }
}
