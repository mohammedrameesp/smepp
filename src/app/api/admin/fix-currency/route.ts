import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { USD_TO_QAR_RATE } from '@/lib/constants';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { subscriptionId, currency } = await request.json();

    if (!subscriptionId || !currency || !['USD', 'QAR'].includes(currency)) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      select: { costPerCycle: true, costCurrency: true },
    });

    if (!subscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    const cost = subscription.costPerCycle ? Number(subscription.costPerCycle) : 0;
    let costQAR = null;

    if (currency === 'USD') {
      // If setting to USD, the cost is already in USD
      costQAR = cost;
    } else {
      // If setting to QAR, calculate USD equivalent
      costQAR = cost / USD_TO_QAR_RATE;
    }

    await prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        costCurrency: currency,
        costQAR: costQAR,
      },
    });

    return NextResponse.json({ success: true, currency, costQAR });

  } catch (error) {
    console.error('Error fixing currency:', error);
    return NextResponse.json(
      { error: 'Failed to fix currency' },
      { status: 500 }
    );
  }
}
