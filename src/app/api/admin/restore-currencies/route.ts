import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { DEFAULT_RATES_TO_QAR } from '@/lib/core/currency';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.teamMemberRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all subscriptions
    const subscriptions = await prisma.subscription.findMany({
      select: {
        id: true,
        serviceName: true,
        costPerCycle: true,
        costCurrency: true,
        costQAR: true,
      },
      orderBy: {
        serviceName: 'asc'
      }
    });

    const qarSubs = subscriptions.filter(s => s.costCurrency === 'QAR' || s.costCurrency === null);
    const usdSubs = subscriptions.filter(s => s.costCurrency === 'USD');

    return NextResponse.json({
      total: subscriptions.length,
      qarCount: qarSubs.length,
      usdCount: usdSubs.length,
      subscriptions: subscriptions.map(s => ({
        id: s.id,
        name: s.serviceName,
        cost: s.costPerCycle ? Number(s.costPerCycle) : null,
        currency: s.costCurrency || 'NULL',
        costQAR: s.costQAR ? Number(s.costQAR) : null,
      })),
    });

  } catch (error) {
    console.error('Error checking currencies:', error);
    return NextResponse.json(
      { error: 'Failed to check currencies', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.teamMemberRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all subscriptions
    const subscriptions = await prisma.subscription.findMany({
      select: {
        id: true,
        serviceName: true,
        costPerCycle: true,
        costCurrency: true,
        costQAR: true,
      }
    });

    const updated = [];

    for (const sub of subscriptions) {
      if (!sub.costPerCycle) continue;

      const cost = Number(sub.costPerCycle);
      const costQAR = sub.costQAR ? Number(sub.costQAR) : null;

      let correctCurrency = sub.costCurrency || 'QAR';

      // If costQAR exists and equals costPerCycle, original was USD
      if (costQAR && Math.abs(costQAR - cost) < 0.01) {
        correctCurrency = 'USD';
      }
      // If costQAR exists and is about 3.64x less than cost, original was QAR
      // Using default USD rate for backwards compatibility detection
      else if (costQAR && Math.abs((cost / DEFAULT_RATES_TO_QAR.USD) - costQAR) < 0.5) {
        correctCurrency = 'QAR';
      }

      // Update if currency is wrong
      if (sub.costCurrency !== correctCurrency) {
        await prisma.subscription.update({
          where: { id: sub.id },
          data: { costCurrency: correctCurrency },
        });
        updated.push({
          name: sub.serviceName,
          was: sub.costCurrency || 'NULL',
          now: correctCurrency,
          cost: cost,
          costQAR: costQAR,
        });
      }
    }

    return NextResponse.json({
      success: true,
      fixed: updated.length,
      details: updated,
    });

  } catch (error) {
    console.error('Error fixing currencies:', error);
    return NextResponse.json(
      { error: 'Failed to fix currencies', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
