import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { convertToQAR } from '@/lib/core/currency';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.teamMemberRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Require organization context for tenant isolation
    if (!session.user.organizationId) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 403 });
    }

    const tenantId = session.user.organizationId;
    const { subscriptionId, currency } = await request.json();

    if (!subscriptionId || !currency) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    const subscription = await prisma.subscription.findFirst({
      where: { id: subscriptionId, tenantId },
      select: { costPerCycle: true, costCurrency: true },
    });

    if (!subscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    const cost = subscription.costPerCycle ? Number(subscription.costPerCycle) : 0;

    // Convert to QAR using multi-currency support
    const costQAR = await convertToQAR(cost, currency, tenantId);

    // SECURITY: Use updateMany with tenantId for defense in depth
    // This prevents IDOR even if findFirst check is bypassed
    const updateResult = await prisma.subscription.updateMany({
      where: { id: subscriptionId, tenantId },
      data: {
        costCurrency: currency,
        costQAR: costQAR,
      },
    });

    if (updateResult.count === 0) {
      return NextResponse.json({ error: 'Subscription not found or access denied' }, { status: 404 });
    }

    return NextResponse.json({ success: true, currency, costQAR });

  } catch (error) {
    console.error('Error fixing currency:', error);
    return NextResponse.json(
      { error: 'Failed to fix currency' },
      { status: 500 }
    );
  }
}
