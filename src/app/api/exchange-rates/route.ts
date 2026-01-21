import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { DEFAULT_RATES_TO_QAR, ALL_CURRENCIES } from '@/lib/core/currency';

/**
 * GET /api/exchange-rates
 * Returns all exchange rates to QAR for the current tenant.
 * Uses tenant-specific rates from SystemSettings, falls back to defaults.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user.organizationId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const tenantId = session.user.organizationId;

    // Get all tenant-specific exchange rate settings
    const settings = await prisma.systemSettings.findMany({
      where: {
        tenantId,
        key: { endsWith: '_TO_QAR_RATE' },
      },
      select: { key: true, value: true },
    });

    // Build rates map: start with defaults, override with tenant-specific
    const rates: Record<string, number> = { ...DEFAULT_RATES_TO_QAR };

    for (const setting of settings) {
      // Extract currency code from key (e.g., "USD_TO_QAR_RATE" -> "USD")
      const currency = setting.key.replace('_TO_QAR_RATE', '');
      const rate = parseFloat(setting.value);
      if (!isNaN(rate) && rate > 0) {
        rates[currency] = rate;
      }
    }

    return NextResponse.json({
      rates,
      currencies: ALL_CURRENCIES,
    });
  } catch (error) {
    console.error('Failed to fetch exchange rates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch exchange rates' },
      { status: 500 }
    );
  }
}
